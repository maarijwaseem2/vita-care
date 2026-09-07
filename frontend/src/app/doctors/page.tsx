'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, UserX } from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { doctorsApi, getErrorMessage } from '@/lib/api';
import { SPECIALTIES, type Doctor, type Specialty } from '@/lib/types';
import styles from './doctors.module.css';

function DoctorsList() {
  const params = useSearchParams();
  const initialSpecialty = (params.get('specialty') as Specialty) || '';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState<Specialty | ''>(initialSpecialty);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await doctorsApi.list({
        search: search || undefined,
        city: city || undefined,
        specialty: (specialty as Specialty) || undefined,
      });
      setDoctors(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, city, specialty]);

  // Load city list once.
  useEffect(() => {
    doctorsApi.cities().then(setCities).catch(() => setCities([]));
  }, []);

  // Refetch whenever a filter changes (debounced for the search box).
  useEffect(() => {
    const t = setTimeout(fetchDoctors, 250);
    return () => clearTimeout(t);
  }, [fetchDoctors]);

  const reset = () => {
    setSearch('');
    setCity('');
    setSpecialty('');
  };

  return (
    <>
      <section className={styles.head}>
        <div className="container">
          <span className="eyebrow" style={{ color: '#bcd4ff' }}>
            Find a Doctor
          </span>
          <h1>Search trusted specialists</h1>
          <p>
            Filter by city, department or name to find the right doctor and book
            in seconds.
          </p>
        </div>
      </section>

      <div className="container">
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by doctor name or specialty…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filters}>
            <select
              className="select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value as Specialty | '')}
            >
              <option value="">All specialties</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {(search || city || specialty) && (
              <button className="btn btn-ghost btn-sm" onClick={reset}>
                <SlidersHorizontal size={16} /> Clear
              </button>
            )}
          </div>
        </div>

        <div className={styles.results}>
          {loading ? (
            <Loader label="Loading doctors…" />
          ) : error ? (
            <EmptyState
              icon={<UserX size={40} />}
              title="Couldn't load doctors"
              message={error}
              action={
                <button className="btn" onClick={fetchDoctors}>
                  Try again
                </button>
              }
            />
          ) : doctors.length === 0 ? (
            <EmptyState
              icon={<UserX size={40} />}
              title="No doctors found"
              message="Try adjusting your filters or search term."
            />
          ) : (
            <>
              <p className={styles.count}>
                {doctors.length} doctor{doctors.length > 1 ? 's' : ''} found
              </p>
              <div className="grid grid-3">
                {doctors.map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <DoctorsList />
    </Suspense>
  );
}
