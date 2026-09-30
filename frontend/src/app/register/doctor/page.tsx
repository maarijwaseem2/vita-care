'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi, getErrorMessage } from '@/lib/api';
import { SPECIALTIES } from '@/lib/types';
import styles from './register.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LANGS = ['Urdu', 'English', 'Punjabi', 'Sindhi', 'Pashto', 'Saraiki', 'Balochi', 'Hindko'];
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Hyderabad', 'Sialkot', 'Gujranwala', 'Abbottabad'];

/** 07:00 AM … 11:00 PM in 30-minute steps. */
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
});

/** Pick days → "Mon – Fri" when consecutive, else "Mon, Wed, Fri". */
function describeDays(days: string[]): string {
  const idx = days.map((d) => DAYS.indexOf(d)).sort((a, b) => a - b);
  if (idx.length >= 3 && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)) {
    return `${DAYS[idx[0]]} – ${DAYS[idx[idx.length - 1]]}`;
  }
  return idx.map((i) => DAYS[i]).join(', ');
}

const PMDC_RE = /^\d{3,7}-?[A-Za-z]{1,2}$/;

export default function RegisterDoctorPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', gender: '',
    specialty: '', pmdcNumber: '', experienceYears: '', qualifications: '', bio: '',
    clinicName: '', city: '', address: '', fees: '', from: '05:00 PM', to: '09:00 PM',
  });
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [languages, setLanguages] = useState<string[]>(['Urdu', 'English']);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (list: string[], v: string, setter: (x: string[]) => void) =>
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const pmdcOk = PMDC_RE.test(f.pmdcNumber.trim());
  const timeOk = TIMES.indexOf(f.to) > TIMES.indexOf(f.from);
  const schedule = useMemo(() => describeDays(days), [days]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pmdcOk) return setError('Enter your PMDC registration number, e.g. 12345-P.');
    if (!days.length) return setError('Choose at least one OPD day.');
    if (!timeOk) return setError('OPD end time must be after the start time.');
    if (!agree) return setError('Please confirm the declaration.');
    setSubmitting(true);
    try {
      const auth = await authApi.registerDoctor({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        password: f.password,
        phone: f.phone || undefined,
        gender: f.gender || undefined,
        specialty: f.specialty,
        pmdcNumber: f.pmdcNumber.trim().toUpperCase(),
        experienceYears: f.experienceYears ? Number(f.experienceYears) : undefined,
        qualifications: f.qualifications.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        bio: f.bio || undefined,
        clinicName: f.clinicName || undefined,
        city: f.city || undefined,
        address: f.address || undefined,
        fees: f.fees ? Number(f.fees) : undefined,
        opdSchedule: schedule,
        availableTime: `${f.from} – ${f.to}`,
        languages,
      });
      setSession(auth);
      router.push('/profile/doctor');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.head}>
          <h1>Join Vita Care as a doctor</h1>
          <p>
            Patients arrive with an AI summary of their symptoms and history. Your profile goes live after our
            team checks your PMDC registration, usually within one working day.
          </p>
        </header>

        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <fieldset className={styles.section}>
            <legend>1. Account</legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" className="input" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} required autoComplete="given-name" />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" className="input" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} required autoComplete="family-name" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" className="input" minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} required autoComplete="new-password" />
                <span className={styles.hint}>At least 6 characters.</span>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="phone">Mobile number</label>
                <input id="phone" className="input" inputMode="tel" placeholder="+92 3xx xxxxxxx" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" className="select" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>2. Professional details</legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="specialty">Department</label>
                <select id="specialty" className="select" value={f.specialty} onChange={(e) => set('specialty', e.target.value)} required>
                  <option value="">Choose…</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="exp">Years of experience</label>
                <input id="exp" type="number" min={0} max={60} className="input" value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="quals">Qualifications</label>
              <textarea id="quals" className="textarea" rows={2} placeholder={'MBBS — King Edward Medical University\nFCPS (Cardiology)'} value={f.qualifications} onChange={(e) => set('qualifications', e.target.value)} />
              <span className={styles.hint}>One per line.</span>
            </div>
            <div className="field">
              <span className={styles.groupLabel}>Languages you consult in</span>
              <div className={styles.chips}>
                {LANGS.map((l) => (
                  <label key={l} className={`${styles.chip} ${languages.includes(l) ? styles.chipOn : ''}`}>
                    <input type="checkbox" checked={languages.includes(l)} onChange={() => toggle(languages, l, setLanguages)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="bio">About you <span className={styles.hint}>(shown on your public profile)</span></label>
              <textarea id="bio" className="textarea" rows={3} maxLength={1500} placeholder="Conditions you see most, your approach with patients…" value={f.bio} onChange={(e) => set('bio', e.target.value)} />
            </div>
          </fieldset>

          <fieldset className={`${styles.section} ${styles.verify}`}>
            <legend>3. PMDC verification</legend>
            <div className={styles.verifyNote}>
              <ShieldCheck size={20} />
              <p>
                We check this number on the Pakistan Medical &amp; Dental Council practitioners register. Patients only
                see verified doctors.
              </p>
            </div>
            <div className="field">
              <label htmlFor="pmdc">PMDC registration number</label>
              <input
                id="pmdc"
                className="input"
                placeholder="12345-P"
                value={f.pmdcNumber}
                onChange={(e) => set('pmdcNumber', e.target.value)}
                aria-invalid={!!f.pmdcNumber && !pmdcOk}
                required
              />
              {f.pmdcNumber && !pmdcOk && <span className={styles.bad}>Format: digits, a hyphen and a letter, e.g. 12345-P</span>}
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend>4. Clinic and OPD schedule</legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="clinic">Clinic or hospital</label>
                <input id="clinic" className="input" value={f.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="city">City</label>
                <input id="city" className="input" list="cities" value={f.city} onChange={(e) => set('city', e.target.value)} required />
                <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Clinic address</label>
              <input id="address" className="input" value={f.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="field">
              <span className={styles.groupLabel}>OPD days</span>
              <div className={styles.chips}>
                {DAYS.map((d) => (
                  <label key={d} className={`${styles.chip} ${days.includes(d) ? styles.chipOn : ''}`}>
                    <input type="checkbox" checked={days.includes(d)} onChange={() => toggle(days, d, setDays)} />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="from">OPD starts</label>
                <select id="from" className="select" value={f.from} onChange={(e) => set('from', e.target.value)}>
                  {TIMES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="to">OPD ends</label>
                <select id="to" className="select" value={f.to} onChange={(e) => set('to', e.target.value)} aria-invalid={!timeOk}>
                  {TIMES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fees">Fee (Rs)</label>
                <input id="fees" type="number" min={0} step={100} className="input" value={f.fees} onChange={(e) => set('fees', e.target.value)} />
              </div>
            </div>
            <p className={styles.preview}>
              Patients will see: <strong>{days.length ? schedule : 'no days selected'}</strong>, {f.from} – {f.to}
              {!timeOk && <span className={styles.bad}> (end time must be after start time)</span>}
            </p>
          </fieldset>

          <label className={styles.agree}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            I confirm I am a registered medical practitioner and the details above are correct.
          </label>

          <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Create doctor account'}
          </button>
          <p className={styles.foot}>
            Already registered? <Link href="/login">Sign in</Link> · Are you a patient? <Link href="/register/patient">Register as a patient</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
