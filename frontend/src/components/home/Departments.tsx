import Link from 'next/link';
import styles from './home.module.css';

const DEPARTMENTS = [
  { name: 'Neurology', icon: '/images/departments/neurology.png', desc: 'Brain, spine & nervous system care.' },
  { name: 'Heart Care', icon: '/images/departments/heart.png', desc: 'Cardiology & preventive heart health.' },
  { name: 'Osteoporosis', icon: '/images/departments/osteoporosis.png', desc: 'Bone density & joint treatment.' },
  { name: 'ENT', icon: '/images/departments/ent.png', desc: 'Ear, nose & throat specialists.' },
];

export default function Departments() {
  return (
    <section className="section" id="departments">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">What we treat</span>
          <h2>Our Departments</h2>
          <p>
            Explore our core specialties and find the right expert for your
            needs.
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.icon} alt={d.name} />
              </div>
              <h3>{d.name}</h3>
              <p>{d.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
