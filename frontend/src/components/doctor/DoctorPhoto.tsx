'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { http, getErrorMessage } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import type { Doctor } from '@/lib/types';

/** Profile photo shown to patients; JPG/PNG/WEBP up to 2 MB (gallery or camera). */
export default function DoctorPhoto({ doctor, onChange }: { doctor: Doctor; onChange: (d: Doctor) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (file.size > 2 * 1024 * 1024) return setError('The photo must be smaller than 2 MB.');
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await http.post<Doctor>('/doctors/me/photo', body);
      onChange({ ...doctor, imageUrl: data.imageUrl });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const name = `${doctor.title ?? ''} ${doctor.firstName} ${doctor.lastName}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0 18px', flexWrap: 'wrap' }}>
      <Avatar name={name} src={doctor.imageUrl ? mediaUrl(doctor.imageUrl) : null} size={72} />
      <div>
        <button type="button" className="btn btn-sm btn-outline" onClick={() => input.current?.click()} disabled={busy}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {busy ? <span className="spinner" /> : <Camera size={16} />} {doctor.imageUrl ? 'Change photo' : 'Add a profile photo'}
        </button>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 6 }}>Patients trust a clear, friendly photo. JPG, PNG or WEBP, up to 2 MB.</p>
        {error && <p className="field-error">{error}</p>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
    </div>
  );
}
