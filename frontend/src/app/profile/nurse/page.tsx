'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, BadgeCheck, CalendarDays, CheckCircle2, Clock, HeartPulse, MapPin, Phone, Stethoscope, XCircle,
} from 'lucide-react';
import Loader from '@/components/ui/Loader';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { homeFor } from '@/lib/roles';
import { formatDay } from '@/lib/dates';
import { formatVitals, homeCareApi, NurseProfile, NurseVisit, nursesApi, serviceLabel, Vitals } from '@/lib/nurse';
import styles from './nurse.module.css';

const WINDOW: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export default function NurseDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<NurseProfile | null>(null);
  const [open, setOpen] = useState<NurseVisit[]>([]);
  const [mine, setMine] = useState<NurseVisit[]>([]);
  const [tab, setTab] = useState<'open' | 'mine'>('open');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState<NurseVisit | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?redirect=/profile/nurse');
    else if (user.role !== 'nurse') router.replace(homeFor(user.role));
  }, [user, loading, router]);

  const load = useCallback(async () => {
    try {
      const profile = await nursesApi.me();
      setMe(profile);
      if (profile.verificationStatus === 'verified') {
        const [o, m] = await Promise.all([homeCareApi.open(), homeCareApi.mineNurse()]);
        setOpen(o);
        setMine(m);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'nurse') load();
  }, [user, load]);

  const act = async (id: number, fn: (id: number) => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await fn(id);
      await load();
      setTab('mine');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading || !user || user.role !== 'nurse' || !me) return <Loader label="Loading your dashboard…" />;

  const upcoming = mine.filter((v) => v.status === 'accepted');
  const done = mine.filter((v) => v.status === 'completed');

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>Nurse dashboard</p>
            <h1>{me.firstName} {me.lastName}</h1>
            <p className={styles.meta}>
              {me.qualification} · {me.city} · Licence {me.pncNumber}
            </p>
          </div>
          {me.verificationStatus === 'verified' && (
            <span className={styles.verified}><BadgeCheck size={16} /> Verified</span>
          )}
        </header>

        {me.verificationStatus !== 'verified' && (
          <div className={me.verificationStatus === 'rejected' ? styles.bannerBad : styles.banner} role="status">
            {me.verificationStatus === 'pending' ? (
              <>
                <Clock size={18} />
                <span>
                  Your PNC licence <strong>{me.pncNumber}</strong> is being verified. You will see visit requests here as
                  soon as it is approved.
                </span>
              </>
            ) : (
              <>
                <XCircle size={18} />
                <span>Verification was not approved: {me.verificationNote}</span>
              </>
            )}
          </div>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}

        {me.verificationStatus === 'verified' && (
          <>
            <div className={styles.stats}>
              <div><strong>{open.length}</strong><span>Open requests</span></div>
              <div><strong>{upcoming.length}</strong><span>Accepted visits</span></div>
              <div><strong>{done.length}</strong><span>Completed</span></div>
              <div><strong>Rs {me.visitFee.toLocaleString()}</strong><span>Per visit</span></div>
            </div>

            <div className={styles.tabs} role="tablist">
              <button role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? styles.tabOn : ''} onClick={() => setTab('open')}>
                Open requests ({open.length})
              </button>
              <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? styles.tabOn : ''} onClick={() => setTab('mine')}>
                My visits ({mine.length})
              </button>
            </div>

            {tab === 'open' && (
              <div className={styles.list}>
                {open.length === 0 && <p className={styles.empty}>No open requests in {me.city} for your services right now.</p>}
                {open.map((v) => (
                  <article key={v.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <h3>{serviceLabel(v.service)}</h3>
                      {v.directRequest && <span className={styles.tag}>Requested you</span>}
                      {v.orderedBy && <span className={styles.tagDoc}><Stethoscope size={12} /> {v.orderedBy}</span>}
                    </div>
                    <p className={styles.line}><CalendarDays size={14} /> {formatDay(v.visitDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {WINDOW[v.timeWindow]}</p>
                    <p className={styles.line}><MapPin size={14} /> {v.address}</p>
                    <p className={styles.line}>
                      {v.patient?.name}{v.patient?.age ? `, ${v.patient.age} yrs` : ''}{v.preferredGender !== 'any' ? ` · prefers a ${v.preferredGender} nurse` : ''}
                    </p>
                    {v.notes && <p className={styles.notes}>{v.notes}</p>}
                    <div className={styles.actions}>
                      <button className="btn btn-sm" disabled={busyId === v.id} onClick={() => act(v.id, homeCareApi.accept)}>
                        {busyId === v.id ? <span className="spinner" /> : 'Accept visit'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {tab === 'mine' && (
              <div className={styles.list}>
                {mine.length === 0 && <p className={styles.empty}>Visits you accept appear here.</p>}
                {mine.map((v) => (
                  <article key={v.id} className={`${styles.card} ${v.alertLevel === 'emergency' ? styles.cardRed : v.alertLevel === 'soon' ? styles.cardAmber : ''}`}>
                    <div className={styles.cardTop}>
                      <h3>{serviceLabel(v.service)}</h3>
                      <span className={`badge ${v.status === 'completed' ? 'badge-completed' : 'badge-booked'}`}>{v.status}</span>
                    </div>
                    <p className={styles.line}><CalendarDays size={14} /> {formatDay(v.visitDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {WINDOW[v.timeWindow]}</p>
                    <p className={styles.line}><MapPin size={14} /> {v.address}</p>
                    <p className={styles.line}>
                      <strong>{v.patient?.name}</strong>{v.patient?.age ? `, ${v.patient.age} yrs` : ''}
                      {v.patient?.phone && <> · <a href={`tel:${v.patient.phone}`}><Phone size={13} /> {v.patient.phone}</a></>}
                    </p>
                    {!!v.patient?.conditions?.length && <p className={styles.notes}>Known conditions: {v.patient.conditions.join(', ')}</p>}
                    {v.patient?.currentMedication && <p className={styles.notes}>Medicines: {v.patient.currentMedication}</p>}
                    {v.orderedBy && <p className={styles.notes}>Ordered by {v.orderedBy}{v.notes ? `: ${v.notes}` : ''}</p>}
                    {!v.orderedBy && v.notes && <p className={styles.notes}>{v.notes}</p>}

                    {v.status === 'completed' && (
                      <div className={styles.vitals}>
                        <p><HeartPulse size={14} /> {formatVitals(v.vitals).join(' · ')}</p>
                        {v.vitalAlerts.map((a, i) => (
                          <p key={i} className={a.level === 'emergency' ? styles.alertRed : styles.alertAmber}><AlertTriangle size={13} /> {a.message}</p>
                        ))}
                        {v.nurseNotes && <p className={styles.notes}>Your note: {v.nurseNotes}</p>}
                      </div>
                    )}

                    {v.status === 'accepted' && (
                      <div className={styles.actions}>
                        <button className="btn btn-sm" onClick={() => setRecording(v)}>Record visit & vitals</button>
                        <button className="btn btn-sm btn-ghost" disabled={busyId === v.id} onClick={() => act(v.id, homeCareApi.decline)}>
                          Can&apos;t go — release visit
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {recording && (
        <VitalsDialog
          visit={recording}
          onClose={() => setRecording(null)}
          onDone={async () => {
            setRecording(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function VitalsDialog({ visit, onClose, onDone }: { visit: NurseVisit; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NurseVisit | null>(null);
  const num = (k: string) => (v[k] ? Number(v[k]) : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const vitals: Vitals = {
        bpSystolic: num('bpSystolic'), bpDiastolic: num('bpDiastolic'), pulse: num('pulse'),
        temperatureC: num('temperatureC'), spo2: num('spo2'), bloodSugar: num('bloodSugar'), respiratoryRate: num('respiratoryRate'),
      };
      setResult(await homeCareApi.complete(visit.id, vitals, notes));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // A plain function (not a component) so inputs keep focus while typing.
  const field = (k: string, label: string, unit: string, step?: string) => (
    <div className="field" key={k}>
      <label htmlFor={k}>{label} <span className={styles.unit}>{unit}</span></label>
      <input id={k} className="input" type="number" inputMode="decimal" step={step ?? '1'} value={v[k] ?? ''} onChange={(e) => setV((p) => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Record visit" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div className={styles.result}>
            {result.alertLevel ? (
              <div className={result.alertLevel === 'emergency' ? styles.bigRed : styles.bigAmber}>
                <AlertTriangle size={22} />
                <div>
                  <strong>{result.alertLevel === 'emergency' ? 'Dangerous reading — act now' : 'Doctor should review soon'}</strong>
                  {result.vitalAlerts.map((a, i) => <p key={i}>{a.message}</p>)}
                  {result.alertLevel === 'emergency' && <p>Call <a href="tel:1122">1122</a> or take the patient to emergency. The patient and their doctor can see this reading.</p>}
                </div>
              </div>
            ) : (
              <div className={styles.bigGreen}><CheckCircle2 size={22} /> <strong>Visit recorded. All readings in normal range.</strong></div>
            )}
            <button className="btn btn-block" onClick={onDone}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Record visit</h2>
            <p className={styles.meta}>{serviceLabel(visit.service)} · {visit.patient?.name}</p>
            <div className={styles.grid}>
              {field('bpSystolic', 'BP systolic', 'mmHg')}
              {field('bpDiastolic', 'BP diastolic', 'mmHg')}
              {field('pulse', 'Pulse', '/min')}
              {field('temperatureC', 'Temperature', '°C', '0.1')}
              {field('spo2', 'SpO₂', '%')}
              {field('bloodSugar', 'Blood sugar', 'mg/dL')}
              {field('respiratoryRate', 'Breathing rate', '/min')}
            </div>
            <div className="field">
              <label htmlFor="vnotes">Visit note</label>
              <textarea id="vnotes" className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you did, how the patient is, anything the doctor should know" required minLength={5} />
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className={styles.actions}>
              <button className="btn" disabled={busy}>{busy ? <span className="spinner" /> : 'Save & complete visit'}</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
