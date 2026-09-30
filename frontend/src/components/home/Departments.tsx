import Link from 'next/link';
import {
  Baby,
  Bone,
  Brain,
  Ear,
  HeartPulse,
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
  { name: 'Osteoporosis', icon: Bone, desc: 'Bones, joints and back pain.' },
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

        <div className="grid grid-4">
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
        </div>
        <p className={styles.deptMore}>
          Also available: <Link href="/doctors?specialty=Psychiatry">Psychiatry</Link>, with
          confidential consultations.
        </p>
      </div>
    </section>
  );
}
