'use client';

import StepHeader from '@/components/auth/StepHeader';
import { googleSignup, splitName, type GoogleSignup } from '@/lib/googleSignup';
import { cleanPhoneInput, isPkPhone, PHONE_HELP } from '@/lib/phone';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { authApi, http, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { QUALIFICATIONS, SERVICES, ServiceId } from '@/lib/nurse';
import type { AuthResponse } from '@/lib/types';
import styles from '../doctor/register.module.css';

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Hyderabad', 'Sialkot', 'Abbottabad', 'Gujranwala'];
const PNC_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]{2,19}$/;

export default function RegisterNursePage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', gender: 'female',
    city: 'Karachi', areas: '', qualification: QUALIFICATIONS[0], pncNumber: '', experienceYears: '',
    visitFee: '1500', availableDays: 'Mon – Sat', bio: '',
  });
  const [skills, setSkills] = useState<ServiceId[]>(['injection', 'vitals']);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [google, setGoogle] = useState<GoogleSignup | null>(null);

  // From "Continue with Google": name and email come from Google, no password needed.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('google') !== '1') return;
    const g = googleSignup.get();
    if (!g) return;
    const [first, last] = splitName(g.name);
    setGoogle(g);
    setF((x) => ({ ...x, firstName: x.firstName || first, lastName: x.lastName || last, email: g.email }));
  }, []);

  const goNext = () => {
    setError('');
    if (f.firstName.trim().length < 2 || !f.lastName.trim()) return setError('Please write your first and last name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError('Enter a valid email address.');
    if (!google && f.password.length < 8) return setError('Password must be at least 8 characters.');
    if (!isPkPhone(f.phone)) return setError(PHONE_HELP);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (id: ServiceId) => setSkills((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const pncOk = !f.pncNumber || PNC_RE.test(f.pncNumber.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!PNC_RE.test(f.pncNumber.trim())) return setError('Enter your Pakistan Nursing Council registration number.');
    if (!skills.length) return setError('Choose at least one service you provide.');
    if (!agree) return setError('Please confirm the declaration.');
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        email: f.email.trim(), password: f.password, firstName: f.firstName.trim(), lastName: f.lastName.trim(),
        gender: f.gender, phone: f.phone.trim(), city: f.city,
        areas: f.areas.split(',').map((a) => a.trim()).filter(Boolean),
        qualification: f.qualification, pncNumber: f.pncNumber.trim(), skills,
        experienceYears: f.experienceYears ? Number(f.experienceYears) : undefined,
        visitFee: Number(f.visitFee) || 0, availableDays: f.availableDays || undefined, bio: f.bio.trim() || undefined,
      };
      const { email: _email, password: _password, ...details } = payload;
      void _email;
      void _password;
      const data = google
        ? await authApi.googleComplete(google.token, 'nurse', details)
        : (await http.post<AuthResponse>('/auth/register/nurse', payload)).data;
      if (google) googleSignup.clear();
      setSession(data);
      router.push('/profile/nurse');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.head}>
          <h1>Join as a home-visit nurse</h1>
          <p>
            Patients and their doctors in your city request visits for injections, wound care, vitals checks and more.
            You choose which visits to accept. Your profile goes live after we verify your PNC licence.
          </p>
        </header>

        {error && <div className="form-error" role="alert">{error}</div>}

        <StepHeader step={step} labels={['About you', 'Work & licence']} />
        <form onSubmit={submit} noValidate>
          <fieldset className={styles.section} hidden={step !== 1}>
            <legend>About you</legend>
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
                <input id="email" type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" readOnly={!!google} />
              </div>
              {!google && (
                <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" className="input" minLength={8} value={f.password} onChange={(e) => set('password', e.target.value)} required autoComplete="new-password" />
                <span className={styles.hint}>At least 8 characters.</span>
              </div>
              )}
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="phone">Phone (shared with a patient only after you accept their visit)</label>
                <input id="phone" className="input" inputMode="tel" placeholder="+92 3xx xxxxxxx" value={f.phone} onChange={(e) => set('phone', cleanPhoneInput(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" className="select" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
                <span className={styles.hint}>Many families ask for a female nurse; this lets us match them.</span>
              </div>
            </div>
          </fieldset>
          {step === 1 && (
            <button type="button" id="nextStep" className="btn btn-lg btn-block" onClick={goNext}>
              Continue to {google ? 'your details' : 'step 2'} →
            </button>
          )}

          <fieldset className={styles.section} hidden={step !== 2}>
            <legend>Your work</legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="qualification">Qualification</label>
                <select id="qualification" className="select" value={f.qualification} onChange={(e) => set('qualification', e.target.value)}>
                  {QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="exp">Years of experience</label>
                <input id="exp" type="number" min={0} max={50} className="input" value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <span className={styles.groupLabel}>Services you provide</span>
              <div className={styles.chips}>
                {SERVICES.map((s) => (
                  <label key={s.id} className={`${styles.chip} ${skills.includes(s.id) ? styles.chipOn : ''}`}>
                    <input type="checkbox" checked={skills.includes(s.id)} onChange={() => toggle(s.id)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="city">City</label>
                <select id="city" className="select" value={f.city} onChange={(e) => set('city', e.target.value)}>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="areas">Areas you travel to</label>
                <input id="areas" className="input" placeholder="Clifton, DHA, PECHS" value={f.areas} onChange={(e) => set('areas', e.target.value)} />
                <span className={styles.hint}>Separate with commas.</span>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="fee">Fee per visit (PKR)</label>
                <input id="fee" type="number" min={0} max={50000} className="input" value={f.visitFee} onChange={(e) => set('visitFee', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="days">Days you are available</label>
                <input id="days" className="input" value={f.availableDays} onChange={(e) => set('availableDays', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="bio">About you <span className={styles.hint}>(shown to patients)</span></label>
              <textarea id="bio" className="textarea" rows={3} maxLength={1000} placeholder="e.g. ICU experience, elderly care, female patients only…" value={f.bio} onChange={(e) => set('bio', e.target.value)} />
            </div>
          </fieldset>

          <fieldset className={`${styles.section} ${styles.verify}`} hidden={step !== 2}>
            <legend>Licence verification</legend>
            <div className={styles.verifyNote}>
              <ShieldCheck size={20} />
              <p>
                We check your number with the Pakistan Nursing & Midwifery Council before patients can see you. Until then you
                can sign in, but cannot accept visits.
              </p>
            </div>
            <div className="field">
              <label htmlFor="pnc">PNC registration number</label>
              <input id="pnc" className="input" value={f.pncNumber} onChange={(e) => set('pncNumber', e.target.value)} placeholder="e.g. PNC-123456" required />
              {!pncOk && <span className={styles.bad}>Use letters, numbers and dashes only.</span>}
            </div>
            <label className={styles.agree}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I confirm that my licence is valid and the information above is true.</span>
            </label>
          </fieldset>

          <button className="btn btn-lg btn-block" disabled={busy} hidden={step !== 2} id="createAccount">
            {busy ? <span className="spinner" /> : 'Create nurse account'}
          </button>
          {step === 2 && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => { setStep(1); setError(''); }}>
              ← Back
            </button>
          )}
          <p className={styles.foot}>
            Already registered? <Link href="/login">Sign in</Link> · Are you a doctor? <Link href="/register/doctor">Join as a doctor</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
