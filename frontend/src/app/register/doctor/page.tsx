'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi, getErrorMessage } from '@/lib/api';
import { SPECIALTIES } from '@/lib/types';

export default function RegisterDoctorPage() {
  const { setSession } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    specialty: '',
    age: '',
    gender: '',
    phone: '',
    city: '',
    address: '',
    fees: '',
    opdSchedule: '',
    availableTime: '',
    qualifications: '',
    experiences: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Split a comma/newline separated field into a clean string array.
  const toList = (value: string) =>
    value
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        specialty: form.specialty,
        gender: form.gender || undefined,
        age: form.age ? Number(form.age) : undefined,
        phone: form.phone || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        fees: form.fees ? Number(form.fees) : undefined,
        opdSchedule: form.opdSchedule || undefined,
        availableTime: form.availableTime || undefined,
        qualifications: toList(form.qualifications),
        experiences: toList(form.experiences),
      };
      const auth = await authApi.registerDoctor(payload);
      setSession(auth);
      router.push('/profile/doctor');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 620 }}>
        <h1>Join Vita Care as a doctor</h1>
        <p className="sub">Create a profile so patients can find and book you.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field-row">
            <div className="field">
              <label>First name</label>
              <input className="input" value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)} required />
            </div>
            <div className="field">
              <label>Last name</label>
              <input className="input" value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)} required />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={form.email}
                onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={form.password}
                onChange={(e) => update('password', e.target.value)} required minLength={6} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Specialty</label>
              <select className="select" value={form.specialty}
                onChange={(e) => update('specialty', e.target.value)} required>
                <option value="">Select specialty…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Consultation fee (Rs)</label>
              <input className="input" type="number" min={0} value={form.fees}
                onChange={(e) => update('fees', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Age</label>
              <input className="input" type="number" min={20} max={100} value={form.age}
                onChange={(e) => update('age', e.target.value)} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select className="select" value={form.gender}
                onChange={(e) => update('gender', e.target.value)}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Phone</label>
              <input className="input" value={form.phone}
                onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <input className="input" value={form.city}
                onChange={(e) => update('city', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Clinic address</label>
            <input className="input" value={form.address}
              onChange={(e) => update('address', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>OPD days</label>
              <input className="input" value={form.opdSchedule}
                onChange={(e) => update('opdSchedule', e.target.value)}
                placeholder="e.g. Mon, Wed, Fri" />
            </div>
            <div className="field">
              <label>Timing</label>
              <input className="input" value={form.availableTime}
                onChange={(e) => update('availableTime', e.target.value)}
                placeholder="e.g. 05:00 PM – 09:00 PM" />
            </div>
          </div>

          <div className="field">
            <label>Qualifications <span className="text-muted">(one per line or comma-separated)</span></label>
            <textarea className="textarea" value={form.qualifications}
              onChange={(e) => update('qualifications', e.target.value)}
              placeholder={'MBBS — Dow University\nFCPS Cardiology'} />
          </div>

          <div className="field">
            <label>Experience <span className="text-muted">(one per line or comma-separated)</span></label>
            <textarea className="textarea" value={form.experiences}
              onChange={(e) => update('experiences', e.target.value)}
              placeholder={'Consultant, Aga Khan (8 yrs)'} />
          </div>

          <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <><Stethoscope size={18} /> Create doctor profile</>}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
