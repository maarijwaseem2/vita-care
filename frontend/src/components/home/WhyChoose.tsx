import { CalendarCheck, FileHeart, MessageSquareHeart, Search } from 'lucide-react';
import styles from './home.module.css';

const FEATURES = [
  {
    icon: <Search size={22} />,
    title: 'Find the right doctor, fast',
    text: 'Search by city, specialty or name and compare verified profiles, fees and OPD timings.',
  },
  {
    icon: <CalendarCheck size={22} />,
    title: 'Book online in seconds',
    text: 'Pick an available slot and get an instant, downloadable appointment receipt — no waiting.',
  },
  {
    icon: <FileHeart size={22} />,
    title: 'Your records, always with you',
    text: 'We securely store your medical history so you never have to carry physical documents again.',
  },
  {
    icon: <MessageSquareHeart size={22} />,
    title: 'AI Doctor for early guidance',
    text: 'Describe your symptoms and get a preliminary assessment plus a referral to a real specialist.',
  },
];

export default function WhyChoose() {
  return (
    <section className={`section ${styles.why}`} id="about">
      <div className="container">
        <div className={styles.whyGrid}>
          <div className={styles.whyArt}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/about/about-us.png" alt="Doctors at Vita Care" />
          </div>
          <div>
            <span className="eyebrow">Why Vita Care</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: 'var(--navy)', marginBottom: 14 }}>
              A healthcare system built around you
            </h2>
            <p className="text-muted mb-2">
              Everything you need to manage your health in one platform —
              accessible, reliable and designed to reduce wait times.
            </p>
            <div className={styles.featureList}>
              {FEATURES.map((f) => (
                <div className={styles.feature} key={f.title}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
