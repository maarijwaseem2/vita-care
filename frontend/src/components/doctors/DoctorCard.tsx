import Link from 'next/link';
import { MapPin, Star, Stethoscope } from 'lucide-react';
import type { Doctor } from '@/lib/types';
import styles from './DoctorCard.module.css';

/** Placeholder avatar when a doctor has no photo. */
const FALLBACK = '/images/doctors/leo-mario.png';

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  const fullName = `${doctor.title} ${doctor.firstName} ${doctor.lastName}`;

  return (
    <article className={`card card-hover ${styles.card}`}>
      <div className={styles.media}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={doctor.imageUrl || FALLBACK} alt={fullName} />
        <span className={`badge badge-cyan ${styles.specialty}`}>
          <Stethoscope size={13} /> {doctor.specialty}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.headRow}>
          <h3 className={styles.name}>{fullName}</h3>
          <span className={styles.rating}>
            <Star size={14} fill="currentColor" /> {Number(doctor.rating).toFixed(1)}
          </span>
        </div>

        {doctor.city && (
          <p className={styles.meta}>
            <MapPin size={15} /> {doctor.city}
          </p>
        )}

        {doctor.bio && <p className={styles.bio}>{doctor.bio}</p>}

        <div className={styles.footer}>
          <div className={styles.fees}>
            <span>Fee</span>
            <strong>Rs {Number(doctor.fees).toLocaleString()}</strong>
          </div>
          <div className={styles.actions}>
            <Link href={`/doctors/${doctor.id}`} className="btn btn-outline btn-sm">
              Profile
            </Link>
            <Link href={`/appointments/${doctor.id}`} className="btn btn-sm">
              Book
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
