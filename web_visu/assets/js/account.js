// Optional user accounts: syncs all kitkurs_* localStorage keys to the server.
// Guest mode (no login, or API unreachable) leaves localStorage untouched.
(function () {
    'use strict';

    const KEY_PREFIX = 'kitkurs_';
    const BACKUP_KEY = 'kkguest_backup'; // deliberately NOT prefixed with kitkurs_
    const SAVE_DELAY_MS = 800;

    // Keep references to the real storage methods so our own writes never trigger a sync.
    const rawSetItem = Storage.prototype.setItem;
    const rawRemoveItem = Storage.prototype.removeItem;

    const store = {
        keys() {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
            }
            return keys;
        },
        snapshot() {
            const data = {};
            this.keys().forEach(key => { data[key] = localStorage.getItem(key); });
            return data;
        },
        // Replace all kitkurs_* keys with the given snapshot.
        replace(data) {
            this.keys().forEach(key => {
                if (!(key in data)) rawRemoveItem.call(localStorage, key);
            });
            Object.keys(data).forEach(key => {
                if (key.startsWith(KEY_PREFIX) && typeof data[key] === 'string') {
                    rawSetItem.call(localStorage, key, data[key]);
                }
            });
        }
    };

    async function api(method, path, body, extra) {
        const options = Object.assign({
            method,
            credentials: 'same-origin',
            headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        }, extra);
        const response = await fetch(path, options);
        let data = null;
        try { data = await response.json(); } catch (e) { /* non-JSON response */ }
        return { ok: response.ok, status: response.status, data };
    }

    class AccountSync {
        constructor() {
            this.username = null;
            this.timer = null;
            this.pending = false;
            this.statusEl = null;
        }

        // Resolves once local state matches the server (or we know we are a guest).
        async init() {
            try {
                const me = await api('GET', '/api/me');
                if (me.ok && me.data && me.data.username) {
                    this.username = me.data.username;
                    await this.pullState();
                    this.enableAutoSave();
                }
            } catch (e) {
                this.username = null; // API unreachable: behave as a guest
            }
            this.renderWidget();
        }

        async pullState() {
            const res = await api('GET', '/api/state');
            if (!res.ok) throw new Error('state fetch failed');
            if (res.data.state === null) {
                await api('PUT', '/api/state', { state: store.snapshot() });
            } else {
                store.replace(res.data.state);
            }
        }

        enableAutoSave() {
            const self = this;
            Storage.prototype.setItem = function (key, value) {
                rawSetItem.call(this, key, value);
                if (this === window.localStorage) self.noteChange(key);
            };
            Storage.prototype.removeItem = function (key) {
                rawRemoveItem.call(this, key);
                if (this === window.localStorage) self.noteChange(key);
            };
            window.addEventListener('pagehide', () => {
                if (this.pending) this.save(true);
            });
        }

        noteChange(key) {
            if (typeof key !== 'string' || !key.startsWith(KEY_PREFIX)) return;
            this.pending = true;
            this.setStatus('Saving…');
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.save(false), SAVE_DELAY_MS);
        }

        async save(keepalive) {
            clearTimeout(this.timer);
            this.pending = false;
            try {
                const res = await api('PUT', '/api/state', { state: store.snapshot() },
                    keepalive ? { keepalive: true } : undefined);
                if (!res.ok) throw new Error('save failed');
                if (!this.pending) this.setStatus('Saved');
            } catch (e) {
                this.pending = true; // retry on the next change or page hide
                this.setStatus('Save failed');
            }
        }

        async login(username, password, register) {
            const res = await api('POST', register ? '/api/register' : '/api/login',
                { username, password });
            if (!res.ok) {
                throw new Error((res.data && res.data.error) || 'Request failed');
            }
            // Protect guest data: the server state is about to replace it.
            rawSetItem.call(localStorage, BACKUP_KEY, JSON.stringify(store.snapshot()));
            window.location.reload();
        }

        async logout() {
            if (this.pending) await this.save(false);
            try { await api('POST', '/api/logout'); } catch (e) { /* cookie expires anyway */ }
            let backup = {};
            try {
                backup = JSON.parse(localStorage.getItem(BACKUP_KEY)) || {};
            } catch (e) { /* corrupt backup: restore an empty guest state */ }
            store.replace(backup);
            rawRemoveItem.call(localStorage, BACKUP_KEY);
            window.location.reload();
        }

        setStatus(text) {
            if (this.statusEl) this.statusEl.textContent = text;
        }

        // ---- UI ----
        renderWidget() {
            const host = document.querySelector('header.header nav.main-nav')
                || document.querySelector('header.header');
            if (!host) return;
            const widget = document.createElement('div');
            widget.className = 'account-widget';
            if (this.username) {
                const name = document.createElement('span');
                name.className = 'account-name';
                name.textContent = this.username;
                this.statusEl = document.createElement('span');
                this.statusEl.className = 'account-status';
                const out = this.button('Log out', () => this.logout());
                widget.append(name, this.statusEl, out);
            } else {
                widget.append(this.button('Log in', () => this.openModal()));
            }
            host.appendChild(widget);
        }

        button(label, onClick) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'account-btn';
            btn.textContent = label;
            btn.addEventListener('click', onClick);
            return btn;
        }

        openModal() {
            const overlay = document.createElement('div');
            overlay.className = 'account-modal';
            overlay.innerHTML = `
                <form class="account-modal-content" autocomplete="on">
                    <h3>Account</h3>
                    <p class="account-hint">Log in to keep your plan on the server. Without an account, data stays in this browser.</p>
                    <label>Username <input name="username" type="text" autocomplete="username" required minlength="3" maxlength="32"></label>
                    <label>Password <input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="256"></label>
                    <div class="account-error" role="alert"></div>
                    <div class="account-actions">
                        <button type="submit" class="account-btn account-btn-primary" data-action="login">Log in</button>
                        <button type="button" class="account-btn" data-action="register">Create account</button>
                        <button type="button" class="account-btn" data-action="cancel">Cancel</button>
                    </div>
                </form>`;
            const form = overlay.querySelector('form');
            const errorEl = overlay.querySelector('.account-error');
            const close = () => overlay.remove();

            const submit = async (register) => {
                errorEl.textContent = '';
                if (!form.reportValidity()) return;
                const buttons = form.querySelectorAll('button');
                buttons.forEach(b => { b.disabled = true; });
                try {
                    await this.login(form.username.value.trim(), form.password.value, register);
                } catch (e) {
                    errorEl.textContent = e.message;
                    buttons.forEach(b => { b.disabled = false; });
                }
            };

            form.addEventListener('submit', (e) => { e.preventDefault(); submit(false); });
            overlay.querySelector('[data-action="register"]')
                .addEventListener('click', () => submit(true));
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', function onKey(e) {
                if (e.key === 'Escape') {
                    close();
                    document.removeEventListener('keydown', onKey);
                }
            });
            document.body.appendChild(overlay);
            form.username.focus();
        }
    }

    const account = new AccountSync();
    window.accountSync = account;
    window.accountReady = account.init().catch(() => { /* stay a guest */ });
})();
