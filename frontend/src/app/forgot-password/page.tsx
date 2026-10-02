'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, MailCheck } from 'lucide-react';
import { authApi, getErrorMessage } from '@/lib/api';
import styles from '../verify-email/verify.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await authApi.forgotPassword(email);
      setInfo(r.message);
      if (r.devCode) setDevCode(r.devCode);
      setStep('code');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      await authApi.resetPassword(email, code.trim(), password);
      setStep('done');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={`card card-pad ${styles.card}`} style={{ textAlign: 'start', alignItems: 'stretch' }}>
        {step === 'done' ? (
          <div style={{ textAlign: 'center' }}>
            <MailCheck size={44} className={styles.ok} />
            <h1>Password changed</h1>
            <p>You can now sign in with your new password. Taking you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 style={{ display: 'flex', gap: 10, alignItems: 'center' }}><KeyRound size={26} /> Reset your password</h1>
            {step === 'email' ? (
              <form onSubmit={send}>
                <p style={{ marginBottom: 14 }}>Enter the email you signed up with. We will email you a 6-digit code.</p>
                <div className="field">
                  <label htmlFor="fp-email">Email</label>
                  <input id="fp-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                {error && <div className="form-error" role="alert">{error}</div>}
                <button className="btn btn-lg btn-block" disabled={busy}>{busy ? <span className="spinner" /> : 'Send me a code'}</button>
              </form>
            ) : (
              <form onSubmit={reset}>
                <p style={{ marginBottom: 14 }}>{info}</p>
                {devCode && <p className="field-error" style={{ color: 'var(--blue)' }}>Development only (email not set up): your code is {devCode}</p>}
                <div className="field">
                  <label htmlFor="fp-code">6-digit code</label>
                  <input id="fp-code" className="input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoComplete="one-time-code" />
                </div>
                <div className="field">
                  <label htmlFor="fp-pass">New password</label>
                  <input id="fp-pass" type="password" className="input" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                </div>
                {error && <div className="form-error" role="alert">{error}</div>}
                <button className="btn btn-lg btn-block" disabled={busy}>{busy ? <span className="spinner" /> : 'Change password'}</button>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => { setStep('email'); setCode(''); setError(''); }}>Use a different email</button>
              </form>
            )}
            <p style={{ marginTop: 14, textAlign: 'center' }}><Link href="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
