'use client';

import { useState } from 'react';
import { MailCheck, Phone, RefreshCw, Send } from 'lucide-react';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import styles from './AiLoginGate.module.css';

/** Shown on AI pages to signed-in users whose email is not confirmed yet. */
export default function VerifyEmailGate() {
  const { user, refreshVerification } = useAuth();
  const [msg, setMsg] = useState('');
  const [devLink, setDevLink] = useState('');
  const [busy, setBusy] = useState<'' | 'send' | 'check'>('');

  const resend = async () => {
    setBusy('send');
    setMsg('');
    try {
      const r = await authApi.resendVerification();
      if (r.alreadyVerified) {
        await refreshVerification();
        return;
      }
      setMsg(r.sent ? `A new link is on its way to ${user?.email}. Check your inbox and spam folder.` : 'We could not send the email right now. Please try again in a few minutes.');
      if (r.devVerificationUrl) setDevLink(r.devVerificationUrl);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const check = async () => {
    setBusy('check');
    setMsg('');
    try {
      const ok = await refreshVerification();
      if (!ok) setMsg('Not confirmed yet. Open the link in the email, then press this button again.');
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={`card card-pad ${styles.card}`}>
        <div className={styles.icon}>
          <MailCheck size={30} />
        </div>
        <h1>Confirm your email to use the AI Doctor</h1>
        <p className={styles.lead}>
          We sent a confirmation link to <strong>{user?.email}</strong> when you signed up. Open it, then come back here.
          The link works for 24 hours. You can ask for a new link once every 24 hours, so please check your spam folder too.
        </p>
        <div className={styles.btns}>
          <button type="button" className="btn btn-lg" onClick={check} disabled={!!busy}>
            {busy === 'check' ? <span className="spinner" /> : <RefreshCw size={18} />} I have confirmed it
          </button>
          <button type="button" className="btn btn-lg btn-outline" onClick={resend} disabled={!!busy}>
            {busy === 'send' ? <span className="spinner" /> : <Send size={18} />} Send the email again
          </button>
        </div>
        {msg && <p className={styles.small} role="status">{msg}</p>}
        {devLink && (
          <p className={styles.small}>
            Development only (email service not set up): <a href={devLink}>open the confirmation link</a>
          </p>
        )}
        <p className={styles.small}>Tip: “Continue with Google” on the sign-in page confirms your email at once.</p>
      </div>

      <div className={styles.emergency} role="note">
        <strong>Emergency? Do not wait.</strong>
        <div className={styles.calls}>
          <a href="tel:1122" className={styles.call}><Phone size={16} /> Rescue 1122</a>
          <a href="tel:115" className={styles.call}><Phone size={16} /> Edhi 115</a>
          <a href="tel:03117786264" className={styles.call}><Phone size={16} /> Umang (mental health) 0311 7786264</a>
        </div>
      </div>
    </div>
  );
}
