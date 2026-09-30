import Link from 'next/link';
import { HeartPulse, CalendarCheck, ShieldCheck } from 'lucide-react';
import styles from './home.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <HeartPulse size={15} /> English · اردو · Roman Urdu
          </span>
          <h1 className={styles.heroTitle}>
            Know which doctor to see, before you leave home.
          </h1>
          <p className={styles.heroText}>
            Tell the AI Doctor what&apos;s wrong in your own language. It asks the
            right questions, flags emergencies, and books you with a real
            specialist who sees your history before you arrive.
          </p>
          <div className={styles.heroBtns}>
            <Link href="/ai-doctor" className="btn btn-lg">
              Ask the AI Doctor
            </Link>
            <Link href="/doctors" className="btn btn-lg btn-outline">
              Find a doctor
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div>
              <strong>9</strong>
              <span>Departments</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Languages, with voice</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>AI guidance</span>
            </div>
          </div>
        </div>

        <div className={styles.heroArt}>
          <div className={styles.blob} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero/hero.png" alt="Healthcare illustration" />
          <div className={`${styles.floatCard} ${styles.floatTop}`}>
            <CalendarCheck size={20} /> Summary shared with doctor
          </div>
          <div className={`${styles.floatCard} ${styles.floatBottom}`}>
            <ShieldCheck size={20} /> Emergency check on every message
          </div>
        </div>
      </div>
    </section>
  );
}
