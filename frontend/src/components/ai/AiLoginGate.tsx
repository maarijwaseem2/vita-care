import Link from 'next/link';
import { Bot, LogIn, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import styles from './AiLoginGate.module.css';

/**
 * Shown to signed-out visitors on AI pages. The AI needs an account (fair use
 * and a daily limit per person), but emergency numbers are always available.
 */
export default function AiLoginGate({ redirect, title }: { redirect: string; title: string }) {
  const next = encodeURIComponent(redirect);
  return (
    <div className={styles.wrap}>
      <div className={`card card-pad ${styles.card}`}>
        <div className={styles.icon}>
          <Bot size={30} />
        </div>
        <h1>{title}</h1>
        <p className={styles.lead}>
          Please sign in or create a free account to use the AI Doctor. It keeps your chats and medical history
          together, shares a summary with your doctor when you book, and gives everyone a fair daily allowance.
        </p>
        <div className={styles.btns}>
          <Link href={`/login?redirect=${next}`} className="btn btn-lg">
            <LogIn size={18} /> Sign in
          </Link>
          <Link href="/register/patient" className="btn btn-lg btn-outline">
            <UserPlus size={18} /> Create a free account
          </Link>
        </div>
        <p className={styles.small}>
          <ShieldCheck size={14} /> Your record is private. Only the doctor you book can see your summary.
        </p>
      </div>

      <div className={styles.emergency} role="note">
        <strong>Emergency? Do not wait to sign in.</strong>
        <div className={styles.calls}>
          <a href="tel:1122" className={styles.call}><Phone size={16} /> Rescue 1122</a>
          <a href="tel:115" className={styles.call}><Phone size={16} /> Edhi 115</a>
          <a href="tel:03117786264" className={styles.call}><Phone size={16} /> Umang (mental health) 0311 7786264</a>
        </div>
      </div>
    </div>
  );
}
