'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import GoogleButton from '@/components/auth/GoogleButton';
import StepHeader from '@/components/auth/StepHeader';
import { PK_CITIES } from '@/lib/cities';
import { cleanPhoneInput, isPkPhone, PHONE_HELP } from '@/lib/phone';
import { googleSignup, splitName, type GoogleSignup } from '@/lib/googleSignup';
import { useAuth } from '@/context/AuthContext';
import { authApi, getErrorMessage } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Patient sign-up in two steps: 1) account (name, email, password), 2) details (phone, city, …).
 * With ?google=1 the person came from "Continue with Google": step 1 is skipped (Google gave the email).
 */
export default function RegisterPatientPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [google, setGoogle] = useState<GoogleSignup | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', age: '', gender: '', phone: '', city: '', address: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('google') !== '1') return;
    const g = googleSignup.get();
    if (!g) return;
    const [first, last] = splitName(g.name);
    setGoogle(g);
    setForm((f) => ({ ...f, firstName: first, lastName: last, email: g.email }));
    setStep(2);
  }, []);

  const next = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.firstName.trim().length < 2 || !form.lastName.trim()) return setError('Please write your first and last name.');
    if (!EMAIL_RE.test(form.email.trim())) return setError('Enter a valid email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setStep(2);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isPkPhone(form.phone)) return setError(PHONE_HELP);
    if (!form.city) return setError('Choose your city, so we can suggest doctors near you.');
    if (google && (form.firstName.trim().length < 2 || !form.lastName.trim())) return setError('Please write your first and last name.');
    setSubmitting(true);
    try {
      const details: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone,
        city: form.city,
        address: form.address || undefined,
        gender: form.gender || undefined,
        age: form.age ? Number(form.age) : undefined,
      };
      const auth = google
        ? await authApi.googleComplete(google.token, 'patient', details)
        : await authApi.registerPatient({ ...details, email: form.email.trim(), password: form.password });
      if (google) googleSignup.clear();
      setSession(auth);
      router.push('/profile/patient');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h1>Create your patient account</h1>
        <p className="sub">{google ? `Signed in with Google as ${google.email}. A few details and you are done.` : 'Book appointments and keep your records in one place.'}</p>
        <StepHeader step={step} labels={google ? ['Google account', 'Your details'] : ['Account', 'Your details']} />
        {error && <div className="form-error" role="alert">{error}</div>}

        {step === 1 ? (
          <form onSubmit={next} noValidate>
            <div className="field-row">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} autoComplete="given-name" required />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} autoComplete="family-name" required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required minLength={8} />
            </div>
            <button type="submit" className="btn btn-block btn-lg" id="nextStep">
              Continue <ArrowRight size={18} />
            </button>
            <GoogleButton redirect="/ai-doctor" />
          </form>
        ) : (
          <form onSubmit={submit} noValidate>
            {google && (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="firstName">First name</label>
                  <input id="firstName" className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="lastName">Last name</label>
                  <input id="lastName" className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
                </div>
              </div>
            )}
            <div className="field-row">
              <div className="field">
                <label htmlFor="phone">Phone (required)</label>
                <input id="phone" className="input" value={form.phone} onChange={(e) => update('phone', cleanPhoneInput(e.target.value))} inputMode="tel" placeholder="03001234567" aria-invalid={!!form.phone && !isPkPhone(form.phone)} required />
                {form.phone && !isPkPhone(form.phone) && <span className="field-error">{PHONE_HELP}</span>}
              </div>
              <div className="field">
                <label htmlFor="city">City (required)</label>
                <select id="city" className="select" value={form.city} onChange={(e) => update('city', e.target.value)} aria-label="City" required>
                  <option value="">Choose your city</option>
                  {PK_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="age">Age</label>
                <input id="age" className="input" type="number" min={0} max={120} value={form.age} onChange={(e) => update('age', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" className="select" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Area / address <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(helps us find doctors near you)</span></label>
              <input id="address" className="input" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="e.g. Block 13, Gulshan-e-Iqbal" />
            </div>
            <button type="submit" className="btn btn-block btn-lg" disabled={submitting} id="createAccount">
              {submitting ? <span className="spinner" /> : <><UserPlus size={18} /> Create account</>}
            </button>
            {!google && (
              <button type="button" className="btn btn-ghost btn-block" onClick={() => { setStep(1); setError(''); }}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </form>
        )}

        <p className="auth-foot">
          Already have an account? <Link href="/login">Sign in</Link>
          <br />
          Healthcare professional? <Link href="/register/doctor">Join as a doctor</Link> · <Link href="/register/nurse">Join as a nurse</Link>
        </p>
      </div>
    </div>
  );
}
