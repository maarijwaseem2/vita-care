import Link from 'next/link';
import { Stethoscope, Mail, Phone, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

const DEPARTMENTS = ['Neurology', 'Heart Care', 'Osteoporosis', 'ENT'];
const QUICK = [
  { href: '/doctors', label: 'Find a Doctor' },
  { href: '/ai-doctor', label: 'AI Doctor' },
  { href: '/blog', label: 'Health Blog' },
  { href: '/register/doctor', label: 'Join as a Doctor' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <div className={styles.brand}>
              <span className={styles.mark}>
                <Stethoscope size={22} />
              </span>
              <span className={styles.name}>
                Vita<span>Care</span>
              </span>
            </div>
            <p className={styles.tagline}>
              Better healthcare, made accessible. Find trusted doctors, book
              appointments online, and keep your medical records in one place.
            </p>
          </div>

          <div className={styles.col}>
            <h4>Departments</h4>
            <ul>
              {DEPARTMENTS.map((d) => (
                <li key={d}>
                  <Link href="/doctors">{d}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h4>Quick Links</h4>
            <ul>
              {QUICK.map((q) => (
                <li key={q.href}>
                  <Link href={q.href}>{q.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h4>Get in touch</h4>
            <ul className={styles.contact}>
              <li>
                <Mail size={16} /> support@vitacare.example
              </li>
              <li>
                <Phone size={16} /> +92 300 000 0000
              </li>
              <li>
                <MapPin size={16} /> Karachi, Pakistan
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© {year} Vita Care. Built as a final year project.</p>
          <p className={styles.disclaimer}>
            AI guidance is preliminary and not a substitute for professional
            medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
