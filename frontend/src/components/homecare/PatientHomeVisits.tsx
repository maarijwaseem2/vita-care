'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, HeartPulse, Home, Phone, Stethoscope } from 'lucide-react';
import { getErrorMessage } from '@/lib/api';
import { formatDay } from '@/lib/dates';
import { formatVitals, homeCareApi, PatientVisit, serviceLabel } from '@/lib/nurse';
import styles from './homecare.module.css';

const STATUS: Record<string, string> = {
  requested: 'Waiting for a nurse',
  accepted: 'Nurse confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** The patient's home-nursing visits, with vitals and red-flag alerts. */
export default function PatientHomeVisits() {
  const [items, setItems] = useState<PatientVisit[] | null>(null);
  const [error, setError] = useState('');

  const load = () => homeCareApi.minePatient().then(setItems).catch((e) => setError(getErrorMessage(e)));
  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: number) => {
    if (!window.confirm('Cancel this home visit?')) return;
    try {
      await homeCareApi.cancel(id);
      load();
    } catch (e) {
      window.alert(getErrorMessage(e));
    }
  };

  const emergency = items?.find((v) => v.alertLevel === 'emergency' && v.status === 'completed');

  return (
    <section className={styles.box} aria-labelledby="hv-title">
      <div className={styles.head}>
        <h2 id="hv-title"><Home size={18} /> Home nursing visits</h2>
        <Link href="/home-care" className="btn btn-sm">Request a nurse</Link>
      </div>
      {error && <div className="form-error">{error}</div>}
      {emergency && (
        <div className={styles.red} role="alert">
          <AlertTriangle size={18} />
          <span>
            A reading at your last home visit was in the danger range ({emergency.vitalAlerts?.map((a) => a.message).join('; ')}).
            If you feel unwell now, call <a href="tel:1122">1122</a>. Your doctor can see this reading.
          </span>
        </div>
      )}
      {items && items.length === 0 && (
        <p className={styles.empty}>No home visits yet. A verified nurse can come for injections, dressings, BP and sugar checks.</p>
      )}
      <div className={styles.list}>
        {items?.map((v) => (
          <article key={v.id} className={`${styles.item} ${v.alertLevel === 'emergency' ? styles.itemRed : v.alertLevel === 'soon' ? styles.itemAmber : ''}`}>
            <div className={styles.top}>
              <strong>{serviceLabel(v.service)}</strong>
              <span className={`${styles.status} ${styles[`s_${v.status}`]}`}>{STATUS[v.status]}</span>
            </div>
            <p className={styles.meta}>
              {formatDay(v.visitDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {v.timeWindow} · {v.reference}
            </p>
            {v.orderedByDoctor && <p className={styles.meta}><Stethoscope size={13} /> Ordered by {v.orderedByDoctor.name}</p>}
            {v.nurse ? (
              <p className={styles.meta}>
                Nurse {v.nurse.firstName} {v.nurse.lastName} ({v.nurse.qualification})
                {v.nurse.phone && <> · <a href={`tel:${v.nurse.phone}`}><Phone size={12} /> {v.nurse.phone}</a></>}
              </p>
            ) : v.status === 'requested' ? (
              <p className={styles.meta}>Verified nurses in {v.city} can see your request.</p>
            ) : null}
            {v.status === 'completed' && (
              <div className={styles.vitals}>
                <p><HeartPulse size={13} /> {formatVitals(v.vitals).join(' · ') || 'No vitals recorded'}</p>
                {v.vitalAlerts?.map((a, i) => (
                  <p key={i} className={a.level === 'emergency' ? styles.alertRed : styles.alertAmber}><AlertTriangle size={12} /> {a.message}</p>
                ))}
                {v.nurseNotes && <p className={styles.note}>Nurse&apos;s note: {v.nurseNotes}</p>}
              </div>
            )}
            {(v.status === 'requested' || v.status === 'accepted') && (
              <button className="btn btn-ghost btn-sm" onClick={() => cancel(v.id)}>Cancel visit</button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
