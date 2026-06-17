import { FormEvent, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../lib/auth';
import type { GuildRole } from '../types/guild';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<GuildRole>('member');
  const [error, setError] = useState('');

  if (profile) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'login') await loginWithEmail(email, password);
      else await registerWithEmail(email, password, fullName, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Guild Receptionist & Management Portal</p>
        <h1>{mode === 'login' ? 'Sign in to Guild OS' : 'Create Guild profile'}</h1>
        <p className="muted">Email and Google login are active. Phone login is reserved in the architecture for a future provider.</p>
        <form onSubmit={submit} className="stack">
          {mode === 'register' && <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} />
          {mode === 'register' && (
            <select value={role} onChange={(e) => setRole(e.target.value as GuildRole)}>
              <option value="member">Member</option>
              <option value="contributor">Contributor</option>
              <option value="receptionist">Receptionist</option>
            </select>
          )}
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
          <button className="secondary" type="button" onClick={loginWithGoogle}>Continue with Google</button>
        </form>
        <button className="link-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
        </button>
        <Link to="/phone-login-roadmap" className="tiny-link">Phone login support: planned</Link>
      </section>
    </main>
  );
}
