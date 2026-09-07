import Link from 'next/link';
import { Bot, ArrowRight } from 'lucide-react';
import styles from './home.module.css';

export default function AiDoctorCta() {
  return (
    <section className="section-tight">
      <div className="container">
        <div className={styles.aiCta}>
          <div>
            <span className="badge badge-cyan" style={{ marginBottom: 14 }}>
              <Bot size={14} /> AI Doctor
            </span>
            <h2>Not sure which doctor to see?</h2>
            <p>
              Describe how you&apos;re feeling and our AI Doctor gives you a
              preliminary assessment, then recommends the right specialist from
              Vita Care to book with.
            </p>
            <Link href="/ai-doctor" className="btn btn-lg btn-accent">
              Start a symptom check <ArrowRight size={18} />
            </Link>
          </div>
          <div className={styles.aiCtaArt}>
            <div className={styles.aiCircle}>
              <Bot size={70} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
