import { Check } from 'lucide-react';
import styles from './StepHeader.module.css';

/** "1 Account — 2 Your details" progress for two-step sign-up. */
export default function StepHeader({ step, labels }: { step: number; labels: string[] }) {
  return (
    <ol className={styles.steps} aria-label="Sign-up steps">
      {labels.map((l, i) => {
        const n = i + 1;
        const state = n < step ? styles.done : n === step ? styles.now : '';
        return (
          <li key={l} className={state} aria-current={n === step ? 'step' : undefined}>
            <span className={styles.dot}>{n < step ? <Check size={14} /> : n}</span>
            <span>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}
