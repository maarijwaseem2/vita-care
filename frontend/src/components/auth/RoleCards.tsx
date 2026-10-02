import Link from 'next/link';
import { ArrowRight, HeartPulse, Stethoscope, UserRound } from 'lucide-react';
import styles from './RoleCards.module.css';

const ROLES = [
  {
    href: '/register/patient',
    icon: UserRound,
    title: 'I am a patient',
    text: 'Talk to the AI Doctor, book verified doctors, get home nursing and understand your reports.',
    cta: 'Sign up as a patient',
    tone: styles.patient,
  },
  {
    href: '/register/doctor',
    icon: Stethoscope,
    title: 'I am a doctor or physiotherapist',
    text: 'Get patients who arrive with an AI summary and history. PMDC (or AHPC) licence checked.',
    cta: 'Join as a doctor',
    tone: styles.doctor,
  },
  {
    href: '/register/nurse',
    icon: HeartPulse,
    title: 'I am a nurse',
    text: 'Take home visits and 12-hour shifts in your city. PNC licence checked, vitals go to the doctor.',
    cta: 'Join as a nurse',
    tone: styles.nurse,
  },
];

/** Three role choices as big, animated buttons (used on /register and the sign-in page). */
export default function RoleCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.grid} ${compact ? styles.compact : ''}`}>
      {ROLES.map((r) => (
        <Link key={r.href} href={r.href} className={`${styles.card} ${r.tone}`}>
          <span className={styles.icon}><r.icon size={compact ? 20 : 28} /></span>
          <strong>{compact ? r.cta : r.title}</strong>
          {!compact && <span className={styles.text}>{r.text}</span>}
          {!compact && (
            <span className={styles.cta}>
              {r.cta} <ArrowRight size={16} className={styles.arrow} />
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
