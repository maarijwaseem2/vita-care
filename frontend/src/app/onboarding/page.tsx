'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, Stethoscope, UserRound } from 'lucide-react';
import { googleSignup, type GoogleSignup } from '@/lib/googleSignup';
import StepHeader from '@/components/auth/StepHeader';
import styles from '@/components/auth/RoleCards.module.css';

/** Step 1 after "Continue with Google" for a new person: who are you? Step 2 is the role's form. */
export default function OnboardingPage() {
  const [g, setG] = useState<GoogleSignup | null | undefined>(undefined);
  useEffect(() => setG(googleSignup.get()), []);

  if (g === undefined) return null;
  if (!g) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Sign-up expired</h1>
          <p className="sub">Please press “Continue with Google” again.</p>
          <Link href="/login" className="btn btn-lg">Back to sign in</Link>
        </div>
      </div>
    );
  }

  const roles = [
    { href: '/register/patient?google=1', icon: UserRound, title: 'I am a patient', text: 'AI Doctor, booking, home nursing and report help.', tone: styles.patient },
    { href: '/register/doctor?google=1', icon: Stethoscope, title: 'I am a doctor or physiotherapist', text: 'Your PMDC (or AHPC) number is checked before patients see you.', tone: styles.doctor },
    { href: '/register/nurse?google=1', icon: HeartPulse, title: 'I am a nurse', text: 'Your PNC number is checked before you can take visits.', tone: styles.nurse },
  ];
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '44px 20px 72px' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h1 style={{ color: 'var(--navy)', fontSize: 'clamp(1.6rem, 3.4vw, 2.2rem)' }}>Welcome to Vita Care</h1>
        <p style={{ color: 'var(--body)', marginTop: 6 }}>Signed in with Google as <strong>{g.email}</strong>. How will you use Vita Care?</p>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto 20px' }}>
        <StepHeader step={1} labels={['Choose your role', 'Your details']} />
      </div>
      <div className={styles.grid}>
        {roles.map((r) => (
          <Link key={r.href} href={r.href} className={`${styles.card} ${r.tone}`}>
            <span className={styles.icon}><r.icon size={28} /></span>
            <strong>{r.title}</strong>
            <span className={styles.text}>{r.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
