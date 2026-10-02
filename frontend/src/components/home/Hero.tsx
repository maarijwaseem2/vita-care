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
            Feeling unwell? <span className={styles.heroGrad}>Meet the right doctor</span>, right near you.
          </h1>
          <p className={styles.heroText}>
            Tell our AI Doctor what&apos;s wrong — in Urdu, Roman Urdu or English, by typing or speaking.
            In minutes you get <strong>safe first advice</strong>, an <strong>instant emergency check</strong>, and a{' '}
            <strong>verified specialist near your area</strong> who sees your story before you arrive.
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
              <strong>11</strong>
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
          <img src="/images/hero/hero-doctor.jpg" alt="A Vita Care doctor with a stethoscope" />
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
