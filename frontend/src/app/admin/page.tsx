'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminStats } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import Loader from '@/components/ui/Loader';
import styles from '@/components/admin/admin.module.css';

const LANG: Record<string, string> = { en: 'English', ur: 'Urdu script', 'roman-ur': 'Roman Urdu' };

export default function AdminDashboard() {
  const [s, setS] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.stats().then(setS).catch((e) => setError(getErrorMessage(e)));
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!s) return <Loader label="Loading dashboard…" />;

  const max = Math.max(1, ...s.daily.map((d) => Math.max(d.consultations, d.bookings)));
  const specMax = Math.max(1, ...s.bySpecialty.map((x) => x.count));
  const langTotal = s.byLanguage.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Dashboard</h1>
          <p>How patients are using Vita Care, and what needs your attention today.</p>
        </div>
      </div>

      <div className={styles.stats}>
        <Link href="/admin/doctors" className={`${styles.stat} ${s.doctorsPending ? styles.statAlert : ''}`}>
          <span>Doctors waiting for verification</span>
          <strong>{s.doctorsPending}</strong>
          <small>{s.doctorsVerified} verified and listed</small>
        </Link>
        <Link href="/admin/nurses" className={`${styles.stat} ${s.nursesPending ? styles.statAlert : ''}`}>
          <span>Nurses waiting for verification</span>
          <strong>{s.nursesPending ?? 0}</strong>
          <small>{s.nursesVerified ?? 0} verified · {s.homeVisits ?? 0} home visits ({s.homeVisitEmergencies ?? 0} with danger readings)</small>
        </Link>
        <Link href="/admin/safety" className={`${styles.stat} ${s.emergenciesUnreviewed ? styles.statAlert : ''}`}>
          <span>Emergency chats not yet reviewed</span>
          <strong>{s.emergenciesUnreviewed}</strong>
          <small>{s.emergencies} emergencies flagged in total</small>
        </Link>
        <div className={styles.stat}>
          <span>AI consultations</span>
          <strong>{s.consultations}</strong>
          <small>{s.offlineConsultations} ran in offline mode</small>
        </div>
        <div className={styles.stat}>
          <span>Appointments</span>
          <strong>{s.appointments}</strong>
          <small>
            {s.upcomingAppointments} upcoming · {s.bookingsWithAiSummary} with an AI summary
          </small>
        </div>
      </div>

      <div className={styles.dashGrid}>
        <section className={`${styles.panel} ${styles.panelPad}`}>
          <h2 className={styles.panelTitle}>Last 14 days</h2>
          <div className={styles.chart} role="img" aria-label="Daily consultations and bookings for the last 14 days">
            {s.daily.map((d) => (
              <div key={d.day} className={styles.chartCol} title={`${d.day}: ${d.consultations} consultations, ${d.bookings} bookings`}>
                <div className={styles.chartBars}>
                  <div className={styles.barA} style={{ height: `${(d.consultations / max) * 100}%` }} />
                  <div className={styles.barB} style={{ height: `${(d.bookings / max) * 100}%` }} />
                </div>
                <span className={styles.chartLabel}>{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span><i style={{ background: 'var(--navy)' }} />AI consultations</span>
            <span><i style={{ background: 'var(--saffron)' }} />Bookings</span>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.panelPad}`}>
          <h2 className={styles.panelTitle}>Languages patients use</h2>
          {s.byLanguage.length === 0 && <p className={styles.cellSub}>No consultations yet.</p>}
          {s.byLanguage.map((l) => (
            <div key={l.language} className={styles.hbar}>
              <span>{LANG[l.language] ?? l.language}</span>
              <div className={styles.hbarTrack}>
                <div className={styles.hbarFill} style={{ width: `${(l.count / langTotal) * 100}%` }} />
              </div>
              <span className={styles.mono}>{Math.round((l.count / langTotal) * 100)}%</span>
            </div>
          ))}
          <h2 className={styles.panelTitle} style={{ marginTop: 22 }}>Departments recommended</h2>
          {s.bySpecialty.slice(0, 6).map((x) => (
            <div key={x.specialty} className={styles.hbar}>
              <span>{x.specialty}</span>
              <div className={styles.hbarTrack}>
                <div className={styles.hbarFill} style={{ width: `${(x.count / specMax) * 100}%`, background: 'var(--saffron)' }} />
              </div>
              <span className={styles.mono}>{x.count}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
