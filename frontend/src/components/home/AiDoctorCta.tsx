import Link from 'next/link';
import { ArrowRight, FileText, Mic, ShieldAlert } from 'lucide-react';
import styles from './home.module.css';

const STEPS = [
  {
    title: 'Describe it your way',
    text: 'Type or speak in English, Urdu or Roman Urdu.',
  },
  {
    title: 'The AI asks, like a doctor would',
    text: 'One question at a time, with tap-to-answer options. Emergency signs are caught by a separate safety check.',
  },
  {
    title: 'See the right department',
    text: 'Possible causes in plain words, and real doctors near you, ready to book.',
  },
  {
    title: 'Your doctor gets the summary',
    text: 'Symptoms, history and medicines arrive with the booking, so the visit starts informed.',
  },
];

export default function AiDoctorCta() {
  return (
    <section className="section-tight" id="how-ai-works">
      <div className="container">
        <div className={styles.aiCta}>
          <div>
            <h2>An AI that interviews you before the doctor does</h2>
            <p>
              Most people describe symptoms incompletely. The Vita Care AI Doctor,
              built on Alibaba Cloud Qwen, asks the follow-up questions for you and
              hands a real doctor a clear summary.
            </p>
            <ol className={styles.steps}>
              {STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
            <div className={styles.ctaRow}>
              <Link href="/ai-doctor" className="btn btn-lg btn-accent">
                Start a symptom check <ArrowRight size={18} />
              </Link>
              <Link href="/ai-doctor/report" className={styles.ctaLink}>
                <FileText size={17} /> Explain my lab report
              </Link>
            </div>
          </div>

          <div className={styles.chatPreview} aria-hidden="true">
            <div className={`${styles.pBubble} ${styles.pUser}`}>
              <Mic size={13} /> Mujhe 3 din se bukhar aur gale mein dard hai
            </div>
            <div className={styles.pBubble}>Bukhar kitna tez hai? Kya thermometer se check kiya?</div>
            <div className={styles.pChips}>
              <span>100–101°F</span>
              <span>102°F se zyada</span>
              <span>Check nahi kiya</span>
            </div>
            <div className={`${styles.pBubble} ${styles.pUser}`}>102°F se zyada</div>
            <div className={styles.pResult}>
              <span className={styles.pTag}>See a doctor soon</span>
              <strong>ENT · 3 doctors in Karachi</strong>
              <small>
                <ShieldAlert size={12} /> Summary ready to share with your doctor
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
