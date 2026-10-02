'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { homeFor } from '@/lib/roles';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import GoogleButton from '@/components/auth/GoogleButton';
import RoleCards from '@/components/auth/RoleCards';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/api';

function LoginForm() {
  const { login, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect');

  // /login?logout=1 signs out first (used by shared links and automated tests).
  useEffect(() => {
    if (params.get('logout')) logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (redirect) {
        router.push(redirect);
      } else {
        router.push(homeFor(user.role));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="sub">Sign in to manage your appointments and records.</p>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Link href="/forgot-password" className="forgot-link">Forgot password?</Link>
        </div>
        <button id="loginSubmit" type="submit" className="btn btn-block btn-lg" disabled={submitting}>
          {submitting ? <span className="spinner" /> : <><LogIn size={18} /> Sign In</>}
        </button>
      </form>
      <GoogleButton redirect={redirect} />

      <p className="auth-alt">New to Vita Care? Create a free account:</p>
        <RoleCards compact />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={<div className="auth-card"><span className="spinner spinner-dark" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
