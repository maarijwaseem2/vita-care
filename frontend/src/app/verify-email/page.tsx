'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/ui/Loader';
import styles from './verify.module.css';

function VerifyEmail() {
  const params = useSearchParams();
  const { user, refreshVerification } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // run once (React strict mode calls effects twice in dev)
    ran.current = true;
    const token = params.get('token') ?? '';
    authApi
      .verifyEmail(token)
      .then(async (r) => {
        setEmail(r.email);
        setState('done');
        if (user) await refreshVerification().catch(() => undefined);
      })
      .catch((err) => {
        setMessage(getErrorMessage(err));
        setState('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'working') return <Loader label="Confirming your email…" />;

  return (
    <div className={styles.wrap}>
      <div className={`card card-pad ${styles.card}`}>
        {state === 'done' ? (
          <>
            <CheckCircle2 size={44} className={styles.ok} />
            <h1>Email confirmed</h1>
            <p>{email} is confirmed. You can now use the AI Doctor.</p>
            {user ? (
              <Link href="/ai-doctor" className="btn btn-lg">Open the AI Doctor</Link>
            ) : (
              <Link href="/login?redirect=/ai-doctor" className="btn btn-lg">Sign in</Link>
            )}
          </>
        ) : (
          <>
            <MailWarning size={44} className={styles.bad} />
            <h1>We could not confirm your email</h1>
            <p>{message}</p>
            {user ? (
              <Link href="/ai-doctor" className="btn btn-lg">Send a new link</Link>
            ) : (
              <Link href="/login?redirect=/ai-doctor" className="btn btn-lg">Sign in to get a new link</Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader label="Loading…" />}>
      <VerifyEmail />
    </Suspense>
  );
}
