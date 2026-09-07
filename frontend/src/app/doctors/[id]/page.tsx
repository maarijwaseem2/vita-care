'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Star,
  Phone,
  Clock,
  CalendarDays,
  GraduationCap,
  Briefcase,
  Stethoscope,
  ArrowLeft,
  CalendarCheck,
} from 'lucide-react';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { doctorsApi, getErrorMessage } from '@/lib/api';
import type { Doctor } from '@/lib/types';
import styles from './profile.module.css';

const FALLBACK = '/images/doctors/leo-mario.png';

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    doctorsApi
      .get(Number(id))
      .then(setDoctor)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader label="Loading profile…" />;
  if (error || !doctor) {
    return (
      <div className="container" style={{ padding: '60px 20px' }}>
        <EmptyState
          title="Doctor not found"
          message={error || 'This profile may have been removed.'}
          action={
            <Link href="/doctors" className="btn">
              Back to doctors
            </Link>
          }
        />
      </div>
    );
  }

  const fullName = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;

  return (
    <>
      <div className={styles.hero}>
        <div className="container">
          <Link href="/doctors" className={styles.back}>
            <ArrowLeft size={16} /> All doctors
          </Link>

          <div className={styles.heroInner}>
            <div className={styles.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doctor.imageUrl || FALLBACK} alt={fullName} />
            </div>
            <div className={styles.heroInfo}>
              <span className="badge badge-cyan">
                <Stethoscope size={13} /> {doctor.specialty}
              </span>
              <h1>{fullName}</h1>
              {doctor.bio && <p className={styles.bio}>{doctor.bio}</p>}

              <div className={styles.metaRow}>
                <span className={styles.rating}>
                  <Star size={16} fill="currentColor" />{' '}
                  {Number(doctor.rating).toFixed(1)}
                </span>
                {doctor.city && (
                  <span>
                    <MapPin size={16} /> {doctor.city}
                  </span>
                )}
                {doctor.phone && (
                  <span>
                    <Phone size={16} /> {doctor.phone}
                  </span>
                )}
              </div>

              <div className={styles.heroCta}>
                <Link href={`/appointments/${doctor.id}`} className="btn btn-lg">
                  <CalendarCheck size={18} /> Book appointment
                </Link>
                <div className={styles.feeTag}>
                  <span>Consultation fee</span>
                  <strong>Rs {Number(doctor.fees).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.grid}>
          <div className={styles.main}>
            {doctor.qualifications && doctor.qualifications.length > 0 && (
              <section className={`card card-pad ${styles.block}`}>
                <h2 className={styles.blockTitle}>
                  <GraduationCap size={20} /> Qualifications
                </h2>
                <ul className={styles.list}>
                  {doctor.qualifications.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </section>
            )}

            {doctor.experiences && doctor.experiences.length > 0 && (
              <section className={`card card-pad ${styles.block}`}>
                <h2 className={styles.blockTitle}>
                  <Briefcase size={20} /> Experience
                </h2>
                <ul className={styles.list}>
                  {doctor.experiences.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </section>
            )}

            {doctor.address && (
              <section className={`card card-pad ${styles.block}`}>
                <h2 className={styles.blockTitle}>
                  <MapPin size={20} /> Clinic location
                </h2>
                <p>{doctor.address}</p>
              </section>
            )}
          </div>

          <aside className={styles.side}>
            <div className={`card card-pad ${styles.block}`}>
              <h2 className={styles.blockTitle}>
                <CalendarDays size={20} /> OPD schedule
              </h2>
              <div className={styles.scheduleRow}>
                <CalendarDays size={16} />
                <span>{doctor.opdSchedule || 'By appointment'}</span>
              </div>
              <div className={styles.scheduleRow}>
                <Clock size={16} />
                <span>{doctor.availableTime || 'Flexible timing'}</span>
              </div>
              <Link
                href={`/appointments/${doctor.id}`}
                className="btn btn-block mt-3"
              >
                <CalendarCheck size={18} /> Book now
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
