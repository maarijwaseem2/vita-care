import Link from 'next/link';
import { HeartPulse, CalendarCheck, ShieldCheck } from 'lucide-react';
import styles from './home.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <HeartPulse size={15} /> Your health, our priority
          </span>
          <h1 className={styles.heroTitle}>
            We&apos;re determined for your <em>better life.</em>
          </h1>
          <p className={styles.heroText}>
            Get the care you need — online or in person. Search trusted
            specialists, book appointments in seconds, and keep your medical
            history in one secure place.
          </p>
          <div className={styles.heroBtns}>
            <Link href="/doctors" className="btn btn-lg">
              Make an Appointment
            </Link>
            <Link href="/ai-doctor" className="btn btn-lg btn-outline">
              Ask the AI Doctor
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div>
              <strong>50+</strong>
              <span>Verified doctors</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Specialties</span>
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
            <CalendarCheck size={20} /> Appointment booked
          </div>
          <div className={`${styles.floatCard} ${styles.floatBottom}`}>
            <ShieldCheck size={20} /> Records kept safe
          </div>
        </div>
      </div>
    </section>
  );
}
