'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { adminApi, AdminTriageFull, AdminTriageRow } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { Badge, Pager, Tabs, fmtDate } from '@/components/admin/ui';
import styles from '@/components/admin/admin.module.css';

type Urg = 'emergency' | 'soon' | 'routine' | 'all';
type Rev = 'no' | 'yes' | 'all';
const LANG: Record<string, string> = { en: 'English', ur: 'Urdu', 'roman-ur': 'Roman Urdu' };

export default function SafetyMonitor() {
  const [urgency, setUrgency] = useState<Urg>('emergency');
  const [reviewed, setReviewed] = useState<Rev>('no');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminTriageRow> | null>(null);
  const [open, setOpen] = useState<AdminTriageFull | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminApi.triage({ urgency, reviewed, page }).then(setData).catch((e) => setError(getErrorMessage(e)));
  }, [urgency, reviewed, page]);
  useEffect(load, [load]);
  useEffect(() => setPage(1), [urgency, reviewed]);

  const openRow = async (id: number) => {
    setNote('');
    try {
      setOpen(await adminApi.triageOne(id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const markReviewed = async () => {
    if (!open || !note.trim()) return;
    setSaving(true);
    try {
      await adminApi.review(open.id, note);
      setOpen(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const summary = (open?.summary ?? {}) as Record<string, any>;

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>AI safety monitor</h1>
          <p>
            Every conversation the AI marked as urgent. A clinician should read each emergency, check the AI
            responded correctly, and record a short review note.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <Tabs<Urg>
          value={urgency}
          onChange={setUrgency}
          options={[
            { value: 'emergency', label: 'Emergency' },
            { value: 'soon', label: 'See soon' },
            { value: 'routine', label: 'Routine' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Tabs<Rev>
          value={reviewed}
          onChange={setReviewed}
          options={[
            { value: 'no', label: 'Not reviewed' },
            { value: 'yes', label: 'Reviewed' },
            { value: 'all', label: 'Both' },
          ]}
        />
      </div>
      {error && <div className="form-error">{error}</div>}

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Patient said</th>
                <th>Urgency</th>
                <th>Department</th>
                <th>Engine</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r.id} className={styles.rowClick} onClick={() => openRow(r.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openRow(r.id)}>
                  <td className={styles.cellSub}>{fmtDate(r.createdAt)}</td>
                  <td style={{ maxWidth: 340 }}>
                    <div className={styles.cellMain} dir="auto">{r.firstMessage || '—'}</div>
                    <div className={styles.cellSub}>
                      {LANG[r.language] ?? r.language} · {r.turns} messages{r.source === 'report' ? ' · lab report' : ''}
                    </div>
                  </td>
                  <td>
                    <Badge kind={r.urgency}>{r.urgency}</Badge>
                    {!!r.redFlags?.length && <div className={styles.cellSub}>{r.redFlags.map((f) => f.label).join(', ')}</div>}
                  </td>
                  <td>{r.specialty ?? '—'}</td>
                  <td className={styles.cellSub}>{r.mode === 'offline' ? 'Offline rules' : 'AI'}</td>
                  <td>{r.reviewedAt ? <Badge kind="verified">Reviewed</Badge> : <Badge kind="pending">Open</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.items.length === 0 && <p className={styles.empty}>Nothing to review here.</p>}
        {data && data.total > 0 && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(null)}>
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Consultation details" onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Consultation #{open.id}</h2>
                <p className={styles.cellSub}>
                  {fmtDate(open.createdAt)} · {LANG[open.language] ?? open.language} · {open.mode === 'offline' ? 'offline rules' : 'AI'}
                </p>
              </div>
              <button className={styles.btnSm} onClick={() => setOpen(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <Badge kind={open.urgency}>{open.urgency}</Badge>{' '}
            {open.specialty && <Badge kind="neutral">{open.specialty}</Badge>}
            {!!open.redFlags?.length && (
              <div className={styles.flagBox}>
                <AlertTriangle size={15} style={{ verticalAlign: -2 }} /> {open.redFlags.map((f) => f.label).join(', ')}
              </div>
            )}

            <h3 className={styles.panelTitle} style={{ marginTop: 16 }}>Conversation</h3>
            <div>
              {open.transcript.map((m, i) => (
                <div key={i} dir="auto" className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                  {m.content}
                </div>
              ))}
            </div>

            {summary.chiefComplaint && (
              <>
                <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>AI clinical summary</h3>
                <dl className={styles.kv}>
                  <dt>Chief complaint</dt><dd>{summary.chiefComplaint}</dd>
                  {summary.clinicalReasoning && (<><dt>AI reasoning</dt><dd>{summary.clinicalReasoning}</dd></>)}
                  {summary.contextNotes?.length > 0 && (<><dt>Denied / past</dt><dd>{summary.contextNotes.join('; ')}</dd></>)}
                  {summary.relevantHistory && (<><dt>History</dt><dd>{summary.relevantHistory}</dd></>)}
                </dl>
              </>
            )}

            <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>Review</h3>
            {open.reviewedAt ? (
              <p>
                <CheckCircle2 size={16} style={{ verticalAlign: -3, color: '#1d7a34' }} /> Reviewed {fmtDate(open.reviewedAt)}:{' '}
                {open.reviewNote}
              </p>
            ) : (
              <>
                <textarea
                  className="textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Correctly escalated chest pain; patient advised to call 1122."
                />
                <div className={styles.modalActions}>
                  <button className={`${styles.btnSm} ${styles.btnGood}`} disabled={!note.trim() || saving} onClick={markReviewed}>
                    <CheckCircle2 size={15} /> Mark as reviewed
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
