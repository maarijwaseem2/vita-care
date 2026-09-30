'use client';

import { homeFor } from '@/lib/roles';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BadgeCheck,
  HeartHandshake,
  ShieldAlert,
  Users,
  Newspaper,
  ScrollText,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/brand/Logo';
import Loader from '@/components/ui/Loader';
import styles from '@/components/admin/admin.module.css';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/doctors', label: 'Doctor verification', icon: BadgeCheck },
  { href: '/admin/nurses', label: 'Nurse verification', icon: HeartHandshake },
  { href: '/admin/safety', label: 'AI safety monitor', icon: ShieldAlert },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    else if (user.role !== 'admin') router.replace(homeFor(user.role));
  }, [user, loading, router, pathname]);

  useEffect(() => setOpen(false), [pathname]);

  if (loading || user?.role !== 'admin') return <Loader label="Checking access…" />;

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="Admin navigation">
        <div className={styles.sideHead}>
          <Link href="/admin" aria-label="Admin dashboard">
            <Logo tone="light" size={32} />
          </Link>
          <button className={styles.iconBtnLight} onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <p className={styles.sideLabel}>Admin portal</p>
        <nav>
          <ul className={styles.nav}>
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={isActive(href) ? styles.navActive : ''} aria-current={isActive(href) ? 'page' : undefined}>
                  <Icon size={18} /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.sideFoot}>
          <Link href="/" target="_blank">
            <ExternalLink size={16} /> Open website
          </Link>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.iconBtn} onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <span className={styles.topTitle}>{NAV.find((n) => isActive(n.href))?.label ?? 'Admin'}</span>
          <span className={styles.topUser}>{user.email}</span>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
