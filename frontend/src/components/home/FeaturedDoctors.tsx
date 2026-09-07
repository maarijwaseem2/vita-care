'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import { doctorsApi } from '@/lib/api';
import type { Doctor } from '@/lib/types';
import styles from './home.module.css';

export default function FeaturedDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorsApi
      .list()
      .then((data) => setDoctors(data.slice(0, 4)))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  // Hide the whole section gracefully if the backend has no data / is offline.
  if (!loading && doctors.length === 0) return null;

  return (
    <section className="section">
      <div className="container">
        <div className={styles.previewHead}>
          <div>
            <span className="eyebrow">Meet the team</span>
            <h2>Our top-rated doctors</h2>
            <p>Experienced specialists ready to help you feel better.</p>
          </div>
          <Link href="/doctors" className="btn btn-outline">
            View all doctors <ArrowRight size={18} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="card"
                style={{ height: 340, background: 'var(--surface-2)' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-4">
            {doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
