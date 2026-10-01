'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bot, Building2, CalendarCheck, Clock, Home } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { appointmentsApi, chatbotApi, doctorsApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { clinicDate, formatDay } from '@/lib/dates';
import type { Availability, Doctor, TriageSessionView } from '@/lib/types';
import LocationButton, { GeoPoint } from '@/components/location/LocationButton';
import styles from './booking.module.css';

const DAYS_SHOWN = 14;

function BookingForm() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const search = useSearchParams();
  const triageToken = search.get('triage') ?? undefined;
  const router = useRouter();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Dates in Pakistan time, starting today.
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => clinicDate(i)), []);
  const [schedule, setSchedule] = useState<Record<string, Availability>>({});
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');

  const [triage, setTriage] = useState<TriageSessionView | null>(null);
  const [shareSummary, setShareSummary] = useState(true);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [visitType, setVisitType] = useState<'clinic' | 'home'>('clinic');
  const [homeAddress, setHomeAddress] = useState('');
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const id = Number(doctorId);

  const loadSchedule = async () => {
    const results = await Promise.all(
      days.map((d) => appointmentsApi.availability(id, d).catch(() => null)),
    );
    const map: Record<string, Availability> = {};
    results.forEach((r) => r && (map[r.date] = r));
    setSchedule(map);
    return map;
  };

  useEffect(() => {
    Promise.all([doctorsApi.get(id), loadSchedule()])
      .then(([d, map]) => {
        setDoctor(d);
        const firstOpen = days.find((day) =>
          map[day]?.slots.some((s) => s.status === 'available'),
        );
        setDate(firstOpen ?? days[0]);
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!triageToken) return;
    chatbotApi
      .session(triageToken)
      .then((t) => {
        setTriage(t);
        if (t.summary?.chiefComplaint) setReason((r) => r || t.summary!.chiefComplaint);
      })
      .catch(() => setTriage(null));
  }, [triageToken]);

  useEffect(() => {
    if (user?.role === 'patient' && user.name) setPatientName((n) => n || user.name);
  }, [user]);

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
        doctorId: id,
        patientName,
        patientPhone,
        date,
        timeSlot: slot,
        reason: reason || undefined,
        triageSessionToken: triage && shareSummary ? triage.token : undefined,
        ...(visitType === 'home'
          ? { visitType: 'home' as const, homeAddress, latitude: geo?.latitude, longitude: geo?.longitude }
          : {}),
      });
      router.push(`/receipt/${appointment.reference}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSlot('');
      loadSchedule().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading the doctor's schedule…" />;
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
  const day = schedule[date];
  const freeCount = day?.slots.filter((s) => s.status === 'available').length ?? 0;

  return (
    <div className="container" style={{ padding: '32px 20px 64px' }}>
      <Link href={`/doctors/${doctor.id}`} className={styles.back}>
        <ArrowLeft size={16} /> Back to profile
      </Link>

      <div className={styles.layout}>
        <div className={`card card-pad ${styles.formCard}`}>
          <h1 className={styles.title}>Book an appointment</h1>
          <p className="text-muted mb-2">
            OPD: {doctor.opdSchedule || 'Every day'} · {doctor.availableTime || '10:00 AM – 05:00 PM'}
          </p>

          {triage && (
            <label className={styles.triage}>
              <input
                type="checkbox"
                checked={shareSummary}
                onChange={(e) => setShareSummary(e.target.checked)}
              />
              <Bot size={20} />
              <span>
                <strong>Share my AI Doctor summary with {doctor.title} {doctor.lastName}</strong>
                <small>
                  {triage.summary?.chiefComplaint ?? 'Your symptoms'}
                  {triage.summary?.duration ? ` · ${triage.summary.duration}` : ''}. The doctor
                  sees it before your visit.
                </small>
              </span>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label>Select a date</label>
              <div className={styles.dates}>
                {days.map((d) => {
                  const a = schedule[d];
                  const open = !!a?.slots.some((s) => s.status === 'available');
                  return (
                    <button
                      type="button"
                      key={d}
                      disabled={!open}
                      title={!open ? a?.closedReason ?? 'Fully booked' : undefined}
                      className={`${styles.dateChip} ${date === d ? styles.dateActive : ''}`}
                      onClick={() => {
                        setDate(d);
                        setSlot('');
                      }}
                    >
                      {formatDay(d)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label>
                <Clock size={15} style={{ verticalAlign: '-2px' }} /> Time slots{' '}
                <span className="text-muted">({freeCount} free)</span>
              </label>
              {!day?.opdDay ? (
                <p className="text-muted">{day?.closedReason ?? 'No OPD on this day.'}</p>
              ) : (
                <div className={styles.slots}>
                  {day.slots.map((s) => {
                    const disabled = s.status !== 'available';
                    const firstFree = day.slots.find((x) => x.status === 'available')?.time === s.time;
                    return (
                      <button
                        type="button"
                        key={s.time}
                        id={firstFree ? 'firstAvailableSlot' : undefined}
                        disabled={disabled}
                        className={`${styles.slot} ${slot === s.time ? styles.slotActive : ''} ${disabled ? styles.slotTaken : ''}`}
                        onClick={() => setSlot(s.time)}
                      >
                        {s.time}
                        {s.status === 'booked' && <span className={styles.slotLabel}>Booked</span>}
                        {s.status === 'past' && <span className={styles.slotLabel}>Passed</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="patientName">Your name</label>
                <input
                  id="patientName"
                  name="patientName"
                  className="input"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  maxLength={120}
                />
              </div>
              <div className="field">
                <label htmlFor="patientPhone">Phone number</label>
                <input
                  id="patientPhone"
                  name="patientPhone"
                  className="input"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="03xx xxxxxxx"
                  inputMode="tel"
                  required
                />
              </div>
            </div>

            {doctor.homeVisits && (
              <fieldset className={styles.visitType}>
                <legend>Where should the session take place?</legend>
                <div className={styles.visitOptions} role="radiogroup">
                  <label className={`${styles.visitOpt} ${visitType === 'clinic' ? styles.visitOn : ''}`}>
                    <input type="radio" name="visitType" checked={visitType === 'clinic'} onChange={() => setVisitType('clinic')} />
                    <Building2 size={18} /> At the clinic
                  </label>
                  <label className={`${styles.visitOpt} ${visitType === 'home' ? styles.visitOn : ''}`}>
                    <input type="radio" name="visitType" checked={visitType === 'home'} onChange={() => setVisitType('home')} />
                    <Home size={18} /> At my home
                  </label>
                </div>
                {visitType === 'home' && (
                  <>
                    <div className="field">
                      <label htmlFor="homeAddress">Full home address</label>
                      <textarea
                        id="homeAddress"
                        className="textarea"
                        rows={2}
                        value={homeAddress}
                        onChange={(e) => setHomeAddress(e.target.value)}
                        placeholder="House, street, block, area, city"
                        required
                        minLength={8}
                      />
                    </div>
                    <LocationButton value={geo} onChange={setGeo} />
                  </>
                )}
              </fieldset>
            )}

            <div className="field">
              <label htmlFor="reason">
                Reason for visit <span className="text-muted">(optional)</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                className="textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                placeholder="Briefly describe your symptoms or concern"
              />
            </div>

            <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
              {submitting ? (
                <span className="spinner" />
              ) : (
                <>
                  <CalendarCheck size={18} /> Confirm appointment
                </>
              )}
            </button>

            {!user && (
              <p className="text-muted text-center mt-2" style={{ fontSize: '0.85rem' }}>
                Booking as a guest.{' '}
                <Link href="/login" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                  Sign in
                </Link>{' '}
                to save it to your account and medical record.
              </p>
            )}
          </form>
        </div>

        <aside className={`card card-pad ${styles.summary}`}>
          <div className={styles.docRow}>
            <Avatar name={fullName} src={doctor.imageUrl} size={64} />
            <div>
              <h3>{fullName}</h3>
              <span className="badge badge-cyan">{doctor.specialty}</span>
            </div>
          </div>
          <div className={styles.summaryRow}>
            <span>Date</span>
            <strong>{date ? formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Time</span>
            <strong>{slot || '—'}</strong>
          </div>
          {doctor.address && (
            <div className={styles.summaryRow}>
              <span>Clinic</span>
              <strong>{doctor.address}</strong>
            </div>
          )}
          <div className={styles.summaryRow}>
            <span>Consultation fee</span>
            <strong>Rs {Number(doctor.fees).toLocaleString()}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<Loader label="Loading…" />}>
      <BookingForm />
    </Suspense>
  );
}
