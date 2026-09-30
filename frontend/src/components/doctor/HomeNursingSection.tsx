'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle, HeartPulse, Home } from 'lucide-react';
import { getErrorMessage } from '@/lib/api';
import { formatDay } from '@/lib/dates';
import { DoctorHomeVisit, formatVitals, homeCareApi, SERVICES, ServiceId, serviceLabel } from '@/lib/nurse';
import styles from './VisitPanel.module.css';

function karachiDate(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + offset * 86_400_000));
}

/** Doctor's view of home-nursing visits for this patient, plus ordering a new one. */
export default function HomeNursingSection({
  appointmentId,
  visits,
  hasAccount,
}: {
  appointmentId: number;
  visits: DoctorHomeVisit[];
  hasAccount: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<ServiceId>('injection');
  const [date, setDate] = useState(karachiDate(1));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await homeCareApi.order({ appointmentId, service, visitDate: date, notes: notes || undefined });
      setMsg({ ok: true, text: 'Home visit ordered. Verified nurses near the patient can now accept it; their vitals will appear here.' });
      setOpen(false);
      setNotes('');
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.block}>
      <h3><Home size={16} /> Home nursing</h3>
      {visits.length === 0 && <p className={styles.muted}>No home visits recorded yet.</p>}
      <ul className={styles.visits}>
        {visits.map((v) => (
          <li key={v.id}>
            <strong>{formatDay(v.visitDate, { day: 'numeric', month: 'short' })}</strong> {serviceLabel(v.service)} · {v.status}
            {v.nurse && <span>Nurse {v.nurse}</span>}
            {v.vitals && <p><HeartPulse size={12} /> {formatVitals(v.vitals).join(' · ')}</p>}
            {v.vitalAlerts.map((a, i) => (
              <p key={i} style={{ color: a.level === 'emergency' ? '#a42020' : '#8a5a00', fontWeight: 600 }}>
                <AlertTriangle size={12} /> {a.message}
              </p>
            ))}
            {v.nurseNotes && <p>{v.nurseNotes}</p>}
          </li>
        ))}
      </ul>

      {msg && <p className={msg.ok ? styles.muted : 'form-error'} role="status">{msg.text}</p>}

      {hasAccount ? (
        open ? (
          <form onSubmit={submit} style={{ marginTop: 10 }}>
            <div className="field">
              <label htmlFor="hn-service">Service</label>
              <select id="hn-service" className="select" value={service} onChange={(e) => setService(e.target.value as ServiceId)}>
                {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hn-date">First visit</label>
              <input id="hn-date" type="date" className="input" min={karachiDate(0)} max={karachiDate(30)} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="hn-notes">Instructions for the nurse</label>
              <textarea id="hn-notes" className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Inj. Ceftriaxone 1 g IV once daily × 5 days; check BP at each visit" />
            </div>
            <div className={styles.actions}>
              <button className="btn btn-sm" disabled={busy}>{busy ? <span className="spinner" /> : 'Order home visit'}</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className="btn btn-sm btn-outline" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
            Order home nursing
          </button>
        )
      ) : (
        <p className={styles.muted}>Guest booking: the patient needs an account for home visits.</p>
      )}
    </section>
  );
}
