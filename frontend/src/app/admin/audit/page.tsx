'use client';

import { useEffect, useState } from 'react';
import { adminApi, AuditEntry } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { Pager, fmtDate } from '@/components/admin/ui';
import styles from '@/components/admin/admin.module.css';

const LABEL: Record<string, string> = {
  'doctor.verified': 'Verified a doctor',
  'doctor.rejected': 'Rejected a doctor',
  'doctor.pending': 'Returned a doctor to the queue',
  'clinical.view': 'Doctor opened a patient record',
  'triage.view': 'Opened an AI consultation',
  'triage.review': 'Reviewed an AI consultation',
  'user.suspend': 'Suspended a user',
  'user.activate': 'Reactivated a user',
  'blog.create': 'Created a blog post',
  'blog.update': 'Updated a blog post',
  'blog.delete': 'Deleted a blog post',
  'upload.image': 'Uploaded an image',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AuditEntry> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.audit({ page }).then(setData).catch((e) => setError(getErrorMessage(e)));
  }, [page]);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Audit log</h1>
          <p>Who viewed patient records and what admins changed, newest first. Entries cannot be edited.</p>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>By</th>
                <th>Record</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((a) => (
                <tr key={a.id}>
                  <td className={styles.cellSub}>{fmtDate(a.createdAt)}</td>
                  <td className={styles.cellMain}>{LABEL[a.action] ?? a.action}</td>
                  <td>
                    {a.actorRole ?? 'system'}
                    {a.actorUserId ? <span className={styles.cellSub}> #{a.actorUserId}</span> : null}
                  </td>
                  <td className={styles.mono}>
                    {a.entity} {a.entityId ? `#${a.entityId}` : ''}
                  </td>
                  <td className={styles.cellSub} style={{ maxWidth: 280 }}>
                    {a.meta
                      ? Object.entries(a.meta)
                          .filter(([, v]) => v != null && v !== '')
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' · ')
                      : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.items.length === 0 && <p className={styles.empty}>No activity yet.</p>}
        {data && data.total > 0 && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}
