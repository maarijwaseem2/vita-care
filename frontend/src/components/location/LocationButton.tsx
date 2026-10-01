'use client';

import { useState } from 'react';
import { Crosshair, MapPin, X } from 'lucide-react';
import { mapsLink } from '@/lib/nurse';
import styles from './LocationButton.module.css';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Shares the patient's current GPS location (with permission) so a nurse or
 * physiotherapist can navigate straight to the door. Optional: the typed
 * address always works on its own.
 */
export default function LocationButton({
  value,
  onChange,
}: {
  value: GeoPoint | null;
  onChange: (p: GeoPoint | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const locate = () => {
    setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('This browser cannot share location. Please type the full address.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onChange({
          latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was blocked. Allow it in the browser, or just type the address.'
            : 'Could not get your location. Please try again outdoors or type the address.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  if (value) {
    return (
      <div className={styles.ok} role="status">
        <MapPin size={18} />
        <span>
          Current location added{value.accuracy ? ` (about ±${value.accuracy} m)` : ''}.{' '}
          <a href={mapsLink('', value.latitude, value.longitude)} target="_blank" rel="noopener noreferrer">
            Check on map
          </a>
        </span>
        <button type="button" className={styles.remove} onClick={() => onChange(null)} aria-label="Remove location">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className={`btn btn-outline btn-sm ${styles.btn}`} onClick={locate} disabled={busy}>
        {busy ? <span className="spinner" /> : <Crosshair size={16} />} Use my current location
      </button>
      <p className={styles.hint}>
        Optional. Shared only with the nurse or physiotherapist who accepts your visit, so they can come straight to you.
      </p>
      {error && <p className={styles.err}>{error}</p>}
    </div>
  );
}
