import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { homeFor } from '@/lib/roles';
import type { UserRole } from '@/lib/types';
import styles from '../ai/AiLoginGate.module.css';

/** Shown to doctors, nurses (and admins where relevant) on pages meant for patients. */
export default function PatientOnly({ role, what }: { role: UserRole; what: string }) {
  return (
    <div className={styles.wrap}>
      <div className={`card card-pad ${styles.card}`}>
        <div className={styles.icon}><UserRound size={30} /></div>
        <h1>{what} is for patients</h1>
        <p className={styles.lead}>
          You are signed in as a {role}. Your work is in your dashboard. To try this as a patient, sign out and use a patient account.
        </p>
        <div className={styles.btns}>
          <Link href={homeFor(role)} className="btn btn-lg">Go to my dashboard</Link>
          <Link href="/login?logout=1" className="btn btn-lg btn-outline">Sign out</Link>
        </div>
      </div>
    </div>
  );
}
