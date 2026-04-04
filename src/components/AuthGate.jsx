import React, { useState } from 'react';

// ブラウザの Cookie に _v2auth=authorized があるか確認
function hasCookie() {
  return document.cookie.split(';').some(c => c.trim().startsWith('_v2auth=authorized'));
}

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(() => hasCookie());
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === 'btai') {
      setAuthed(true);
      // Vercel 本番環境では Cookie をセット（失敗しても無視）
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input }),
      }).catch(() => {});
    } else {
      setError(true);
      setInput('');
    }
  };

  if (authed) return children;

  return (
    <div className="auth-wrap">
      <div className="auth-bg auth-bg--1" />
      <div className="auth-bg auth-bg--2" />
      <div className="auth-inner">
        <div className="auth-logo">
          <span className="auth-logo-main">MATCHUP HIGH</span>
          <span className="auth-logo-v2">V2</span>
        </div>
        <p className="auth-sub">NPB ANALYTICS</p>
        <form className="auth-card" onSubmit={handleSubmit} autoComplete="off">
          <div className="auth-card-title">🔒 ACCESS REQUIRED</div>
          <input
            className={`auth-input${error ? ' auth-input--error' : ''}`}
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            placeholder="パスワードを入力"
            autoFocus
            disabled={false}
          />
          <button className="auth-btn" type="submit" disabled={!input}>
            ENTER
          </button>
          <div className="auth-error">{error ? '✗ パスワードが違います' : ''}</div>
        </form>
      </div>
    </div>
  );
}
