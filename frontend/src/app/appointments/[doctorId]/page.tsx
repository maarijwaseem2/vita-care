'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarCheck, Clock, ArrowLeft, Stethoscope } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { appointmentsApi, doctorsApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Doctor } from '@/lib/types';
import styles from './booking.module.css';

// Fixed set of bookable slots. In a fuller build these could be derived
// from each doctor's availableTime range.
const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM',
];

/** Next 14 selectable calendar days as {value, label}. */
function nextDays(count = 14) {
  const days: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    days.push({ value, label });
  }
  return days;
}

export default function BookingPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const days = useMemo(() => nextDays(), []);
  const [date, setDate] = useState(days[0].value);
  const [slot, setSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load doctor.
  useEffect(() => {
    doctorsApi
      .get(Number(doctorId))
      .then(setDoctor)
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [doctorId]);

  // Prefill patient name from the logged-in account.
  useEffect(() => {
    if (user?.role === 'patient' && user.name) setPatientName(user.name);
  }, [user]);

  // Refresh booked slots when the date changes.
  useEffect(() => {
    if (!doctorId || !date) return;
    setSlot('');
    appointmentsApi
      .bookedSlots(Number(doctorId), date)
      .then(setBookedSlots)
      .catch(() => setBookedSlots([]));
  }, [doctorId, date]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!slot) {
      setError('Please select a time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const appointment = await appointmentsApi.book({
        doctorId: Number(doctorId),
        patientName,
        patientPhone,
        date,
        timeSlot: slot,
        reason: reason || undefined,
      });
      router.push(`/receipt/${appointment.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      // A 409 means someone just took the slot — refresh availability.
      appointmentsApi
        .bookedSlots(Number(doctorId), date)
        .then(setBookedSlots)
        .catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading…" />;
  if (loadError || !doctor) {
    return (
      <div className="container" style={{ padding: '60px 20px' }}>
        <EmptyState
          title="Doctor not available"
          message={loadError}
          action={<Link href="/doctors" className="btn">Back to doctors</Link>}
        />
      </div>
    );
  }

  const fullName = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;

  return (
    <div className="container" style={{ padding: '32px 20px 64px' }}>
      <Link href={`/doctors/${doctor.id}`} className={styles.back}>
        <ArrowLeft size={16} /> Back to profile
      </Link>

      <div className={styles.layout}>
        {/* Booking form */}
        <div className={`card card-pad ${styles.formCard}`}>
          <h1 className={styles.title}>Book an appointment</h1>
          <p className="text-muted mb-2">
            Choose a date and time that works for you.
          </p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Select a date</label>
              <div className={styles.dates}>
                {days.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    className={`${styles.dateChip} ${date === d.value ? styles.dateActive : ''}`}
                    onClick={() => setDate(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                <Clock size={15} style={{ verticalAlign: '-2px' }} /> Available
                time slots
              </label>
              <div className={styles.slots}>
                {TIME_SLOTS.map((s) => {
                  const taken = bookedSlots.includes(s);
                  return (
                    <button
                      type="button"
                      key={s}
                      disabled={taken}
                      className={`${styles.slot} ${slot === s ? styles.slotActive : ''} ${taken ? styles.slotTaken : ''}`}
                      onClick={() => setSlot(s)}
                    >
                      {s}
                      {taken && <span className={styles.slotLabel}>Booked</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Your name</label>
                <input
                  className="input"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Phone number</label>
                <input
                  className="input"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+92 3.."
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Reason for visit <span className="text-muted">(optional)</span></label>
              <textarea
                className="textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or concern"
              />
            </div>

            <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
              {submitting ? (
                <span className="spinner" />
              ) : (
                <><CalendarCheck size={18} /> Confirm appointment</>
              )}
            </button>

            {!user && (
              <p className="text-muted text-center mt-2" style={{ fontSize: '0.85rem' }}>
                Booking as a guest.{' '}
                <Link href="/login" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                  Sign in
                </Link>{' '}
                to save it to your account.
              </p>
            )}
          </form>
        </div>

        {/* Doctor summary */}
        <aside className={`card card-pad ${styles.summary}`}>
          <div className={styles.docRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doctor.imageUrl || '/images/doctors/leo-mario.png'}
              alt={fullName}
            />
            <div>
              <h3>{fullName}</h3>
              <span className="badge badge-cyan">
                <Stethoscope size={12} /> {doctor.specialty}
              </span>
            </div>
          </div>
          <div className={styles.summaryRow}>
            <span>Date</span>
            <strong>
              {new Date(date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Time</span>
            <strong>{slot || '—'}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Consultation fee</span>
            <strong>Rs {Number(doctor.fees).toLocaleString()}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
