import Link from 'next/link';
import styles from './home.module.css';

const DEPARTMENTS = [
  { name: 'General Physician', icon: '/images/departments/general.png', desc: 'Fever, infections, diabetes and BP follow-ups.' },
  { name: 'Heart Care', icon: '/images/departments/heart.png', desc: 'Chest pain, blood pressure and heart health.' },
  { name: 'Neurology', icon: '/images/departments/neurology.png', desc: 'Headaches, dizziness, seizures and nerves.' },
  { name: 'Pediatrics', icon: '/images/departments/pediatrics.png', desc: 'Children’s fevers, growth and vaccines.' },
  { name: 'Gynecology', icon: '/images/departments/gynecology.png', desc: 'Pregnancy care, periods and PCOS.' },
  { name: 'Dermatology', icon: '/images/departments/dermatology.png', desc: 'Rashes, itching, acne and allergies.' },
  { name: 'ENT', icon: '/images/departments/ent.png', desc: 'Ear, nose, throat and sinus problems.' },
  { name: 'Osteoporosis', icon: '/images/departments/osteoporosis.png', desc: 'Bones, joints, arthritis and fractures.' },
  { name: 'Physiotherapy', icon: '/images/departments/physiotherapy.png', desc: 'Rehab after stroke (falij), accident or surgery; long-lasting back pain, sprains.' },
  { name: 'Radiology', icon: '/images/departments/radiology.png', desc: 'X-ray, CT, MRI and ultrasound reports read by radiologists.' },
  { name: 'Psychiatry', icon: '/images/departments/psychiatry.png', desc: 'Anxiety, low mood, sleep and stress, in confidence.' },
];

export default function Departments() {
  return (
    <section className="section" id="departments">
      <div className="container">
        <div className="section-head">
          <h2>Find care by department</h2>
          <p className={styles.deptLead}>
            Not sure which one? Describe your symptoms to the AI Doctor and it
            will point you to the right department.
          </p>
        </div>

        <div className={styles.deptGrid}>
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.name}
              href={`/doctors?specialty=${encodeURIComponent(d.name)}`}
              className={`card card-hover ${styles.deptCard}`}
            >
              <div className={styles.deptIcon}>
                {/* 3D icons: Microsoft Fluent Emoji (MIT licence) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.icon} alt="" width={44} height={44} loading="lazy" />
              </div>
              <h3>{d.name}</h3>
              <p>{d.desc}</p>
            </Link>
          ))}
          <Link href="/doctors" className={`card card-hover ${styles.deptCard} ${styles.deptAll}`}>
            <div className={styles.deptIcon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/departments/all.png" alt="" width={44} height={44} loading="lazy" />
            </div>
            <h3>All doctors</h3>
            <p>Search every verified doctor by name, city or department.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
