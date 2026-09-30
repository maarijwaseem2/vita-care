import Link from 'next/link';
import { BadgeCheck, HeartPulse, Home, Stethoscope } from 'lucide-react';
import styles from './homeNursing.module.css';

/** Home-page teaser for verified home-visit nurses. */
export default function HomeNursingCta() {
  return (
    <section className={styles.wrap} aria-labelledby="hn-title">
      <div className={`container ${styles.inner}`}>
        <div>
          <span className={styles.eyebrow}><Home size={15} /> New · Home nursing</span>
          <h2 id="hn-title">A verified nurse at home, reporting back to your doctor</h2>
          <p>
            Injections, wound dressing, BP and sugar checks, elderly and post-surgery care. Your doctor can order the visit,
            the nurse records vitals, and any dangerous reading raises an alert straight away.
          </p>
          <div className={styles.btns}>
            <Link href="/home-care" className="btn">Request a nurse</Link>
            <Link href="/register/nurse" className="btn btn-outline">Join as a nurse</Link>
          </div>
        </div>
        <ul className={styles.points}>
          <li><BadgeCheck size={20} /><span><strong>Licence checked</strong> PNC number verified by our team before any visit</span></li>
          <li><Stethoscope size={20} /><span><strong>Doctor in the loop</strong> doctors order visits and see every reading</span></li>
          <li><HeartPulse size={20} /><span><strong>Safety alerts</strong> low oxygen, very high BP or low sugar flagged instantly</span></li>
        </ul>
      </div>
    </section>
  );
}
