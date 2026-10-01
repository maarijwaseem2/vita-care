'use client';

import { homeFor } from '@/lib/roles';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Pencil,
  Check,
  X,
  LogOut,
  CalendarClock,
  User,
  Phone,
  Sparkles,
} from 'lucide-react';
import VisitPanel from '@/components/doctor/VisitPanel';
import { formatDay } from '@/lib/dates';
import Loader from '@/components/ui/Loader';
import { doctorsApi, appointmentsApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SPECIALTIES } from '@/lib/types';
import type { Doctor, Appointment } from '@/lib/types';
import styles from '../profile.module.css';

const STATUS_CLASS: Record<Appointment['status'], string> = {
  booked: 'badge-cyan',
  completed: 'badge-green',
  cancelled: 'badge-red',
};

/** Split a textarea into a trimmed list (one item per line). */
const toList = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export default function DoctorDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login?redirect=/profile/doctor');
    else if (user.role !== 'doctor') router.replace(homeFor(user.role));
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role !== 'doctor') return;
    Promise.all([doctorsApi.myProfile(), appointmentsApi.myDoctorAppointments()])
      .then(([d, a]) => {
        setDoctor(d);
        setForm({
          title: d.title ?? '',
          specialty: d.specialty ?? '',
          phone: d.phone ?? '',
          city: d.city ?? '',
          address: d.address ?? '',
          fees: d.fees != null ? String(d.fees) : '',
          pmdcNumber: d.pmdcNumber ?? '',
          clinicName: d.clinicName ?? '',
          opdSchedule: d.opdSchedule ?? '',
          availableTime: d.availableTime ?? '',
          bio: d.bio ?? '',
          qualifications: (d.qualifications ?? []).join('\n'),
          experiences: (d.experiences ?? []).join('\n'),
        });
        // Upcoming visits first, then the rest (most recent first).
        setAppts([
          ...a.filter((x) => x.status === 'booked'),
          ...a.filter((x) => x.status !== 'booked').reverse(),
        ]);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading || !doctor) return <Loader label="Loading your dashboard…" />;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await doctorsApi.update(doctor.id, {
        title: form.title,
        specialty: form.specialty as Doctor['specialty'],
        phone: form.phone,
        city: form.city,
        address: form.address,
        fees: form.fees ? Number(form.fees) : undefined,
        pmdcNumber: form.pmdcNumber || undefined,
        clinicName: form.clinicName || undefined,
        opdSchedule: form.opdSchedule,
        availableTime: form.availableTime,
        bio: form.bio,
        qualifications: toList(form.qualifications),
        experiences: toList(form.experiences),
      });
      setDoctor((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;
  const upcoming = appts.filter((a) => a.status === 'booked').length;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.avatar}>
            {doctor.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.imageUrl} alt={fullName} className={styles.avatar} />
            ) : (
              <Stethoscope size={32} color="#fff" />
            )}
          </div>
          <div className={styles.headerInfo}>
            <h1>{fullName}</h1>
            <p>{user?.email}</p>
            <span className={styles.headerBadge}>
              <Stethoscope size={13} /> {doctor.specialty}
            </span>
          </div>
          <button className={`btn btn-sm ${styles.logoutBtn}`} onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>

        {doctor.verificationStatus && doctor.verificationStatus !== 'verified' && (
          <div
            className={styles.verifyBanner}
            data-status={doctor.verificationStatus}
            role="status"
          >
            {doctor.verificationStatus === 'pending' ? (
              <>
                <strong>Your profile is being verified.</strong> Our team is checking PMDC number{' '}
                <b>{doctor.pmdcNumber ?? '—'}</b>. Patients will be able to find and book you once it is approved.
              </>
            ) : (
              <>
                <strong>Verification was not approved.</strong> {doctor.verificationNote ?? ''} Update your PMDC
                number in the profile below to send it for review again.
              </>
            )}
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className={styles.grid}>
          {/* Profile */}
          <div className="card card-pad">
            <div className={styles.sectionHead}>
              <h2>Profile &amp; clinic details</h2>
              {!editing ? (
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="btn btn-sm" onClick={save} disabled={saving}>
                    {saving ? <span className="spinner" /> : <><Check size={14} /> Save</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className={styles.infoGrid}>
                <Info label="Title" value={doctor.title} />
                <Info label="Specialty" value={doctor.specialty} />
                <Info label="Phone" value={doctor.phone ?? '—'} />
                <Info label="City" value={doctor.city ?? '—'} />
                <Info label="Consultation fee" value={`Rs ${Number(doctor.fees).toLocaleString()}`} />
                <Info label="PMDC number" value={doctor.pmdcNumber ?? '—'} />
                <Info label="Clinic" value={doctor.clinicName ?? '—'} />
                <Info label="Experience" value={doctor.experienceYears != null ? `${doctor.experienceYears} years` : '—'} />
                <Info label="Languages" value={(doctor.languages ?? []).join(', ') || '—'} />
                <Info label="OPD schedule" value={doctor.opdSchedule ?? '—'} />
                <Info label="Available time" value={doctor.availableTime ?? '—'} />
                <Info label="Address" value={doctor.address ?? '—'} full />
                <Info label="About" value={doctor.bio ?? '—'} full />
                <Info
                  label="Qualifications"
                  value={(doctor.qualifications ?? []).join(', ') || '—'}
                  full
                />
                <Info
                  label="Experience"
                  value={(doctor.experiences ?? []).join(', ') || '—'}
                  full
                />
              </div>
            ) : (
              <div className={styles.infoGrid}>
                <Field label="Title">
                  <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Dr." />
                </Field>
                <Field label="Specialty">
                  <select className="select" value={form.specialty} onChange={(e) => set('specialty', e.target.value)}>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Phone">
                  <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="City">
                  <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
                </Field>
                <Field label="PMDC number (changing it sends your profile for review)">
                  <input className="input" value={form.pmdcNumber} onChange={(e) => set('pmdcNumber', e.target.value)} />
                </Field>
                <Field label="Clinic or hospital">
                  <input className="input" value={form.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
                </Field>
                <Field label="Consultation fee (Rs)">
                  <input className="input" type="number" value={form.fees} onChange={(e) => set('fees', e.target.value)} />
                </Field>
                <Field label="OPD schedule">
                  <input className="input" value={form.opdSchedule} onChange={(e) => set('opdSchedule', e.target.value)} placeholder="Mon–Fri" />
                </Field>
                <Field label="Available time">
                  <input className="input" value={form.availableTime} onChange={(e) => set('availableTime', e.target.value)} placeholder="5 PM – 9 PM" />
                </Field>
                <Field label="Address" full>
                  <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
                </Field>
                <Field label="About" full>
                  <textarea className="textarea" value={form.bio} onChange={(e) => set('bio', e.target.value)} />
                </Field>
                <Field label="Qualifications (one per line)" full>
                  <textarea className="textarea" value={form.qualifications} onChange={(e) => set('qualifications', e.target.value)} placeholder={'MBBS\nFCPS (Cardiology)'} />
                </Field>
                <Field label="Experience (one per line)" full>
                  <textarea className="textarea" value={form.experiences} onChange={(e) => set('experiences', e.target.value)} />
                </Field>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="card card-pad">
            <div className={styles.sectionHead}>
              <h2>Appointment schedule</h2>
              {upcoming > 0 && (
                <span className="badge badge-cyan">{upcoming} upcoming</span>
              )}
            </div>

            {appts.length > 0 ? (
              <>
                <p className={styles.hintLine}>Open a visit to see the patient&apos;s record and AI summary.</p>
                <div className={styles.apptList}>
                  {appts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`${styles.apptItem} ${styles.apptButton}`}
                      onClick={() => setOpenId(a.id)}
                    >
                      <div className={styles.apptIcon}>
                        <User size={20} />
                      </div>
                      <div className={styles.apptMain}>
                        <h4>{a.patientName}</h4>
                        <p>
                          <Phone size={12} style={{ verticalAlign: '-1px' }} /> {a.patientPhone}
                          {a.reason ? ` · ${a.reason}` : ''}
                        </p>
                        {a.visitType === 'home' && <span className={styles.aiTag}>Home visit</span>}
                        {a.hasAiSummary && (
                          <span className={`${styles.aiTag} ${a.aiUrgency === 'emergency' ? styles.aiTagRed : ''}`}>
                            <Sparkles size={12} /> AI summary
                            {a.aiUrgency === 'emergency' ? ' · emergency signs' : a.aiUrgency === 'soon' ? ' · see soon' : ''}
                          </span>
                        )}
                      </div>
                      <div className={styles.apptWhen}>
                        <strong>{formatDay(a.date, { day: 'numeric', month: 'short' })}</strong>
                        <span>{a.timeSlot}</span>
                      </div>
                      <span className={`badge ${STATUS_CLASS[a.status]}`}>{a.status}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <CalendarClock size={30} style={{ margin: '0 auto 10px', color: 'var(--muted)' }} />
                <p>No appointments booked yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {openId !== null && (
        <VisitPanel
          appointmentId={openId}
          onClose={() => setOpenId(null)}
          onUpdated={(u) => setAppts((list) => list.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)))}
        />
      )}
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
