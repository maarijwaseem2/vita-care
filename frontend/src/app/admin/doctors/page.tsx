'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, RotateCcw, ExternalLink } from 'lucide-react';
import { adminApi, AdminDoctor } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { Badge, Pager, Tabs, fmtDate, useDebounced } from '@/components/admin/ui';
import styles from '@/components/admin/admin.module.css';

type Status = 'pending' | 'verified' | 'rejected' | 'all';

export default function DoctorsAdmin() {
  const [status, setStatus] = useState<Status>('pending');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminDoctor> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<AdminDoctor | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    adminApi
      .doctors({ status, search: q || undefined, page })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)));
  }, [status, q, page]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [status, q]);

  const act = async (d: AdminDoctor, next: 'verified' | 'rejected' | 'pending', why?: string) => {
    setBusy(d.id);
    setError('');
    try {
      await adminApi.verify(d.id, next, why);
      setRejecting(null);
      setNote('');
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Doctor verification</h1>
          <p>
            New doctors stay hidden from patients until you check their PMDC number on the council&apos;s
            practitioners register and verify them here.
          </p>
        </div>
        <a className={styles.btnSm} href="https://pmdc.pk/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} /> Open PMDC register
        </a>
      </div>

      <div className={styles.toolbar}>
        <Tabs<Status>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'pending', label: 'Waiting' },
            { value: 'verified', label: 'Verified' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'all', label: 'All' },
          ]}
        />
        <label className={styles.search}>
          <span className="sr-only">Search doctors</span>
          <input
            id="adminSearch"
            className="input"
            placeholder="Search name, PMDC, city or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>PMDC number</th>
                <th>Specialty & city</th>
                <th>Registered</th>
                <th>Status</th>
                <th style={{ textAlign: 'end' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className={styles.cellMain}>
                      {d.title} {d.firstName} {d.lastName}
                    </div>
                    <div className={styles.cellSub}>{d.user?.email}</div>
                    {d.clinicName && <div className={styles.cellSub}>{d.clinicName}</div>}
                  </td>
                  <td className={styles.mono}>{d.pmdcNumber ?? '—'}</td>
                  <td>
                    <div>{d.specialty}</div>
                    <div className={styles.cellSub}>
                      {d.city ?? '—'}
                      {d.experienceYears != null ? ` · ${d.experienceYears} yrs` : ''}
                    </div>
                  </td>
                  <td className={styles.cellSub}>{fmtDate(d.createdAt)}</td>
                  <td>
                    <Badge kind={d.verificationStatus}>{d.verificationStatus}</Badge>
                    {d.verificationNote && <div className={styles.cellSub} style={{ maxWidth: 220 }}>{d.verificationNote}</div>}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {d.verificationStatus !== 'verified' && (
                        <button className={`${styles.btnSm} ${styles.btnGood}`} disabled={busy === d.id} onClick={() => act(d, 'verified')}>
                          <Check size={15} /> Verify
                        </button>
                      )}
                      {d.verificationStatus !== 'rejected' && (
                        <button className={`${styles.btnSm} ${styles.btnBad}`} disabled={busy === d.id} onClick={() => setRejecting(d)}>
                          <X size={15} /> Reject
                        </button>
                      )}
                      {d.verificationStatus !== 'pending' && (
                        <button className={styles.btnSm} disabled={busy === d.id} onClick={() => act(d, 'pending')}>
                          <RotateCcw size={15} /> Back to queue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.items.length === 0 && (
          <p className={styles.empty}>{status === 'pending' ? 'No doctors are waiting. All caught up.' : 'No doctors match.'}</p>
        )}
        {data && data.total > 0 && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      {rejecting && (
        <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div className={styles.modal}>
            <h2 id="reject-title">
              Reject Dr {rejecting.firstName} {rejecting.lastName}?
            </h2>
            <p className={styles.cellSub}>The doctor sees this reason on their dashboard so they can fix it.</p>
            <textarea
              className="textarea"
              style={{ marginTop: 12 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. PMDC number not found in the practitioners register."
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.btnSm} onClick={() => setRejecting(null)}>
                Keep as is
              </button>
              <button
                className={`${styles.btnSm} ${styles.btnBad}`}
                disabled={!note.trim() || busy === rejecting.id}
                onClick={() => act(rejecting, 'rejected', note)}
              >
                Reject doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
