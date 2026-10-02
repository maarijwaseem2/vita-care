'use client';

import PatientOnly from '@/components/auth/PatientOnly';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  FileText,
  Mic,
  MicOff,
  Phone,
  Pill,
  RotateCcw,
  Send,
  ShieldCheck,
  User,
  Volume2,
  WifiOff,
} from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import AiLoginGate from '@/components/ai/AiLoginGate';
import VerifyEmailGate from '@/components/ai/VerifyEmailGate';
import Loader from '@/components/ui/Loader';
import { chatbotApi, getErrorMessage, voiceApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AiStatus, ChatLanguage, ChatMessage, ConsultResult, Urgency } from '@/lib/types';
import styles from './ai.module.css';

type LangChoice = 'auto' | ChatLanguage;

const LANG_OPTIONS: { value: LangChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
  { value: 'roman-ur', label: 'Roman Urdu' },
];

const STARTERS: Record<ChatLanguage, string[]> = {
  en: [
    'I have had a headache and dizziness since this morning',
    'Chest pain when I climb stairs',
    'My child has a fever and a rash',
    'Itchy red patches on my arms for two weeks',
  ],
  'roman-ur': [
    'Mujhe 3 din se bukhar aur gale mein dard hai',
    'Raat ko neend nahi aati aur ghabrahat hoti hai',
    'Ghutnon mein dard, seedhiyan charhne mein mushkil',
    'Kaan mein dard aur sunai kam de raha hai',
  ],
  ur: [
    'مجھے دو دن سے سر میں درد ہے',
    'بچے کو بخار اور کھانسی ہے',
    'کمر میں درد ہے جو ٹانگ تک جاتا ہے',
    'جلد پر خارش اور دانے ہیں',
  ],
};

const URGENCY_META: Record<Urgency, { label: string; cls: string }> = {
  routine: { label: 'Not urgent', cls: styles.urgRoutine },
  soon: { label: 'See a doctor soon', cls: styles.urgSoon },
  emergency: { label: 'Emergency', cls: styles.urgEmergency },
};

const SPEECH_LANG: Record<ChatLanguage, string> = {
  en: 'en-US',
  ur: 'ur-PK',
  'roman-ur': 'ur-PK',
};

const hasUrdu = (t: string) => /[\u0600-\u06FF]/.test(t);
const urAttr = (t: string) => (hasUrdu(t) ? 'ur' : undefined);

