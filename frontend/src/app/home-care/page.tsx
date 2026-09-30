'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck, CalendarDays, CheckCircle2, HeartPulse, MapPin, ShieldAlert, Star, Stethoscope, UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage, patientsApi } from '@/lib/api';
import { homeCareApi, nursesApi, PublicNurse, SERVICES, ServiceId, serviceLabel, WINDOWS } from '@/lib/nurse';
import styles from './home-care.module.css';

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Hyderabad', 'Sialkot', 'Abbottabad', 'Gujranwala'];

function karachiDate(offset = 0) {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export default function HomeCarePage() {
  const { user, loading } = useAuth();
  const [service, setService] = useState<ServiceId>('vitals');
  const [form, setForm] = useState({ visitDate: karachiDate(1), timeWindow: 'morning', address: '', city: 'Karachi', preferredGender: 'any', notes: '' });
  const [nurses, setNurses] = useState<PublicNurse[]>([]);
  const [nurseId, setNurseId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isPatient = user?.role === 'patient';

  // Prefill the address from the patient's profile.
  useEffect(() => {
    if (!isPatient) return;
    patientsApi.me().then((p) => setForm((f) => ({ ...f, address: p.address || f.address, city: p.city || f.city }))).catch(() => undefined);
  }, [isPatient]);

  useEffect(() => {
    nursesApi
      .list({ city: form.city, service, gender: form.preferredGender === 'any' ? undefined : form.preferredGender })
      .then((n) => {
        setNurses(n);
        setNurseId((id) => (id && n.some((x) => x.id === id) ? id : null));
      })
      .catch(() => setNurses([]));
  }, [form.city, form.preferredGender, service]);

  const minDate = useMemo(() => karachiDate(0), []);
  const maxDate = useMemo(() => karachiDate(30), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await homeCareApi.create({
        service, visitDate: form.visitDate, timeWindow: form.timeWindow, address: form.address, city: form.city,
        preferredGender: form.preferredGender, notes: form.notes || undefined, nurseId: nurseId ?? undefined,
      });
      setDone({ reference: r.reference });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <span className={styles.eyebrow}><HeartPulse size={16} /> Home nursing</span>
          <h1>A verified nurse at your door, connected to your doctor</h1>
          <p>
            Injections, wound dressing, BP and sugar checks, elderly and post-surgery care. Every nurse&apos;s licence is checked,
            and the vitals they record go into your Vita Care record, so your doctor sees them too.
          </p>
          <ul className={styles.trust}>
            <li><BadgeCheck size={18} /> PNC licence verified</li>
            <li><Stethoscope size={18} /> Vitals shared with your doctor</li>
            <li><ShieldAlert size={18} /> Instant alert on dangerous readings</li>
            <li><UserRound size={18} /> Female nurse on request</li>
          </ul>
        </div>
      </section>

      <div className={`container ${styles.body}`}>
        {done ? (
          <div className={`card card-pad ${styles.success}`} role="status">
            <CheckCircle2 size={36} />
            <h2>Request sent</h2>
            <p>
              Reference <strong>{done.reference}</strong>. {nurseId ? 'Your chosen nurse' : 'Verified nurses near you'} will see it now.
              You&apos;ll see the nurse&apos;s name and phone in your dashboard as soon as one accepts.
            </p>
            <div className={styles.row}>
              <Link href="/profile/patient" className="btn">Go to my dashboard</Link>
              <button className="btn btn-outline" onClick={() => { setDone(null); setNurseId(null); }}>Request another visit</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className={styles.layout}>
            <div className={styles.main}>
              <div className="card card-pad">
                <h2 className={styles.h2}>1. What do you need?</h2>
                <div className={styles.services} role="radiogroup" aria-label="Service">
                  {SERVICES.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      role="radio"
                      aria-checked={service === s.id}
                      className={`${styles.service} ${service === s.id ? styles.serviceOn : ''}`}
                      onClick={() => setService(s.id)}
                    >
                      <strong>{s.label}</strong>
                      <span lang="ur">{s.urdu}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                <h2 className={styles.h2}>2. When and where?</h2>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="date"><CalendarDays size={14} /> Date</label>
                    <input id="date" type="date" className="input" min={minDate} max={maxDate} value={form.visitDate} onChange={(e) => set('visitDate', e.target.value)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="win">Time</label>
                    <select id="win" className="select" value={form.timeWindow} onChange={(e) => set('timeWindow', e.target.value)}>
                      {WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="city"><MapPin size={14} /> City</label>
                    <select id="city" className="select" value={form.city} onChange={(e) => set('city', e.target.value)}>
                      {CITIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="gender">Nurse preference</label>
                    <select id="gender" className="select" value={form.preferredGender} onChange={(e) => set('preferredGender', e.target.value)}>
                      <option value="any">No preference</option>
                      <option value="female">Female nurse</option>
                      <option value="male">Male nurse</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="address">Full address</label>
                  <textarea id="address" className="textarea" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="House, street, block, area" required />
                  <span className={styles.hint}>Only the nurse who accepts your visit sees the full address.</span>
                </div>
                <div className="field">
                  <label htmlFor="notes">Anything the nurse should know? <span className={styles.hint}>(optional)</span></label>
                  <textarea id="notes" className="textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Doctor prescribed Inj. Ceftriaxone 1g once daily for 5 days" />
                </div>
              </div>
            </div>

            <aside className={styles.side}>
              <div className="card card-pad">
                <h2 className={styles.h2}>3. Choose a nurse <span className={styles.hint}>(optional)</span></h2>
                <p className={styles.hint}>
                  {nurses.length
                    ? `${nurses.length} verified ${nurses.length === 1 ? 'nurse offers' : 'nurses offer'} ${serviceLabel(service).toLowerCase()} in ${form.city}. Leave it open and the first available nurse will accept.`
                    : `No verified nurse offers this in ${form.city} yet. You can still send the request.`}
                </p>
                <div className={styles.nurses}>
                  <label className={`${styles.nurse} ${nurseId === null ? styles.nurseOn : ''}`}>
                    <input type="radio" name="nurse" checked={nurseId === null} onChange={() => setNurseId(null)} />
                    <span><strong>Any available nurse</strong><small>Fastest</small></span>
                  </label>
                  {nurses.slice(0, 6).map((n) => (
                    <label key={n.id} className={`${styles.nurse} ${nurseId === n.id ? styles.nurseOn : ''}`}>
                      <input type="radio" name="nurse" checked={nurseId === n.id} onChange={() => setNurseId(n.id)} />
                      <span>
                        <strong>{n.firstName} {n.lastName}</strong>
                        <small>{n.qualification} · {n.experienceYears ?? 0} yrs · Rs {n.visitFee.toLocaleString()}</small>
                        <small className={styles.rating}><Star size={12} /> {n.rating.toFixed(1)} · {n.gender === 'female' ? 'Female' : 'Male'}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                {error && <div className="form-error" role="alert">{error}</div>}
                {loading ? null : isPatient ? (
                  <button className="btn btn-lg btn-block" disabled={busy}>
                    {busy ? <span className="spinner" /> : 'Request home visit'}
                  </button>
                ) : user ? (
                  <p className={styles.hint}>Home visits are booked from a patient account.</p>
                ) : (
                  <>
                    <p className={styles.hint}>Sign in as a patient so the nurse and your doctor can see your record.</p>
                    <Link href="/login?redirect=/home-care" className="btn btn-lg btn-block">Sign in to request</Link>
                    <Link href="/register/patient" className="btn btn-ghost btn-block">Create a free account</Link>
                  </>
                )}
                <p className={styles.small}>
                  In an emergency do not wait for a nurse. Call <a href="tel:1122">1122</a>.
                </p>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
