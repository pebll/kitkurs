"""Integration tests for the account/state API in server.py."""
import http.client
import json
import os
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import server  # noqa: E402


class Client:
    """Tiny HTTP client that keeps a session cookie."""

    def __init__(self, port):
        self.port = port
        self.cookie = None

    def request(self, method, path, body=None, raw=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        headers = {}
        data = raw
        if body is not None:
            data = json.dumps(body).encode()
        if data is not None:
            headers['Content-Type'] = 'application/json'
        if self.cookie:
            headers['Cookie'] = self.cookie
        try:
            conn.request(method, path, body=data, headers=headers)
        except (BrokenPipeError, ConnectionResetError):
            pass  # server may reject an oversized body before reading it all
        resp = conn.getresponse()
        payload = resp.read()
        set_cookie = resp.getheader('Set-Cookie')
        if set_cookie:
            pair = set_cookie.split(';', 1)[0]
            name, _, value = pair.partition('=')
            self.cookie = pair if value else None
        conn.close()
        try:
            parsed = json.loads(payload) if payload else None
        except ValueError:
            parsed = None
        return resp.status, parsed, resp, payload


class ServerTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.httpd = server.create_server(0, os.path.join(cls.tmp.name, 'sub', 't.db'))
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.tmp.cleanup()

    def client(self):
        return Client(self.port)


class AuthTests(ServerTestCase):
    def test_register_then_me(self):
        c = self.client()
        status, body, resp, _ = c.request('POST', '/api/register',
                                          {'username': 'alice', 'password': 'secret1'})
        self.assertEqual(status, 201)
        self.assertEqual(body['username'], 'alice')
        cookie = resp.getheader('Set-Cookie')
        self.assertIn('kitkurs_session=', cookie)
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Lax', cookie)
        status, body, _, _ = c.request('GET', '/api/me')
        self.assertEqual((status, body['username']), (200, 'alice'))

    def test_duplicate_username_case_insensitive(self):
        self.client().request('POST', '/api/register', {'username': 'Bob', 'password': 'secret1'})
        status, _, _, _ = self.client().request(
            'POST', '/api/register', {'username': 'bOB', 'password': 'secret2'})
        self.assertEqual(status, 409)

    def test_invalid_input(self):
        cases = [
            {'username': 'ab', 'password': 'secret1'},
            {'username': 'a' * 33, 'password': 'secret1'},
            {'username': 'bad name', 'password': 'secret1'},
            {'username': 'okname', 'password': '12345'},
            {'username': 'okname', 'password': 'x' * 300},
            {'username': 123, 'password': 'secret1'},
            {'username': 'okname'},
        ]
        for case in cases:
            status, _, _, _ = self.client().request('POST', '/api/register', case)
            self.assertEqual(status, 400, case)
        status, _, _, _ = self.client().request('POST', '/api/register', raw=b'not json')
        self.assertEqual(status, 400)

    def test_login_success_and_failure(self):
        self.client().request('POST', '/api/register', {'username': 'carol', 'password': 'secret1'})
        c = self.client()
        status, _, _, _ = c.request('POST', '/api/login', {'username': 'CAROL', 'password': 'secret1'})
        self.assertEqual(status, 200)
        self.assertEqual(c.request('GET', '/api/me')[0], 200)
        s1, b1, _, _ = self.client().request('POST', '/api/login',
                                              {'username': 'carol', 'password': 'wrong-pw'})
        s2, b2, _, _ = self.client().request('POST', '/api/login',
                                              {'username': 'nobody', 'password': 'wrong-pw'})
        self.assertEqual((s1, s2), (401, 401))
        self.assertEqual(b1, b2)

    def test_me_unauthenticated(self):
        self.assertEqual(self.client().request('GET', '/api/me')[0], 401)

    def test_logout_invalidates_session(self):
        c = self.client()
        c.request('POST', '/api/register', {'username': 'dave', 'password': 'secret1'})
        old_cookie = c.cookie
        self.assertEqual(c.request('POST', '/api/logout')[0], 200)
        stale = self.client()
        stale.cookie = old_cookie
        self.assertEqual(stale.request('GET', '/api/me')[0], 401)


class StateTests(ServerTestCase):
    def logged_in(self, name):
        c = self.client()
        c.request('POST', '/api/register', {'username': name, 'password': 'secret1'})
        return c

    def test_state_roundtrip(self):
        c = self.logged_in('erin')
        status, body, _, _ = c.request('GET', '/api/state')
        self.assertEqual(status, 200)
        self.assertIsNone(body['state'])
        state = {'kitkurs_favorites': '["a"]', 'kitkurs_semester_count': '4'}
        self.assertEqual(c.request('PUT', '/api/state', {'state': state})[0], 200)
        status, body, _, _ = c.request('GET', '/api/state')
        self.assertEqual(body['state'], state)
        self.assertIsNotNone(body['updatedAt'])

    def test_state_isolated_per_user(self):
        a = self.logged_in('frank')
        b = self.logged_in('grace')
        a.request('PUT', '/api/state', {'state': {'k': 'v'}})
        self.assertIsNone(b.request('GET', '/api/state')[1]['state'])

    def test_unauthenticated_state(self):
        c = self.client()
        self.assertEqual(c.request('GET', '/api/state')[0], 401)
        self.assertEqual(c.request('PUT', '/api/state', {'state': {}})[0], 401)

    def test_non_object_state_rejected(self):
        c = self.logged_in('heidi')
        for bad in ([], 'str', 5, None):
            self.assertEqual(c.request('PUT', '/api/state', {'state': bad})[0], 400, bad)
        self.assertEqual(c.request('PUT', '/api/state', raw=b'[1]')[0], 400)

    def test_oversized_body_rejected(self):
        c = self.logged_in('ivan')
        big = {'state': {'k': 'x' * (server.MAX_BODY_BYTES + 10)}}
        self.assertEqual(c.request('PUT', '/api/state', big)[0], 413)


class StaticTests(ServerTestCase):
    def test_static_index(self):
        status, _, _, payload = self.client().request('GET', '/index.html')
        self.assertEqual(status, 200)
        self.assertIn(b'<html', payload)

    def test_unknown_api_route(self):
        self.assertEqual(self.client().request('GET', '/api/nope')[0], 404)


if __name__ == '__main__':
    unittest.main()
