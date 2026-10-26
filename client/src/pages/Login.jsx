import { useState } from 'react';
import * as authApi from '../api/auth.js';
import { setToken } from '../api/client.js';

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { token, user } = await authApi.login(username.trim(), password.trim());
      setToken(token);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #14141F 0%, #2A1F5C 100%)' }}
    >
      <form
        onSubmit={submit}
        className="bg-white w-full rounded-2xl shadow-2xl"
        style={{ maxWidth: 400, padding: 32 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex items-center justify-center font-grotesk font-bold text-white text-sm"
            style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6C4CF1 0%, #9B7CFB 100%)' }}
          >
            IR
          </div>
          <div>
            <h1 className="font-grotesk font-bold m-0" style={{ fontSize: 20, color: '#1a1a2e' }}>IAM Ops</h1>
            <p className="m-0 text-sm text-gray-400">Sign in to Roster &amp; Allowances</p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="login-user">Username</label>
          <input
            id="login-user"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-pass">Password</label>
          <input
            id="login-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error-text" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #6C4CF1, #9B7CFB)', border: 'none' }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
