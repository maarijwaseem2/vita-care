'use client';

import { FormEvent, useState } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone, Send, ShieldAlert } from 'lucide-react';
import { contactApi, getErrorMessage } from '@/lib/api';
import { CONTACT } from '@/lib/contact';
import { cleanPhoneInput, isPkPhone, PHONE_HELP } from '@/lib/phone';
import styles from './contact.module.css';

const TOPICS = ['General question', 'Appointment problem', 'Join as doctor or nurse', 'Technical problem', 'Feedback or complaint', 'Partnership'];

const FAQ = [
  ['Is Vita Care free for patients?', 'Yes. The AI Doctor, booking and report explainer are free for patients. You pay the doctor or nurse their fee.'],
  ['Is the AI Doctor a real doctor?', 'No. It gives first guidance and checks for emergencies, then sends you to a verified doctor. It does not diagnose.'],
  ['How are doctors and nurses verified?', 'Our team checks each PMDC (doctors), AHPC (physiotherapists) or PNC (nurses) registration number before they appear.'],
  ['I did not get the confirmation email', 'Check your spam folder. You can ask for a new link once every 24 hours, or sign in with Google.'],
];

export default function ContactPage() {
  const [f, setF] = useState({ name: '', email: '', phone: '', topic: TOPICS[0], message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (f.phone && !isPkPhone(f.phone)) return setError(PHONE_HELP);
    setBusy(true);
    try {
      const r = await contactApi.send({ ...f, phone: f.phone || undefined });
      setDone(r.message);
      setF({ name: '', email: '', phone: '', topic: TOPICS[0], message: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <h1>Contact us</h1>
          <p>Questions, problems with a booking, or want to join as a doctor or nurse? We usually reply within one working day.</p>
        </div>
      </section>

      <div className={`container ${styles.grid}`}>
        <div className={styles.ways}>
          <a className={styles.way} href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={22} /><span><strong>WhatsApp</strong>{CONTACT.phoneDisplay}</span>
          </a>
          <a className={styles.way} href={`tel:${CONTACT.phoneTel}`}>
            <Phone size={22} /><span><strong>Call us</strong>{CONTACT.phoneDisplay}</span>
          </a>
          <a className={styles.way} href={`mailto:${CONTACT.email}`}>
            <Mail size={22} /><span><strong>Email</strong>{CONTACT.email}</span>
          </a>
          <div className={styles.way}>
            <Clock size={22} /><span><strong>Hours</strong>{CONTACT.hours}</span>
          </div>
          <div className={styles.way}>
            <MapPin size={22} /><span><strong>Based in</strong>{CONTACT.city}</span>
          </div>
          <div className={styles.emergency}>
            <ShieldAlert size={20} />
            <span>
              <strong>Medical emergency?</strong> Do not message us. Call <a href="tel:1122">Rescue 1122</a> or <a href="tel:115">Edhi 115</a> now.
            </span>
          </div>
        </div>

        <form className={`card card-pad ${styles.form}`} onSubmit={submit}>
          <h2>Send us a message</h2>
          {done && <div className={styles.ok} role="status">{done}</div>}
          <div className="field-row">
            <div className="field">
              <label htmlFor="c-name">Your name</label>
              <input id="c-name" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required minLength={2} maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="c-phone">Phone <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <input id="c-phone" className="input" inputMode="tel" placeholder="03001234567" value={f.phone} onChange={(e) => set('phone', cleanPhoneInput(e.target.value))} />
              {f.phone && !isPkPhone(f.phone) && <span className="field-error">{PHONE_HELP}</span>}
            </div>
            <div className="field">
              <label htmlFor="c-topic">Topic</label>
              <select id="c-topic" className="select" value={f.topic} onChange={(e) => set('topic', e.target.value)}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-msg">Message</label>
            <textarea id="c-msg" className="textarea" rows={5} value={f.message} onChange={(e) => set('message', e.target.value)} required minLength={10} maxLength={3000} />
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-lg" disabled={busy}>{busy ? <span className="spinner" /> : <><Send size={18} /> Send message</>}</button>
        </form>
      </div>

      <section className={`container ${styles.faq}`}>
        <h2>Common questions</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className={styles.qa}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
