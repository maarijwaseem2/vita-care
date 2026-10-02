'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { http, getErrorMessage } from '@/lib/api';
import styles from '@/components/admin/admin.module.css';

interface Msg { id: number; name: string; email: string; phone: string | null; topic: string; message: string; status: 'new' | 'read' | 'done'; created_at: string }

/** Messages sent from the public Contact page. */
export default function AdminMessages() {
  const [status, setStatus] = useState('new');
  const [data, setData] = useState<{ items: Msg[]; total: number } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    http.get('/admin/contact-messages', { params: { status } }).then((r) => setData(r.data)).catch((e) => setError(getErrorMessage(e)));
  }, [status]);
  useEffect(load, [load]);

  const mark = async (id: number, s: Msg['status']) => {
    await http.patch(`/admin/contact-messages/${id}`, { status: s });
    load();
  };

  return (
    <div>
      <div className={styles.pageHead}>
        <div>
          <h1>Messages</h1>
          <p>From the Contact page. Reply by email or WhatsApp, then mark as done.</p>
        </div>
      </div>
      <div className={styles.tabs} role="tablist" style={{ marginBottom: 14 }}>
        {['new', 'read', 'done', 'all'].map((s) => (
          <button key={s} role="tab" aria-selected={status === s} className={status === s ? styles.tabOn : ''} onClick={() => setStatus(s)}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {error && <div className="form-error">{error}</div>}
      {data && data.items.length === 0 && <p className={styles.empty}>No messages here.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data?.items.map((m) => (
          <article key={m.id} className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong>{m.topic} — {m.name}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{new Date(m.created_at).toLocaleString('en-PK')}</span>
            </div>
            <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.message}</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <a href={`mailto:${m.email}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Mail size={14} /> {m.email}</a>
              {m.phone && <a href={`tel:${m.phone}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Phone size={14} /> {m.phone}</a>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {m.status !== 'read' && <button className="btn btn-sm btn-outline" onClick={() => mark(m.id, 'read')}>Mark read</button>}
              {m.status !== 'done' && <button className="btn btn-sm" onClick={() => mark(m.id, 'done')}>Mark done</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
