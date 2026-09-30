'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Printer,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Stethoscope,
  ArrowLeft,
} from 'lucide-react';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { appointmentsApi, getErrorMessage } from '@/lib/api';
import type { Appointment } from '@/lib/types';
import { formatDay } from '@/lib/dates';
import styles from './receipt.module.css';

export default function ReceiptPage() {
  const { ref } = useParams<{ ref: string }>();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    appointmentsApi
      .receipt(decodeURIComponent(ref))
      .then(setAppt)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [ref]);

  if (loading) return <Loader label="Preparing your receipt…" />;
  if (error || !appt) {
    return (
      <div className="container" style={{ padding: '60px 20px' }}>
        <EmptyState
          title="Receipt not found"
          message={error}
          action={<Link href="/doctors" className="btn">Find a doctor</Link>}
        />
      </div>
    );
  }

  const doctor = appt.doctor;
  const doctorName = doctor
    ? `${doctor.title} ${doctor.firstName} ${doctor.lastName}`
    : 'Doctor';
  const prettyDate = formatDay(appt.date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const reference = appt.reference;

  return (
    <div className="container" style={{ padding: '32px 20px 64px' }}>
      <div className={styles.actions}>
        <Link href="/doctors" className={styles.back}>
          <ArrowLeft size={16} /> Back to doctors
        </Link>
        <button className="btn btn-sm" onClick={() => window.print()}>
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      <div className={styles.sheet} id="receipt">
        <div className={styles.confirmed}>
          <CheckCircle2 size={44} />
          <div>
            <h1>{appt.status === 'cancelled' ? 'Appointment cancelled' : appt.status === 'completed' ? 'Visit completed' : 'Appointment confirmed'}</h1>
            <p>
              {appt.status === 'cancelled'
                ? 'This appointment was cancelled.'
                : 'Keep this reference. You can open this receipt again from the same link.'}
            </p>
          </div>
        </div>

        <div className={styles.head}>
          <div className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/brand/logo.png" alt="Vita Care" />
            <span>Vita Care</span>
          </div>
          <div className={styles.ref}>
            <span>Reference</span>
            <strong>{reference}</strong>
          </div>
        </div>

        <div className={styles.grid}>
          <section>
            <h3 className={styles.blockTitle}>Patient</h3>
            <div className={styles.line}>
              <User size={16} /> <span>{appt.patientName}</span>
            </div>
            <div className={styles.line}>
              <Phone size={16} /> <span>{appt.patientPhone}</span>
            </div>
          </section>

          <section>
            <h3 className={styles.blockTitle}>Doctor</h3>
            <div className={styles.line}>
              <Stethoscope size={16} /> <span>{doctorName}</span>
            </div>
            {doctor?.specialty && (
              <div className={styles.line}>
                <span className="badge badge-cyan">{doctor.specialty}</span>
              </div>
            )}
            {doctor?.address && (
              <div className={styles.line}>
                <MapPin size={16} />{' '}
                <span>
                  {doctor.address}
                  {doctor.city ? `, ${doctor.city}` : ''}
                </span>
              </div>
            )}
          </section>

          <section>
            <h3 className={styles.blockTitle}>Schedule</h3>
            <div className={styles.line}>
              <Calendar size={16} /> <span>{prettyDate}</span>
            </div>
            <div className={styles.line}>
              <Clock size={16} /> <span>{appt.timeSlot}</span>
            </div>
          </section>

          <section>
            <h3 className={styles.blockTitle}>Payment</h3>
            <div className={styles.feeRow}>
              <span>Consultation fee</span>
              <strong>
                Rs {doctor ? Number(doctor.fees).toLocaleString() : '—'}
              </strong>
            </div>
            <p className={styles.payNote}>Payable at the clinic reception.</p>
          </section>
        </div>

        {appt.aiSummaryShared && (
          <div className={styles.reason}>
            <h3 className={styles.blockTitle}>AI Doctor summary</h3>
            <p>
              Your AI Doctor summary was shared with the doctor, so they can review your
              symptoms and history before the visit.
            </p>
          </div>
        )}

        {appt.reason && (
          <div className={styles.reason}>
            <h3 className={styles.blockTitle}>Reason for visit</h3>
            <p>{appt.reason}</p>
          </div>
        )}

        <div className={styles.footer}>
          <p>
            Please arrive 10 minutes early. Your medical history is already on
            Vita Care if you booked while signed in. To cancel, open your account.
          </p>
          <p className={styles.thanks}>Thank you for choosing Vita Care.</p>
        </div>
      </div>
    </div>
  );
}