export default function AiDoctorPage() {
  const { user, loading: authLoading, refreshVerification } = useAuth();
  const [usageLeft, setUsageLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [lang, setLang] = useState<LangChoice>('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultResult | null>(null);
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  // Server voice (OpenAI audio): records audio and sends it for Urdu/English transcription,
  // and reads replies with a real Urdu voice. Falls back to browser speech when off.
  const [serverVoice, setServerVoice] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceTurnRef = useRef(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const effectiveLang: ChatLanguage = lang === 'auto' ? result?.language ?? 'en' : lang;

  useEffect(() => {
    if (!user) return;
    chatbotApi
      .usage()
      .then((u) => setUsageLeft(u.message.remaining))
      .catch(() => setUsageLeft(null));
  }, [user]);

  useEffect(() => {
    chatbotApi.status().then(setStatus).catch(() => setStatus(null));
    const w = window as any;
    const browserStt = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window;
    setVoiceSupported(browserStt || canRecord);
    voiceApi
      .status()
      .then((v) => {
        setServerVoice(v.serverVoice && canRecord);
        if (v.serverVoice && canRecord) setVoiceSupported(true);
      })
      .catch(() => setServerVoice(false));
  }, []);

  // Scroll only the chat pane, never the whole page.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      const next: ChatMessage[] = [...messages, { role: 'user', content }];
      setMessages(next);
      setInput('');
      setError('');
      setLoading(true);
      try {
        const res = await chatbotApi.consult(next, {
          language: lang === 'auto' ? undefined : lang,
          sessionToken,
        });
        setResult(res);
        setSessionToken(res.sessionToken);
        if (res.usage && res.usage.remaining != null) setUsageLeft(res.usage.remaining);
        setMessages((prev) => {
          const out: ChatMessage[] = [...prev, { role: 'assistant', content: res.reply }];
          // Spoken question → spoken answer, so the whole turn can happen by voice.
          if (voiceTurnRef.current) {
            voiceTurnRef.current = false;
            setTimeout(() => speakRef.current?.(res.reply, out.length - 1, res.language), 50);
          }
          return out;
        });
      } catch (err) {
        setError(getErrorMessage(err));
        if (/confirm your email/i.test(getErrorMessage(err))) refreshVerification().catch(() => undefined);
        setMessages((prev) => prev.slice(0, -1));
        setInput(content);
      } finally {
        setLoading(false);
      }
    },
    [lang, loading, messages, sessionToken],
  );

  const reset = () => {
    setMessages([]);
    setResult(null);
    setSessionToken(undefined);
    setError('');
    setInput('');
    stopAudio();
  };

  /** Record with MediaRecorder and transcribe on the server (Urdu-capable). */
  const toggleServerVoice = async () => {
    if (listening) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) =>
        MediaRecorder.isTypeSupported?.(m),
      );
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setListening(false);
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1500) return setError('That was too short. Hold the mic and speak for a second or two.');
        setTranscribing(true);
        try {
          const text = await voiceApi.transcribe(blob, effectiveLang);
          voiceTurnRef.current = true;
          await send(text);
        } catch (err) {
          setError(getErrorMessage(err));
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setListening(true);
      // Safety stop after 45 seconds.
      setTimeout(() => rec.state === 'recording' && rec.stop(), 45_000);
    } catch {
      setError('Microphone access was blocked. Allow the microphone in your browser settings, or type instead.');
    }
  };

  /** Browser speech recognition fallback (Chrome). */
  const toggleBrowserVoice = () => {
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Rec();
    rec.lang = SPEECH_LANG[effectiveLang];
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<any>)
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const toggleVoice = () => (serverVoice ? toggleServerVoice() : toggleBrowserVoice());

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeakingIdx(null);
  };

  const speak = async (text: string, idx?: number, language?: ChatLanguage) => {
    if (idx !== undefined && speakingIdx === idx) return stopAudio();
    stopAudio();
    const langForVoice: ChatLanguage = language ?? (hasUrdu(text) ? 'ur' : effectiveLang);
    if (serverVoice) {
      setSpeakingIdx(idx ?? -1);
      try {
        const blob = await voiceApi.speak(text, langForVoice);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeakingIdx(null);
        };
        await audio.play();
        return;
      } catch {
        setSpeakingIdx(null);
        // fall through to browser speech
      }
    }
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = hasUrdu(text) ? 'ur-PK' : 'en-US';
    const voice = synth.getVoices().find((v) => v.lang.startsWith(u.lang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.onend = () => setSpeakingIdx(null);
    setSpeakingIdx(idx ?? -1);
    synth.speak(u);
  };
  const speakRef = useRef<typeof speak>();
  speakRef.current = speak;

  const started = messages.length > 0;
  const lastIsBot = messages[messages.length - 1]?.role === 'assistant';
  const emergency = result?.urgency === 'emergency' ? result.emergency : null;
  const bookHref = (doctorId: number) =>
    `/appointments/${doctorId}${sessionToken ? `?triage=${sessionToken}` : ''}`;

  // The AI needs an account: fair daily use per person, and no wasted tokens.
  if (authLoading) return <Loader label="Loading…" />;
  if (!user) return <AiLoginGate redirect="/ai-doctor" title="Sign in to talk to the AI Doctor" />;
  if (user.emailVerified === false && user.role !== 'admin') return <VerifyEmailGate />;

  if (user.role === 'doctor' || user.role === 'nurse') return <PatientOnly role={user!.role} what="The AI Doctor" />;
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <div>
            <h1>AI Doctor</h1>
            <p>
              Describe what you feel. It asks a few questions, checks for
              emergencies, and tells you which doctor to see. It does not
              replace a doctor.
            </p>
          </div>
          <div className={styles.headSide}>
            {/* Only the fallback is flagged; the AI provider and model are not shown to patients. */}
            {status && !status.aiEnabled && (
              <span
                className={styles.engineOff}
                title="No AI key on the server. A rule-based interviewer is answering."
              >
                <WifiOff size={14} /> Offline mode (rule-based)
              </span>
            )}
            <div className={styles.langSwitch} role="radiogroup" aria-label="Reply language">
              {LANG_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={lang === o.value}
                  className={lang === o.value ? styles.langActive : ''}
                  onClick={() => setLang(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {emergency && (
          <div className={styles.emergency} role="alert">
            <AlertTriangle size={28} />
            <div className={styles.emergencyText}>
              <strong lang={urAttr(emergency.headline)}>{emergency.headline}</strong>
              {result && result.redFlags.length > 0 && (
                <span>Detected: {result.redFlags.map((f) => f.label).join(', ')}</span>
              )}
            </div>
            <div className={styles.emergencyCalls}>
              {emergency.contacts.map((c) => (
                <a key={c.number} href={`tel:${c.number}`} className={styles.callBtn}>
                  <Phone size={16} /> {c.name}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={styles.layout}>
          <section className={`card ${styles.chat}`} aria-label="Conversation">
            <div className={styles.messages} ref={messagesRef} aria-live="polite">
              {!started && (
                <div className={styles.welcome}>
                  <div className={styles.botAvatar}>
                    <Bot size={26} />
                  </div>
                  <h2>How are you feeling today?</h2>
                  <p>Type, or tap the microphone and speak. Or start with one of these:</p>
                  <div className={styles.starters}>
                    {STARTERS[lang === 'auto' ? 'en' : lang].map((s) => (
                      <button key={s} className={styles.starter} onClick={() => send(s)} lang={urAttr(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {user?.role === 'patient' ? (
                    <p className={styles.recordNote}>
                      <ShieldCheck size={15} /> Your medical history and medicines will be
                      taken into account.
                    </p>
                  ) : (
                    <p className={styles.recordNote}>
                      <Link href="/login?redirect=/ai-doctor">Sign in</Link> so the AI can
                      consider your medical history.
                    </p>
                  )}
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.row} ${m.role === 'user' ? styles.rowUser : styles.rowBot}`}
                >
                  <div className={styles.avatar}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={styles.bubble}>
                    <span lang={urAttr(m.content)}>{m.content}</span>
                    {m.role === 'assistant' && (
                      <button
                        className={styles.speak}
                        onClick={() => speak(m.content, i)}
                        aria-label={speakingIdx === i ? 'Stop reading' : 'Read this reply aloud'}
                        title={speakingIdx === i ? 'Stop' : serverVoice ? 'Read aloud (Urdu voice)' : 'Read aloud'}
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {lastIsBot && !loading && result && result.quickReplies.length > 0 && (
                <div className={styles.chips}>
                  {result.quickReplies.map((q) => (
                    <button key={q} onClick={() => send(q)} lang={urAttr(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className={`${styles.row} ${styles.rowBot}`}>
                  <div className={styles.avatar}>
                    <Bot size={16} />
                  </div>
                  <div className={`${styles.bubble} ${styles.typing}`} aria-label="AI is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            {error && <div className={`form-error ${styles.error}`}>{error}</div>}
            {usageLeft != null && (
              <p className={styles.usageNote}>
                {usageLeft > 0 ? `${usageLeft} AI messages left today` : 'No AI messages left today. The limit resets at midnight.'}
              </p>
            )}

            <form
              className={styles.inputBar}
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              {started && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={reset}
                  title="Start a new consultation"
                  aria-label="Start a new consultation"
                >
                  <RotateCcw size={18} />
                </button>
              )}
              <input
                id="symptomInput"
                name="symptomInput"
                className="input"
                placeholder={listening ? 'Listening… tap the mic again to send' : transcribing ? 'Understanding what you said…' : 'Describe your symptoms…'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                maxLength={2000}
                dir="auto"
                autoComplete="off"
              />
              {voiceSupported && (
                <button
                  type="button"
                  className={`${styles.iconBtn} ${listening ? styles.micOn : ''}`}
                  onClick={toggleVoice}
                  disabled={transcribing || loading}
                  aria-label={listening ? 'Stop listening' : 'Speak your symptoms'}
                  title={listening ? 'Stop' : `Speak (${effectiveLang === 'en' ? 'English' : 'Urdu'})`}
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              <button
                id="sendMessage"
                type="submit"
                className="btn"
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </form>
          </section>

          <aside className={styles.side}>
            {!result && (
              <div className={`card card-pad ${styles.hint}`}>
                <ClipboardList size={22} />
                <p>
                  Your assessment appears here: how urgent it is, possible causes, and
                  real doctors you can book.
                </p>
                <Link href="/ai-doctor/report" className={styles.reportLink}>
                  <FileText size={16} /> Or upload a lab report to have it explained
                </Link>
              </div>
            )}

            {result && (
              <div className={`card card-pad ${styles.assessment}`}>
                <div className={styles.assessHead}>
                  <h2>Assessment</h2>
                  <span className={`${styles.urgency} ${URGENCY_META[result.urgency].cls}`}>
                    {URGENCY_META[result.urgency].label}
                  </span>
                </div>

                {result.stage === 'interviewing' && result.urgency !== 'emergency' && (
                  <p className={styles.muted}>Answer a few more questions for a full assessment.</p>
                )}

                {result.recommendedSpecialty && (
                  <div className={styles.specRow}>
                    <span>Department</span>
                    <strong>{result.recommendedSpecialty}</strong>
                  </div>
                )}

                {result.possibleConditions.length > 0 && (
                  <div className={styles.block}>
                    <h3>Possible causes</h3>
                    <ul className={styles.conditions}>
                      {result.possibleConditions.map((c) => (
                        <li key={c.name}>
                          <div>
                            <strong lang={urAttr(c.name)}>{c.name}</strong>
                            <span className={styles.likelihood}>{c.likelihood}</span>
                          </div>
                          {c.why && <p lang={urAttr(c.why)}>{c.why}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.selfCare.length > 0 && (
                  <div className={styles.block}>
                    <h3>Until you see the doctor</h3>
                    <ul className={styles.list}>
                      {result.selfCare.map((s) => (
                        <li key={s} lang={urAttr(s)}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.medicines && result.medicines.length > 0 && (
                  <div className={`${styles.block} ${styles.meds}`}>
                    <h3>
                      <Pill size={16} /> Medicines you can take
                    </h3>
                    <p className={styles.medsNote}>
                      Over-the-counter, adult doses (12+ years). Ask the pharmacist to confirm, and
                      see a doctor if you are not better in 2–3 days.
                    </p>
                    <ul className={styles.medList}>
                      {result.medicines.map((m) => (
                        <li key={m.id}>
                          <div className={styles.medHead}>
                            <strong>{m.name}</strong>
                            {m.examples.length > 0 && <span>e.g. {m.examples.join(', ')}</span>}
                          </div>
                          <p className={styles.medWhy} lang={urAttr(m.reason)}>{m.reason}</p>
                          <p><b>Dose:</b> {m.adultDose}</p>
                          <p><b>Maximum:</b> {m.maxDose}</p>
                          {m.cautions.length > 0 && <p className={styles.medCaution}>{m.cautions.join('. ')}.</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.medicineNote && (
                  <div className={styles.block}>
                    <p className={styles.medsNote}>
                      <Pill size={14} /> {result.medicineNote}
                    </p>
                  </div>
                )}

                {result.redFlagsToWatch.length > 0 && (
                  <div className={`${styles.block} ${styles.watch}`}>
                    <h3>Go to emergency if</h3>
                    <ul className={styles.list}>
                      {result.redFlagsToWatch.map((s) => (
                        <li key={s} lang={urAttr(s)}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.summary && (
                  <details className={styles.summary}>
                    <summary>Summary your doctor will receive</summary>
                    <dl>
                      <dt>Main problem</dt>
                      <dd>{result.summary.chiefComplaint}</dd>
                      {result.summary.duration && (
                        <>
                          <dt>Duration</dt>
                          <dd>{result.summary.duration}</dd>
                        </>
                      )}
                      {result.summary.severity && (
                        <>
                          <dt>Severity</dt>
                          <dd>{result.summary.severity}</dd>
                        </>
                      )}
                      {result.summary.associatedSymptoms.length > 0 && (
                        <>
                          <dt>Other symptoms</dt>
                          <dd>{result.summary.associatedSymptoms.join(', ')}</dd>
                        </>
                      )}
                      {result.summary.relevantHistory && (
                        <>
                          <dt>History</dt>
                          <dd>{result.summary.relevantHistory}</dd>
                        </>
                      )}
                    </dl>
                  </details>
                )}

                <p className={styles.disclaimer}>
                  {result.usedMedicalRecord && (
                    <span className={styles.recordUsed}>
                      <ShieldCheck size={13} /> Used your medical record.{' '}
                    </span>
                  )}
                  {result.disclaimer}
                </p>
              </div>
            )}

            {result && result.recommendedDoctors.length > 0 && (
              <div className={styles.recos}>
                <h2 className={styles.recosTitle}>Book with your summary attached</h2>
                <div className={styles.recoList}>
                  {result.recommendedDoctors.map((d) => (
                    <DoctorCard key={d.id} doctor={d} bookHref={bookHref(d.id)} compact />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
