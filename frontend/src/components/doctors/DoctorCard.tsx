import Link from 'next/link';
import { CalendarClock, MapPin, Star, Home } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { Doctor } from '@/lib/types';
import styles from './DoctorCard.module.css';

export default function DoctorCard({
  doctor,
  bookHref,
  compact = false,
}: {
  doctor: Doctor;
  /** Override the booking link (e.g. to attach an AI summary). */
  bookHref?: string;
  compact?: boolean;
}) {
  const fullName = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;

  return (
    <article className={`card card-hover ${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.head}>
        <Avatar name={fullName} src={doctor.imageUrl} size={compact ? 48 : 72} />
        <div className={styles.headText}>
          <h3 className={styles.name}>
            {fullName}{' '}
            <span
              className={styles.council}
              title={doctor.council === 'AHPC' ? 'Registered with the Allied Health Professionals Council' : 'Registered with the Pakistan Medical & Dental Council'}
            >
              {doctor.council ?? 'PMDC'}
            </span>
          </h3>
          <div className={styles.tags}>
            <span className={styles.specialty}>{doctor.specialty}</span>
            <span className={styles.rating} aria-label={`Rating ${Number(doctor.rating).toFixed(1)} out of 5`}>
              <Star size={13} fill="currentColor" /> {Number(doctor.rating).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          {doctor.proximity && (
            <span className={`${styles.meta} ${styles.near}`}>
              {doctor.proximity === 'area' ? 'Near you' : 'In your city'}
            </span>
          )}
          {doctor.homeVisits && (
            <span className={styles.meta}>
              <Home size={14} /> Home visits
            </span>
          )}
          {doctor.city && (
            <span className={styles.meta}>
              <MapPin size={14} /> {doctor.city}
            </span>
          )}
          {doctor.opdSchedule && (
            <span className={styles.meta}>
              <CalendarClock size={14} /> {doctor.opdSchedule}
            </span>
          )}
        </div>

        {!compact && doctor.bio && <p className={styles.bio}>{doctor.bio}</p>}

        <div className={styles.footer}>
          <div className={styles.fees}>
            <span>Fee</span>
            <strong>Rs {Number(doctor.fees).toLocaleString()}</strong>
          </div>
          <div className={styles.actions}>
            {!compact && (
              <Link href={`/doctors/${doctor.id}`} className={`btn btn-outline btn-sm ${styles.actionBtn}`}>
                Profile
              </Link>
            )}
            <Link href={bookHref ?? `/appointments/${doctor.id}`} className={`btn btn-sm ${styles.actionBtn}`}>
              Book
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
