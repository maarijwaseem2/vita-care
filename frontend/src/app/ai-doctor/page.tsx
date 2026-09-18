'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Send, Sparkles, AlertTriangle, Info, User } from 'lucide-react';
import DoctorCard from '@/components/doctors/DoctorCard';
import { chatbotApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage, ConsultResult, Doctor, Urgency } from '@/lib/types';
import styles from './ai.module.css';

const STARTERS = [
  'I have a headache and feel dizzy since morning',
  'Chest pain when I climb stairs',
  'Persistent cough and sore throat for a week',
  'Joint pain and stiffness in my knees',
];

const URGENCY_META: Record<
  Urgency,
  { label: string; cls: string; icon: typeof Info }
> = {
  routine: { label: 'Routine', cls: 'badge-green', icon: Info },
  soon: { label: 'See a doctor soon', cls: 'badge-amber', icon: Info },
  emergency: {
    label: 'Seek urgent care',
    cls: 'badge-red',
    icon: AlertTriangle,
  },
};

export default function AiDoctorPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultResult | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, result]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content },
    ];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const patientContext =
        user?.role === 'patient' ? `Patient name: ${user.name}` : undefined;
      const res = await chatbotApi.consult(nextMessages, patientContext);
      setResult(res);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply },
      ]);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (/AI_API_KEY|not configured|unavailable/i.test(msg)) {
        setNotConfigured(true);
      } else {
        setError(msg);
      }
      // Roll back the unanswered user message so they can retry cleanly.
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  };

  const recommended: Doctor[] = result?.recommendedDoctors ?? [];
  const started = messages.length > 0;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.headArea}>
          <span className={styles.pill}>
            <Sparkles size={14} /> AI Symptom Checker
          </span>
          <h1>Talk to the AI Doctor</h1>
          <p>
            Describe your symptoms in plain language. The assistant will suggest
            the right kind of specialist and point you to real doctors you can
            book. This is guidance, not a diagnosis.
          </p>
        </div>

        {notConfigured && (
          <div className={styles.notice}>
            <Info size={20} />
            <div>
              <strong>The AI Doctor isn&apos;t switched on yet.</strong>
              <p>
                This demo ships without an AI key. Add your provider key to{' '}
                <code>AI_API_KEY</code> in the backend <code>.env</code> file to
                enable live symptom analysis. In the meantime, you can still{' '}
                <Link href="/doctors">browse doctors by specialty</Link>.
              </p>
            </div>
          </div>
        )}

        <div className={styles.layout}>
          {/* Chat column */}
          <div className={`card ${styles.chat}`}>
            <div className={styles.messages}>
              {!started && !notConfigured && (
                <div className={styles.welcome}>
                  <div className={styles.botAvatar}>
                    <Bot size={26} />
                  </div>
                  <h3>How are you feeling today?</h3>
                  <p>Pick a common concern to start, or type your own below.</p>
                  <div className={styles.starters}>
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        className={styles.starter}
                        onClick={() => send(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.row} ${
                    m.role === 'user' ? styles.rowUser : styles.rowBot
                  }`}
                >
                  <div className={styles.avatar}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={styles.bubble}>{m.content}</div>
                </div>
              ))}

              {loading && (
                <div className={`${styles.row} ${styles.rowBot}`}>
                  <div className={styles.avatar}>
                    <Bot size={16} />
                  </div>
                  <div className={`${styles.bubble} ${styles.typing}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && <div className="form-error" style={{ margin: '0 16px' }}>{error}</div>}

            <form
              className={styles.inputBar}
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                id="symptomInput"
                name="symptomInput"
                className="input"
                placeholder="Describe your symptoms…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
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
          </div>

          {/* Recommendations column */}
          <aside className={styles.side}>
            {result && (
              <div className={`card card-pad ${styles.assessment}`}>
                <h3>Assessment</h3>
                {(() => {
                  const meta = URGENCY_META[result.urgency];
                  const Icon = meta.icon;
                  return (
                    <span className={`badge ${meta.cls} ${styles.urgency}`}>
                      <Icon size={13} /> {meta.label}
                    </span>
                  );
                })()}
                {result.recommendedSpecialty && (
                  <div className={styles.specRow}>
                    <span>Suggested specialty</span>
                    <strong>{result.recommendedSpecialty}</strong>
                  </div>
                )}
                <p className={styles.disclaimer}>{result.disclaimer}</p>
              </div>
            )}

            {recommended.length > 0 && (
              <div className={styles.recos}>
                <h3 className={styles.recosTitle}>Recommended doctors</h3>
                <div className={styles.recoList}>
                  {recommended.map((d) => (
                    <DoctorCard key={d.id} doctor={d} />
                  ))}
                </div>
              </div>
            )}

            {!result && !notConfigured && (
              <div className={`card card-pad ${styles.hint}`}>
                <Sparkles size={20} />
                <p>
                  Once you describe your symptoms, matching specialists will
                  appear here, ready to book.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
