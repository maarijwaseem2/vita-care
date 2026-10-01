import Link from 'next/link';
import {
  Baby,
  Bone,
  Brain,
  Ear,
  HeartHandshake,
  HeartPulse,
  PersonStanding,
  ScanLine,
  Users,
  Smile,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import styles from './home.module.css';

const DEPARTMENTS = [
  { name: 'General Physician', icon: Stethoscope, desc: 'Fever, infections, diabetes and BP follow-ups.' },
  { name: 'Heart Care', icon: HeartPulse, desc: 'Chest pain, blood pressure and heart health.' },
  { name: 'Neurology', icon: Brain, desc: 'Headaches, dizziness, seizures and nerves.' },
  { name: 'Pediatrics', icon: Baby, desc: 'Children’s fevers, growth and vaccines.' },
  { name: 'Gynecology', icon: Sparkles, desc: 'Pregnancy care, periods and PCOS.' },
  { name: 'Dermatology', icon: Smile, desc: 'Rashes, itching, acne and allergies.' },
  { name: 'ENT', icon: Ear, desc: 'Ear, nose, throat and sinus problems.' },
  { name: 'Osteoporosis', icon: Bone, desc: 'Bones, joints, arthritis and fractures.' },
  { name: 'Physiotherapy', icon: PersonStanding, desc: 'Rehab after stroke (falij), accident or surgery; long-lasting back pain, sprains.' },
  { name: 'Radiology', icon: ScanLine, desc: 'X-ray, CT, MRI and ultrasound reports read by radiologists.' },
  { name: 'Psychiatry', icon: HeartHandshake, desc: 'Anxiety, low mood, sleep and stress, in confidence.' },
];

export default function Departments() {
  return (
    <section className="section" id="departments">
      <div className="container">
        <div className="section-head">
          <h2>Find care by department</h2>
          <p>
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
                <d.icon size={30} strokeWidth={1.6} />
              </div>
              <h3>{d.name}</h3>
              <p>{d.desc}</p>
            </Link>
          ))}
          <Link href="/doctors" className={`card card-hover ${styles.deptCard} ${styles.deptAll}`}>
            <div className={styles.deptIcon}>
              <Users size={30} strokeWidth={1.6} />
            </div>
            <h3>All doctors</h3>
            <p>Search every verified doctor by name, city or department.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
