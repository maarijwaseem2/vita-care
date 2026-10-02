'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { CONTACT } from '@/lib/contact';
import Logo from '@/components/brand/Logo';
import styles from './Footer.module.css';

const DEPARTMENTS = ['Heart Care', 'Neurology', 'Pediatrics', 'Gynecology', 'Dermatology', 'ENT'];
const QUICK = [
  { href: '/doctors', label: 'Find a Doctor' },
  { href: '/ai-doctor', label: 'AI Doctor' },
  { href: '/blog', label: 'Health Blog' },
  { href: '/register/doctor', label: 'Join as a Doctor' },
  { href: '/register/nurse', label: 'Join as a Nurse' },
  { href: '/home-care', label: 'Home Nursing' },
  { href: '/contact', label: 'Contact us' },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <div className={styles.brand}>
              <Logo tone="light" size={36} />
            </div>
            <p className={styles.tagline}>
              Tell us how you feel in Urdu, Roman Urdu or English. Vita Care asks the
              right questions, spots emergencies, and hands your story to a
              verified doctor.
            </p>
          </div>

          <div className={styles.col}>
            <h4>Departments</h4>
            <ul>
              {DEPARTMENTS.map((d) => (
                <li key={d}>
                  <Link href={`/doctors?specialty=${encodeURIComponent(d)}`}>{d}</Link>
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
                <a href={`tel:${CONTACT.phoneTel}`}><Phone size={16} /> {CONTACT.phoneDisplay}</a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`}><Mail size={16} /> {CONTACT.email}</a>
              </li>
              <li>
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> WhatsApp us</a>
              </li>
              <li>
                <MapPin size={16} /> Karachi, Pakistan
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© {year} Vita Care. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
