'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  HeartPulse,
  Pill,
  History,
  CheckCircle2,
  XCircle,
  Stethoscope,
} from 'lucide-react';
import { appointmentsApi, getErrorMessage } from '@/lib/api';
import { formatDay } from '@/lib/dates';
import type { Appointment, ClinicalView, Urgency } from '@/lib/types';
import styles from './VisitPanel.module.css';
import HomeNursingSection from './HomeNursingSection';

const URGENCY_TEXT: Record<Urgency, string> = {
  routine: 'Routine',
  soon: 'See soon',
  emergency: 'Emergency signs reported',
};

const LANG_TEXT: Record<string, string> = {
  en: 'English',
  ur: 'Urdu',
  'roman-ur': 'Roman Urdu',
};

/**
 * Side panel a doctor opens for one appointment: the patient's record,
 * medical history, earlier visits and the AI pre-visit summary, plus
 * complete / cancel with private notes.
 */
export default function VisitPanel({
  appointmentId,
  onClose,
  onUpdated,
}: {
  appointmentId: number;
  onClose: () => void;
  onUpdated: (a: Appointment) => void;
}) {
  const [data, setData] = useState<ClinicalView | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<'' | 'completed' | 'cancelled'>('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setData(null);
    setError('');
    appointmentsApi
      .clinical(appointmentId)
      .then((d) => {
        setData(d);
        setNotes(d.appointment.doctorNotes ?? '');
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [appointmentId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const act = async (status: 'completed' | 'cancelled') => {
    setSaving(status);
    setError('');
    try {
      const updated = await appointmentsApi.setStatus(appointmentId, status, notes);
      onUpdated(updated);
      setData((d) => (d ? { ...d, appointment: { ...d.appointment, ...updated } } : d));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving('');
    }
  };

  const appt = data?.appointment;
  const ai = data?.aiSummary;
  const s = ai?.summary;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Patient visit details"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <h2>{data?.patient?.name ?? appt?.patientName ?? 'Loading…'}</h2>
            {appt && (
              <p>
                {formatDay(appt.date, { weekday: 'long', day: 'numeric', month: 'long' })} at {appt.timeSlot}
              </p>
            )}
          </div>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {error && <div className="form-error">{error}</div>}
        {!data && !error && <p className={styles.muted}>Loading patient record…</p>}

        {data && appt && (
          <div className={styles.body}>
            {/* AI pre-visit summary */}
            {ai ? (
              <section className={`${styles.block} ${styles.aiBlock}`}>
                <h3>
                  <Sparkles size={16} /> AI pre-visit summary
                </h3>
                <div className={styles.metaRow}>
                  <span className={`${styles.pill} ${styles[`u_${ai.urgency}`]}`}>
                    {ai.urgency === 'emergency' && <AlertTriangle size={12} />} {URGENCY_TEXT[ai.urgency]}
                  </span>
                  {ai.specialty && <span className={styles.pill}>{ai.specialty}</span>}
                  <span className={styles.pill}>Patient wrote in {LANG_TEXT[ai.language] ?? ai.language}</span>
                  {ai.mode === 'offline' && <span className={styles.pill}>Offline interview</span>}
                </div>

                {ai.redFlags.length > 0 && (
                  <div className={styles.redFlags}>
                    <AlertTriangle size={16} />
                    <span>Safety check flagged: {ai.redFlags.map((f) => f.label).join(', ')}</span>
                  </div>
                )}

                {s ? (
                  <dl className={styles.dl}>
                    <dt>Chief complaint</dt>
                    <dd>{s.chiefComplaint}</dd>
                    {s.duration && (<><dt>Duration</dt><dd>{s.duration}</dd></>)}
                    {s.severity && (<><dt>Severity</dt><dd>{s.severity}</dd></>)}
                    {s.associatedSymptoms.length > 0 && (
                      <><dt>Associated</dt><dd>{s.associatedSymptoms.join(', ')}</dd></>
                    )}
                    {s.relevantHistory && (<><dt>History noted</dt><dd>{s.relevantHistory}</dd></>)}
                  </dl>
                ) : (
                  <p className={styles.muted}>The patient ended the chat before the AI finished its summary.</p>
                )}

                {ai.possibleConditions.length > 0 && (
                  <>
                    <h4>AI&apos;s differential (for your judgement)</h4>
                    <ul className={styles.ddx}>
                      {ai.possibleConditions.map((c) => (
                        <li key={c.name}>
                          <strong>{c.name}</strong> <em>{c.likelihood}</em>
                          <span>{c.why}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {s && s.questionsForDoctor.length > 0 && (
                  <>
                    <h4>The patient wants to ask</h4>
                    <ul className={styles.plain}>
                      {s.questionsForDoctor.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            ) : (
              <section className={styles.block}>
                <h3>
                  <Sparkles size={16} /> AI pre-visit summary
                </h3>
                <p className={styles.muted}>This patient booked without an AI consultation.</p>
              </section>
            )}

            {/* Reason */}
            {appt.reason && (
              <section className={styles.block}>
                <h3>
                  <Stethoscope size={16} /> Reason given at booking
                </h3>
                <p>{appt.reason}</p>
              </section>
            )}

            {/* Record */}
            <section className={styles.block}>
              <h3>
                <HeartPulse size={16} /> Medical record
              </h3>
              {data.patient ? (
                <>
                  <p className={styles.muted}>
                    {[
                      data.patient.age ? `${data.patient.age} yrs` : null,
                      data.patient.gender,
                      data.patient.city,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No basic details'}
                  </p>
                  {data.patient.medicalHistory.length > 0 ? (
                    <ul className={styles.history}>
                      {data.patient.medicalHistory.map((h) => (
                        <li key={h.id}>
                          <strong>{h.condition}</strong>
                          {h.diagnosedAt && <span> since {h.diagnosedAt.slice(0, 4)}</span>}
                          {h.notes && <p>{h.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>No conditions recorded.</p>
                  )}
                  <p className={styles.meds}>
                    <Pill size={15} /> {data.patient.currentMedication || 'No current medicines recorded'}
                  </p>
                </>
              ) : (
                <p className={styles.muted}>Guest booking. Only the name and phone were given.</p>
              )}
            </section>

            {data.previousVisits.length > 0 && (
              <section className={styles.block}>
                <h3>
                  <History size={16} /> Earlier visits on Vita Care
                </h3>
                <ul className={styles.visits}>
                  {data.previousVisits.map((v, i) => (
                    <li key={i}>
                      <strong>{formatDay(v.date, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>{' '}
                      {v.doctor} ({v.specialty})
                      {v.reason && <span>{v.reason}</span>}
                      {v.doctorNotes && <p>{v.doctorNotes}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <HomeNursingSection appointmentId={appt.id} visits={data.homeVisits ?? []} hasAccount={!!data.patient} />

            {/* Actions */}
            <section className={styles.block}>
              <label htmlFor="doctorNotes" className={styles.label}>
                Visit notes (private to doctors)
              </label>
              <textarea
                id="doctorNotes"
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={appt.status !== 'booked'}
                placeholder="Findings, advice, follow-up…"
              />
              {appt.status === 'booked' ? (
                <div className={styles.actions}>
                  <button className="btn" onClick={() => act('completed')} disabled={!!saving}>
                    {saving === 'completed' ? <span className="spinner" /> : <><CheckCircle2 size={16} /> Mark visit complete</>}
                  </button>
                  <button className="btn btn-outline" onClick={() => act('cancelled')} disabled={!!saving}>
                    {saving === 'cancelled' ? <span className="spinner" /> : <><XCircle size={16} /> Cancel appointment</>}
                  </button>
                </div>
              ) : (
                <p className={styles.muted}>This appointment is {appt.status}.</p>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
