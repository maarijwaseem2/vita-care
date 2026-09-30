'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import type { BlogPost, Paged } from '@/lib/types';
import { Badge, Pager, Tabs, fmtDate, useDebounced } from '@/components/admin/ui';
import styles from '@/components/admin/admin.module.css';

type St = 'all' | 'published' | 'draft';

export default function BlogAdmin() {
  const [status, setStatus] = useState<St>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<BlogPost> | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.blogList({ status, search: q || undefined, page }).then(setData).catch((e) => setError(getErrorMessage(e)));
  }, [status, q, page]);
  useEffect(load, [load]);
  useEffect(() => setPage(1), [status, q]);

  const remove = async (p: BlogPost) => {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    try {
      await adminApi.blogDelete(p.id, p.slug);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Blog</h1>
          <p>Health articles on the public site. Published posts appear at /blog, nine per page.</p>
        </div>
        <Link href="/admin/blog/new" className="btn">
          <Plus size={17} /> New article
        </Link>
      </div>
      <div className={styles.toolbar}>
        <Tabs<St>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Drafts' },
          ]}
        />
        <label className={styles.search}>
          <span className="sr-only">Search articles</span>
          <input className="input" placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Article</th>
                <th>Category</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ textAlign: 'end' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(p.imageUrl)} alt="" width={64} height={40} style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      <div>
                        <div className={styles.cellMain}>{p.title}</div>
                        <div className={styles.cellSub}>/blog/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category ?? '—'}</td>
                  <td><Badge kind={p.status ?? 'draft'}>{p.status}</Badge></td>
                  <td className={styles.cellSub}>{fmtDate(p.updatedAt ?? p.publishedAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      {p.status === 'published' && (
                        <Link className={styles.btnSm} href={`/blog/${p.slug}`} target="_blank" aria-label={`View ${p.title}`}>
                          <ExternalLink size={15} />
                        </Link>
                      )}
                      <Link className={styles.btnSm} href={`/admin/blog/${p.id}`}>
                        <Pencil size={15} /> Edit
                      </Link>
                      <button className={`${styles.btnSm} ${styles.btnBad}`} onClick={() => remove(p)} aria-label={`Delete ${p.title}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.items.length === 0 && <p className={styles.empty}>No articles yet. Start with “New article”.</p>}
        {data && data.total > 0 && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}
