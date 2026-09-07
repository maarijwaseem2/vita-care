'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi, getErrorMessage } from '@/lib/api';

export default function RegisterPatientPage() {
  const { setSession } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    phone: '',
    city: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        phone: form.phone || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        gender: form.gender || undefined,
        age: form.age ? Number(form.age) : undefined,
      };
      const auth = await authApi.registerPatient(payload);
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
        <p className="sub">Book appointments and keep your records in one place.</p>

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

          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={form.email}
              onChange={(e) => update('email', e.target.value)} required />
          </div>

          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="At least 6 characters" required minLength={6} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Age</label>
              <input className="input" type="number" min={0} max={120} value={form.age}
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
                onChange={(e) => update('phone', e.target.value)} placeholder="+92 3.." />
            </div>
            <div className="field">
              <label>City</label>
              <input className="input" value={form.city}
                onChange={(e) => update('city', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Address</label>
            <input className="input" value={form.address}
              onChange={(e) => update('address', e.target.value)} />
          </div>

          <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <><UserPlus size={18} /> Create account</>}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
