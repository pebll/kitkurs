#!/usr/bin/env python3
"""KITkurs server: static files from web_visu/ plus a small JSON account API.

Usage: python3 server.py [port] [--db PATH]
Python standard library only.
"""
import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(ROOT, 'web_visu')
DEFAULT_DB = os.path.join(ROOT, 'data', 'kitkurs.db')

COOKIE_NAME = 'kitkurs_session'
SESSION_TTL = 30 * 24 * 3600
MAX_BODY_BYTES = 1024 * 1024
USERNAME_RE = re.compile(r'^[A-Za-z0-9_.-]{3,32}$')
PASSWORD_MIN, PASSWORD_MAX = 6, 256
SCRYPT_PARAMS = {'n': 2 ** 14, 'r': 8, 'p': 1}


class UsernameTaken(Exception):
    pass


def hash_password(password, salt):
    return hashlib.scrypt(password.encode('utf-8'), salt=salt, **SCRYPT_PARAMS)


class Storage:
    """SQLite-backed users, sessions and per-user state (thread-safe)."""

    def __init__(self, db_path):
        parent = os.path.dirname(os.path.abspath(db_path))
        os.makedirs(parent, exist_ok=True)
        self.db_path = db_path
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.execute('PRAGMA foreign_keys = ON')
        self._conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash BLOB NOT NULL,
                salt BLOB NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS states (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                data TEXT NOT NULL,
                updated_at REAL NOT NULL
            );
        ''')
        self._conn.commit()

    def close(self):
        with self._lock:
            self._conn.close()

    def create_user(self, username, password):
        salt = secrets.token_bytes(16)
        pw_hash = hash_password(password, salt)
        with self._lock:
            try:
                cur = self._conn.execute(
                    'INSERT INTO users (username, password_hash, salt, created_at) '
                    'VALUES (?, ?, ?, ?)', (username, pw_hash, salt, time.time()))
                self._conn.commit()
            except sqlite3.IntegrityError:
                raise UsernameTaken(username)
            return cur.lastrowid

    def verify_user(self, username, password):
        """Return (user_id, username) for valid credentials, else None."""
        with self._lock:
            row = self._conn.execute(
                'SELECT id, username, password_hash, salt FROM users WHERE username = ?',
                (username,)).fetchone()
        if row is None:
            # Burn comparable time so unknown users are not distinguishable.
            hash_password(password, b'\0' * 16)
            return None
        candidate = hash_password(password, row[3])
        if hmac.compare_digest(candidate, row[2]):
            return row[0], row[1]
        return None

    def create_session(self, user_id):
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._conn.execute('DELETE FROM sessions WHERE expires_at < ?', (time.time(),))
            self._conn.execute('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
                               (token, user_id, time.time() + SESSION_TTL))
            self._conn.commit()
        return token

    def delete_session(self, token):
        with self._lock:
            self._conn.execute('DELETE FROM sessions WHERE token = ?', (token,))
            self._conn.commit()

    def user_for_session(self, token):
        """Return (user_id, username) for a live session token, else None."""
        if not token:
            return None
        with self._lock:
            row = self._conn.execute(
                'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id '
                'WHERE s.token = ? AND s.expires_at > ?', (token, time.time())).fetchone()
        return (row[0], row[1]) if row else None

    def get_state(self, user_id):
        """Return (state_dict_or_None, updated_at_or_None)."""
        with self._lock:
            row = self._conn.execute('SELECT data, updated_at FROM states WHERE user_id = ?',
                                     (user_id,)).fetchone()
        if row is None:
            return None, None
        return json.loads(row[0]), row[1]

    def put_state(self, user_id, state):
        now = time.time()
        with self._lock:
            self._conn.execute(
                'INSERT INTO states (user_id, data, updated_at) VALUES (?, ?, ?) '
                'ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, '
                'updated_at = excluded.updated_at', (user_id, json.dumps(state), now))
            self._conn.commit()
        return now


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


class Handler(SimpleHTTPRequestHandler):
    server_version = 'KITkurs/1.0'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    # -- routing ---------------------------------------------------------
    def do_GET(self):
        if self._is_api():
            self._dispatch('GET')
        else:
            super().do_GET()

    def do_HEAD(self):
        if self._is_api():
            self._send_json(405, {'error': 'Method not allowed'})
        else:
            super().do_HEAD()

    def do_POST(self):
        self._dispatch('POST')

    def do_PUT(self):
        self._dispatch('PUT')

    def _is_api(self):
        return self.path.split('?', 1)[0].startswith('/api/')

    def _dispatch(self, method):
        path = self.path.split('?', 1)[0]
        routes = {
            ('POST', '/api/register'): self._register,
            ('POST', '/api/login'): self._login,
            ('POST', '/api/logout'): self._logout,
            ('GET', '/api/me'): self._me,
            ('GET', '/api/state'): self._get_state,
            ('PUT', '/api/state'): self._put_state,
        }
        handler = routes.get((method, path))
        try:
            if handler is None:
                raise ApiError(404, 'Not found')
            handler()
        except ApiError as err:
            self._send_json(err.status, {'error': err.message})

    # -- helpers ---------------------------------------------------------
    @property
    def storage(self):
        return self.server.storage

    def _read_json(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            raise ApiError(400, 'Invalid Content-Length')
        if length > MAX_BODY_BYTES:
            self.close_connection = True  # body is left unread
            raise ApiError(413, 'Request body too large')
        try:
            body = json.loads(self.rfile.read(length) or b'null')
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, 'Invalid JSON')
        if not isinstance(body, dict):
            raise ApiError(400, 'JSON object expected')
        return body

    def _session_token(self):
        raw = self.headers.get('Cookie')
        if not raw:
            return None
        jar = cookies.SimpleCookie()
        try:
            jar.load(raw)
        except cookies.CookieError:
            return None
        morsel = jar.get(COOKIE_NAME)
        return morsel.value if morsel else None

    def _require_user(self):
        user = self.storage.user_for_session(self._session_token())
        if user is None:
            raise ApiError(401, 'Not logged in')
        return user

    def _send_json(self, status, payload, cookie=None):
        data = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(data)

    @staticmethod
    def _session_cookie(token, max_age=SESSION_TTL):
        return f'{COOKIE_NAME}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}'

    @staticmethod
    def _credentials(body):
        username, password = body.get('username'), body.get('password')
        if not isinstance(username, str) or not isinstance(password, str):
            raise ApiError(400, 'Username and password are required')
        return username, password

    # -- endpoints -------------------------------------------------------
    def _register(self):
        username, password = self._credentials(self._read_json())
        if not USERNAME_RE.match(username):
            raise ApiError(400, 'Username must be 3-32 characters: letters, digits, _ . -')
        if not PASSWORD_MIN <= len(password) <= PASSWORD_MAX:
            raise ApiError(400, f'Password must be {PASSWORD_MIN}-{PASSWORD_MAX} characters')
        try:
            user_id = self.storage.create_user(username, password)
        except UsernameTaken:
            raise ApiError(409, 'Username is already taken')
        token = self.storage.create_session(user_id)
        self._send_json(201, {'username': username}, self._session_cookie(token))

    def _login(self):
        username, password = self._credentials(self._read_json())
        user = None
        if len(password) <= PASSWORD_MAX:
            user = self.storage.verify_user(username, password)
        if user is None:
            raise ApiError(401, 'Invalid username or password')
        token = self.storage.create_session(user[0])
        self._send_json(200, {'username': user[1]}, self._session_cookie(token))

    def _logout(self):
        token = self._session_token()
        if token:
            self.storage.delete_session(token)
        self._send_json(200, {'ok': True}, self._session_cookie('', 0))

    def _me(self):
        _, username = self._require_user()
        self._send_json(200, {'username': username})

    def _get_state(self):
        user_id, _ = self._require_user()
        state, updated_at = self.storage.get_state(user_id)
        self._send_json(200, {'state': state, 'updatedAt': updated_at})

    def _put_state(self):
        user_id, _ = self._require_user()
        body = self._read_json()
        state = body.get('state')
        if not isinstance(state, dict):
            raise ApiError(400, '"state" must be an object')
        updated_at = self.storage.put_state(user_id, state)
        self._send_json(200, {'updatedAt': updated_at})


def create_server(port, db_path=DEFAULT_DB, host='0.0.0.0'):
    httpd = ThreadingHTTPServer((host, port), Handler)
    httpd.daemon_threads = True
    httpd.storage = Storage(db_path)
    return httpd


def main():
    parser = argparse.ArgumentParser(description='KITkurs web server')
    parser.add_argument('port', nargs='?', type=int, default=8000)
    parser.add_argument('--db', default=DEFAULT_DB, help='SQLite database path')
    args = parser.parse_args()
    httpd = create_server(args.port, args.db)
    print(f'Serving on http://0.0.0.0:{httpd.server_address[1]} (db: {args.db})')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        httpd.storage.close()


if __name__ == '__main__':
    main()
