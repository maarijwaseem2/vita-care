'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, AdminUser } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Badge, Pager, Tabs, fmtDate, useDebounced } from '@/components/admin/ui';
import styles from '@/components/admin/admin.module.css';

type Role = 'all' | 'patient' | 'doctor' | 'nurse' | 'admin';

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [role, setRole] = useState<Role>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminUser> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    adminApi.users({ role, search: q || undefined, page }).then(setData).catch((e) => setError(getErrorMessage(e)));
  }, [role, q, page]);
  useEffect(load, [load]);
  useEffect(() => setPage(1), [role, q]);

  const toggle = async (u: AdminUser) => {
    if (u.isActive && !window.confirm(`Suspend ${u.name}? They will be signed out and cannot sign in.`)) return;
    setBusy(u.id);
    try {
      await adminApi.setActive(u.id, !u.isActive);
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
          <h1>Users</h1>
          <p>All patient, doctor and admin accounts. Suspending an account blocks sign-in immediately.</p>
        </div>
      </div>
      <div className={styles.toolbar}>
        <Tabs<Role>
          value={role}
          onChange={setRole}
          options={[
            { value: 'all', label: 'All' },
            { value: 'patient', label: 'Patients' },
            { value: 'doctor', label: 'Doctors' },
            { value: 'nurse', label: 'Nurses' },
            { value: 'admin', label: 'Admins' },
          ]}
        />
        <label className={styles.search}>
          <span className="sr-only">Search users</span>
          <input className="input" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>City</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ textAlign: 'end' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.cellMain}>{u.name}</div>
                    <div className={styles.cellSub}>{u.email}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                  <td>{u.city ?? '—'}</td>
                  <td className={styles.cellSub}>{fmtDate(u.createdAt)}</td>
                  <td>{u.isActive ? <Badge kind="active">Active</Badge> : <Badge kind="suspended">Suspended</Badge>}</td>
                  <td>
                    <div className={styles.actions}>
                      {u.id !== me?.id && (
                        <button className={`${styles.btnSm} ${u.isActive ? styles.btnBad : ''}`} disabled={busy === u.id} onClick={() => toggle(u)}>
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.items.length === 0 && <p className={styles.empty}>No users match.</p>}
        {data && data.total > 0 && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}
