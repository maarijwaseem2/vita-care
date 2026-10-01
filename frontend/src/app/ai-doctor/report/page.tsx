'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ImageUp, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import { chatbotApi, getErrorMessage } from '@/lib/api';
import type { ChatLanguage, ReportResult } from '@/lib/types';
import styles from './report.module.css';

const LANGS: { value: ChatLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'roman-ur', label: 'Roman Urdu' },
  { value: 'ur', label: 'اردو' },
];

const STATUS_LABEL: Record<string, string> = {
  low: 'Low',
  high: 'High',
  normal: 'Normal',
  unclear: '—',
};

/**
 * Shrink a phone photo to at most 1600px on the long side as JPEG.
 * Keeps uploads well under the API limit and makes the vision model faster.
 */
async function toCompressedBase64(file: File): Promise<{ base64: string; mime: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file is not an image we can read.'));
      el.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { base64: dataUrl.split(',')[1], mime: 'image/jpeg', preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<ChatLanguage>('en');
  const [preview, setPreview] = useState('');
  const [image, setImage] = useState<{ base64: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);

  const pick = async (file?: File | null) => {
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const { base64, mime, preview } = await toCompressedBase64(file);
      setImage({ base64, mime });
      setPreview(preview);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const explain = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    try {
      setResult(await chatbotApi.report({ imageBase64: image.base64, mimeType: image.mime, language: lang }));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setPreview('');
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const rtl = lang === 'ur';

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/ai-doctor" className={styles.back}>
          <ArrowLeft size={16} /> Back to AI Doctor
        </Link>

        <div className={styles.head}>
          <h1>Understand your lab report</h1>
          <p>
            Take a clear photo of a blood test, urine test or prescription. The AI reads it and
            explains each value in plain language, then suggests which doctor to see.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={`card card-pad ${styles.upload}`}>
            <div className={styles.langRow} role="radiogroup" aria-label="Explanation language">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={lang === l.value}
                  className={`${styles.langBtn} ${lang === l.value ? styles.langActive : ''}`}
                  onClick={() => setLang(l.value)}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {!preview ? (
              <label
                className={styles.drop}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pick(e.dataTransfer.files?.[0]);
                }}
              >
                <ImageUp size={34} />
                <strong>Choose a photo or drop it here</strong>
                <span>JPG, PNG or WEBP — pick from your gallery or files.</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => pick(e.target.files?.[0])}
                  hidden
                />
              </label>
            ) : (
              <div className={styles.previewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your report" className={styles.preview} />
                <div className={styles.previewActions}>
                  <button className="btn btn-block" onClick={explain} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 size={18} className={styles.spin} /> Reading your report…
                      </>
                    ) : (
                      <>
                        <FileText size={18} /> Explain this report
                      </>
                    )}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={reset} disabled={loading}>
                    <RotateCcw size={15} /> Use a different photo
                  </button>
                </div>
              </div>
            )}

            {error && <div className="form-error mt-2">{error}</div>}
            <p className={styles.privacy}>
              The photo is sent to the AI only to read it and is not stored on Vita Care.
            </p>
          </div>

          <div className={styles.results} dir={rtl ? 'rtl' : 'ltr'}>
            {!result && !loading && (
              <div className={`card card-pad ${styles.empty}`}>
                <FileText size={22} />
                <p>Your explanation will appear here.</p>
              </div>
            )}

            {result && (
              <>
                {result.urgency !== 'routine' && (
                  <div className={result.urgency === 'emergency' ? styles.alertRed : styles.alertAmber}>
                    <AlertTriangle size={18} />
                    <span>
                      {result.urgency === 'emergency'
                        ? 'Some values may need urgent attention. Contact a doctor today or call 1122.'
                        : 'Some values are outside the normal range. Book a doctor visit soon.'}
                    </span>
                  </div>
                )}

                <div className="card card-pad">
                  <h2 className={styles.h2}>{result.readable ? 'What your report says' : 'We could not read this'}</h2>
                  <p className={styles.summary}>{result.summary}</p>
                </div>

                {result.findings.length > 0 && (
                  <div className={`card ${styles.tableCard}`}>
                    <div className={styles.tableScroll}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Your value</th>
                            <th>Normal range</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.findings.map((f, i) => (
                            <tr key={i}>
                              <td>
                                <strong dir="ltr">{f.name}</strong>
                                <span className={styles.explain}>{f.explanation}</span>
                              </td>
                              <td dir="ltr">{f.value || '—'}</td>
                              <td dir="ltr">{f.referenceRange || '—'}</td>
                              <td>
                                <span className={`${styles.status} ${styles[`st_${f.status}`]}`}>
                                  {STATUS_LABEL[f.status]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.possibleConditions?.length > 0 && (
                  <div className="card card-pad">
                    <h2 className={styles.h2}>What this pattern may point to</h2>
                    <ul className={styles.list}>
                      {result.possibleConditions.map((c) => (
                        <li key={c.name}>
                          <strong dir="ltr">{c.name}</strong> <em className={styles.explain} style={{ display: 'inline' }}>({c.likelihood})</em>
                          <span className={styles.explain}>{c.why}</span>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.explain} style={{ marginTop: 8 }}>
                      These are possibilities for your doctor to confirm, not a diagnosis.
                    </p>
                  </div>
                )}

                {result.questionsForDoctor.length > 0 && (
                  <div className="card card-pad">
                    <h2 className={styles.h2}>Questions to ask your doctor</h2>
                    <ul className={styles.list}>
                      {result.questionsForDoctor.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.recommendedDoctors.length > 0 && (
                  <div dir="ltr">
                    <h2 className={styles.h2}>
                      Suggested: {result.recommendedSpecialty}
                    </h2>
                    {result.sessionToken && (
                      <p className={styles.explain} style={{ marginBottom: 12 }}>
                        When you book from here, this report explanation is shared with the doctor.
                      </p>
                    )}
                    <div className={styles.doctors}>
                      {result.recommendedDoctors.map((d) => (
                        <DoctorCard
                          key={d.id}
                          doctor={d}
                          bookHref={result.sessionToken ? `/appointments/${d.id}?triage=${result.sessionToken}` : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p className={styles.disclaimer} dir="ltr">{result.disclaimer}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
