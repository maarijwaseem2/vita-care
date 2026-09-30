'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { homeFor } from '@/lib/roles';
import PatientHomeVisits from '@/components/homecare/PatientHomeVisits';
import {
  User,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  CalendarClock,
  LogOut,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { formatDay } from '@/lib/dates';
import Loader from '@/components/ui/Loader';
import { patientsApi, appointmentsApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Patient, Appointment } from '@/lib/types';
import styles from '../profile.module.css';

const STATUS_CLASS: Record<Appointment['status'], string> = {
  booked: 'badge-cyan',
  completed: 'badge-green',
  cancelled: 'badge-red',
};

export default function PatientDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const cancel = async (a: Appointment) => {
    if (!window.confirm(`Cancel your appointment on ${formatDay(a.date)} at ${a.timeSlot}?`)) return;
    setCancelling(a.id);
    try {
      const updated = await appointmentsApi.setStatus(a.id, 'cancelled');
      setAppts((list) => list.map((x) => (x.id === a.id ? { ...x, status: updated.status } : x)));
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setCancelling(null);
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);

  // Medical history add state
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [diagnosedAt, setDiagnosedAt] = useState('');

  // Guard: only patients.
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login?redirect=/profile/patient');
    else if (user.role !== 'patient') router.replace(homeFor(user.role));
  }, [user, authLoading, router]);

  const load = () => {
    Promise.all([patientsApi.me(), appointmentsApi.myPatientAppointments()])
      .then(([p, a]) => {
        setPatient(p);
        setForm(p);
        setAppts(a);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === 'patient') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading || loading || !patient) return <Loader label="Loading your dashboard…" />;

  const set = (k: keyof Patient, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await patientsApi.update(patient.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender,
        phone: form.phone,
        city: form.city,
        address: form.address,
        currentMedication: form.currentMedication,
      });
      setPatient((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addHistory = async () => {
    if (!condition.trim()) return;
    try {
      await patientsApi.addHistory(patient.id, {
        condition,
        notes: notes || undefined,
        diagnosedAt: diagnosedAt || undefined,
      });
      setCondition('');
      setNotes('');
      setDiagnosedAt('');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const removeHistory = async (historyId: number) => {
    try {
      await patientsApi.removeHistory(patient.id, historyId);
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              medicalHistory: prev.medicalHistory.filter(
                (h) => h.id !== historyId,
              ),
            }
          : prev,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.avatar}>
            <User size={34} color="#fff" />
          </div>
          <div className={styles.headerInfo}>
            <h1>
              {patient.firstName} {patient.lastName}
            </h1>
            <p>{user?.email}</p>
            <span className={styles.headerBadge}>Patient account</span>
          </div>
          <button className={`btn btn-sm ${styles.logoutBtn}`} onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className={styles.grid}>
          {/* Profile */}
          <div className="card card-pad">
            <div className={styles.sectionHead}>
              <h2>Profile details</h2>
              {!editing ? (
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="btn btn-sm" onClick={saveProfile} disabled={saving}>
                    {saving ? <span className="spinner" /> : <><Check size={14} /> Save</>}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setForm(patient);
                      setEditing(false);
                    }}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className={styles.infoGrid}>
                <Info label="First name" value={patient.firstName} />
                <Info label="Last name" value={patient.lastName} />
                <Info label="Age" value={patient.age ? String(patient.age) : '—'} />
                <Info label="Gender" value={patient.gender ?? '—'} />
                <Info label="Phone" value={patient.phone ?? '—'} />
                <Info label="City" value={patient.city ?? '—'} />
                <Info label="Address" value={patient.address ?? '—'} full />
                <Info
                  label="Current medication"
                  value={patient.currentMedication ?? '—'}
                  full
                />
              </div>
            ) : (
              <div className={styles.infoGrid}>
                <Field label="First name">
                  <input className="input" value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} />
                </Field>
                <Field label="Last name">
                  <input className="input" value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} />
                </Field>
                <Field label="Age">
                  <input className="input" type="number" value={form.age ?? ''} onChange={(e) => set('age', e.target.value)} />
                </Field>
                <Field label="Gender">
                  <select className="select" value={form.gender ?? ''} onChange={(e) => set('gender', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Phone">
                  <input className="input" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="City">
                  <input className="input" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
                </Field>
                <Field label="Address" full>
                  <input className="input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
                </Field>
                <Field label="Current medication" full>
                  <input className="input" value={form.currentMedication ?? ''} onChange={(e) => set('currentMedication', e.target.value)} />
                </Field>
              </div>
            )}
          </div>

          {/* Medical history */}
          <div className="card card-pad">
            <div className={styles.sectionHead}>
              <h2>Medical history</h2>
            </div>

            {patient.medicalHistory.length > 0 ? (
              <div className={styles.histList}>
                {patient.medicalHistory.map((h) => (
                  <div key={h.id} className={styles.histItem}>
                    <div>
                      <h4>{h.condition}</h4>
                      {h.notes && <p>{h.notes}</p>}
                      {h.diagnosedAt && (
                        <div className={styles.histDate}>
                          Diagnosed {formatDay(h.diagnosedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeHistory(h.id)}
                      aria-label="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-2">No conditions recorded yet.</p>
            )}

            <div className={styles.addRow}>
              <div className="field" style={{ margin: 0 }}>
                <label>Condition</label>
                <input className="input" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Asthma" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Notes</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Diagnosed</label>
                <input className="input" type="date" value={diagnosedAt} onChange={(e) => setDiagnosedAt(e.target.value)} />
              </div>
              <button className="btn" onClick={addHistory} disabled={!condition.trim()}>
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Appointments */}
          <div className="card card-pad">
            <div className={styles.sectionHead}>
              <h2>My appointments</h2>
            </div>

            {appts.length > 0 ? (
              <div className={styles.apptList}>
                {appts.map((a) => (
                  <div key={a.id} className={styles.apptItem}>
                    <div className={styles.apptIcon}>
                      <Stethoscope size={20} />
                    </div>
                    <div className={styles.apptMain}>
                      <h4>
                        {a.doctor
                          ? `${a.doctor.title} ${a.doctor.firstName} ${a.doctor.lastName}`
                          : 'Doctor'}
                      </h4>
                      <p>
                        {a.doctor?.specialty}
                        {a.doctor?.city ? ` · ${a.doctor.city}` : ''}
                      </p>
                      {a.aiSummaryShared && (
                        <span className={styles.aiTag}>
                          <Sparkles size={12} /> AI summary shared with doctor
                        </span>
                      )}
                    </div>
                    <div className={styles.apptWhen}>
                      <strong>
                        {formatDay(a.date, { day: 'numeric', month: 'short' })}
                      </strong>
                      <span>{a.timeSlot}</span>
                    </div>
                    <span className={`badge ${STATUS_CLASS[a.status]}`}>{a.status}</span>
                    <div className={styles.apptActions}>
                      <Link href={`/receipt/${a.reference}`} className="btn btn-ghost btn-sm">
                        Receipt
                      </Link>
                      {a.status === 'booked' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={cancelling === a.id}
                          onClick={() => cancel(a)}
                        >
                          {cancelling === a.id ? <span className="spinner" /> : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <CalendarClock size={30} style={{ margin: '0 auto 10px', color: 'var(--muted)' }} />
                <p>You have no appointments yet.</p>
                <Link href="/doctors" className="btn">Book your first appointment</Link>
              </div>
            )}
          </div>
          <PatientHomeVisits />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`${styles.infoItem} ${full ? styles.full : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`${styles.infoItem} ${full ? styles.full : ''}`}>
      <span>{label}</span>
      {children}
    </div>
  );
}
