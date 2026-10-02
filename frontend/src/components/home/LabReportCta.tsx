import Link from 'next/link';
import { FileText, ScanLine, ShieldCheck, Languages } from 'lucide-react';
import styles from './labReport.module.css';

/** Home-page section for the lab report / scan explainer. */
export default function LabReportCta() {
  return (
    <section className={styles.wrap} aria-labelledby="lab-title">
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}><FileText size={16} /> Lab reports &amp; scans</span>
          <h2 id="lab-title">Got a report you don&apos;t understand?</h2>
          <p>
            Take a photo of your blood test, prescription or radiology report. Vita Care explains every value in simple
            Urdu or English — <strong>what is low, what is high, and which doctor to see</strong>. X-ray and CT photos are
            described only, and sent to a radiologist.
          </p>
          <ul className={styles.points}>
            <li><ShieldCheck size={18} /> Low / Normal / High for every test, with the normal range</li>
            <li><Languages size={18} /> Explanation in Urdu, Roman Urdu or English</li>
            <li><ScanLine size={18} /> Scans described safely, never diagnosed</li>
          </ul>
          <Link href="/ai-doctor/report" className="btn btn-lg">
            <FileText size={18} /> Explain my report
          </Link>
        </div>
        <div className={styles.card} aria-hidden="true">
          <div className={styles.cardHead}>Complete Blood Count</div>
          <div className={styles.row}><span>Haemoglobin</span><b>10.1 g/dL</b><em className={styles.low}>Low</em></div>
          <div className={styles.row}><span>MCV</span><b>71 fL</b><em className={styles.low}>Low</em></div>
          <div className={styles.row}><span>WBC</span><b>7.2</b><em className={styles.ok}>Normal</em></div>
          <div className={styles.row}><span>Platelets</span><b>245</b><em className={styles.ok}>Normal</em></div>
          <p className={styles.note}>Low Hb with small red cells often points to iron deficiency. Suggested: General Physician.</p>
        </div>
      </div>
    </section>
  );
}
