'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, UserCircle, LogOut, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/doctors', label: 'Find a Doctor' },
  { href: '/ai-doctor', label: 'AI Doctor' },
  { href: '/blog', label: 'Blog' },
];

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Solidify the bar once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const profileHref =
    user?.role === 'doctor' ? '/profile/doctor' : '/profile/patient';

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Vita Care home">
          <span className={styles.brandMark}>
            <Stethoscope size={22} />
          </span>
          <span className={styles.brandText}>
            Vita<span>Care</span>
          </span>
        </Link>

        <nav className={`${styles.nav} ${open ? styles.navOpen : ''}`}>
          <ul className={styles.links}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? styles.active : ''}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            {!loading && user ? (
              <div className={styles.userBox}>
                <Link href={profileHref} className={styles.userLink}>
                  <UserCircle size={20} />
                  <span>{user.name || 'My account'}</span>
                </Link>
                <button
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link href="/register/patient" className="btn btn-sm">
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          className={styles.toggle}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}
