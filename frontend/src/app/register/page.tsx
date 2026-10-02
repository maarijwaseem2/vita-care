import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import RoleCards from '@/components/auth/RoleCards';
import styles from './chooser.module.css';

export const metadata = { title: 'Create your account | Vita Care' };

export default function RegisterChooser() {
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>Create your Vita Care account</h1>
        <p>Choose how you will use Vita Care. It takes about a minute.</p>
      </div>
      <RoleCards />
      <p className={styles.foot}>
        Already have an account? <Link href="/login">Sign in <ArrowRight size={14} /></Link>
      </p>
    </div>
  );
}
