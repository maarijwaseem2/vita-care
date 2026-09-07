import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import AppDataSource from '../../config/data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Doctor } from '../../modules/doctors/entities/doctor.entity';
import { Patient } from '../../modules/patients/entities/patient.entity';
import { MedicalHistory } from '../../modules/patients/entities/medical-history.entity';
import { Appointment } from '../../modules/appointments/entities/appointment.entity';
import { BlogPost } from '../../modules/blog/entities/blog-post.entity';
import {
  AppointmentStatus,
  Gender,
  Specialty,
  UserRole,
} from '../../common/enums';

loadEnv();

// Every seeded account uses this password so you can log in immediately.
const DEFAULT_PASSWORD = 'Password123';

interface DoctorSeed {
  email: string;
  firstName: string;
  lastName: string;
  specialty: Specialty;
  gender: Gender;
  age: number;
  city: string;
  address: string;
  phone: string;
  qualifications: string[];
  experiences: string[];
  opdSchedule: string;
  availableTime: string;
  fees: number;
  image: string;
  bio: string;
  rating: number;
}

const DOCTORS: DoctorSeed[] = [
  {
    email: 'dr.saif@vitacare.test',
    firstName: 'Saif', lastName: 'Ur Rehman', specialty: Specialty.NEUROLOGY,
    gender: Gender.MALE, age: 44, city: 'Karachi', address: 'Clifton Block 5, Karachi',
    phone: '+92 300 1234567',
    qualifications: ['MBBS — Dow University', 'FCPS Neurology', 'Fellowship in Epilepsy'],
    experiences: ['Consultant Neurologist, Aga Khan (8 yrs)', 'Registrar, JPMC (4 yrs)'],
    opdSchedule: 'Mon, Wed, Fri', availableTime: '05:00 PM – 09:00 PM', fees: 3000,
    image: '/images/doctors/leo-mario.png',
    bio: 'Neurologist focused on epilepsy, migraine and stroke rehabilitation.',
    rating: 4.9,
  },
  {
    email: 'dr.ayesha@vitacare.test',
    firstName: 'Ayesha', lastName: 'Khan', specialty: Specialty.NEUROLOGY,
    gender: Gender.FEMALE, age: 38, city: 'Lahore', address: 'Gulberg III, Lahore',
    phone: '+92 301 2345678',
    qualifications: ['MBBS — King Edward', 'MD Neurology'],
    experiences: ['Consultant, Shaukat Khanum (6 yrs)'],
    opdSchedule: 'Tue, Thu, Sat', availableTime: '06:00 PM – 09:00 PM', fees: 2500,
    image: '/images/doctors/anita.png',
    bio: 'Special interest in headache disorders and paediatric neurology.',
    rating: 4.7,
  },
  {
    email: 'dr.ghufran@vitacare.test',
    firstName: 'Ghufran', lastName: 'Ali', specialty: Specialty.HEART_CARE,
    gender: Gender.MALE, age: 50, city: 'Karachi', address: 'PECHS Block 2, Karachi',
    phone: '+92 302 3456789',
    qualifications: ['MBBS', 'FCPS Cardiology', 'Interventional Cardiology Fellowship'],
    experiences: ['Head of Cardiology, NICVD (12 yrs)'],
    opdSchedule: 'Mon – Fri', availableTime: '04:00 PM – 08:00 PM', fees: 3500,
    image: '/images/doctors/leo-mario.png',
    bio: 'Interventional cardiologist specialising in angioplasty and heart failure.',
    rating: 4.8,
  },
  {
    email: 'dr.sana@vitacare.test',
    firstName: 'Sana', lastName: 'Malik', specialty: Specialty.HEART_CARE,
    gender: Gender.FEMALE, age: 41, city: 'Islamabad', address: 'F-8 Markaz, Islamabad',
    phone: '+92 303 4567890',
    qualifications: ['MBBS — Rawalpindi Medical', 'FCPS Cardiology'],
    experiences: ['Consultant Cardiologist, PIMS (7 yrs)'],
    opdSchedule: 'Mon, Tue, Thu', availableTime: '05:00 PM – 08:00 PM', fees: 3000,
    image: '/images/doctors/jane.png',
    bio: 'Preventive cardiology, hypertension and women’s heart health.',
    rating: 4.6,
  },
  {
    email: 'dr.bilal@vitacare.test',
    firstName: 'Bilal', lastName: 'Ahmed', specialty: Specialty.OSTEOPOROSIS,
    gender: Gender.MALE, age: 47, city: 'Lahore', address: 'DHA Phase 4, Lahore',
    phone: '+92 304 5678901',
    qualifications: ['MBBS', 'FCPS Orthopaedics', 'MSc Bone Metabolism'],
    experiences: ['Consultant Orthopaedic Surgeon (10 yrs)'],
    opdSchedule: 'Wed, Fri, Sat', availableTime: '06:00 PM – 09:00 PM', fees: 2800,
    image: '/images/doctors/leo-mario.png',
    bio: 'Bone density, osteoporosis management and joint preservation.',
    rating: 4.5,
  },
  {
    email: 'dr.hina@vitacare.test',
    firstName: 'Hina', lastName: 'Raza', specialty: Specialty.OSTEOPOROSIS,
    gender: Gender.FEMALE, age: 39, city: 'Karachi', address: 'Gulshan-e-Iqbal, Karachi',
    phone: '+92 305 6789012',
    qualifications: ['MBBS — Sindh Medical', 'FCPS Rheumatology'],
    experiences: ['Rheumatologist, Liaquat National (6 yrs)'],
    opdSchedule: 'Mon, Thu', availableTime: '05:00 PM – 08:00 PM', fees: 2600,
    image: '/images/doctors/anita.png',
    bio: 'Rheumatology and metabolic bone disease in adults.',
    rating: 4.6,
  },
  {
    email: 'dr.usman@vitacare.test',
    firstName: 'Usman', lastName: 'Sheikh', specialty: Specialty.ENT,
    gender: Gender.MALE, age: 43, city: 'Islamabad', address: 'Blue Area, Islamabad',
    phone: '+92 306 7890123',
    qualifications: ['MBBS', 'FCPS ENT', 'Rhinology Fellowship'],
    experiences: ['ENT Consultant, Shifa International (9 yrs)'],
    opdSchedule: 'Tue, Wed, Fri', availableTime: '04:00 PM – 07:00 PM', fees: 2400,
    image: '/images/doctors/leo-mario.png',
    bio: 'Ear, nose and throat surgery, sinus and hearing disorders.',
    rating: 4.7,
  },
  {
    email: 'dr.fatima@vitacare.test',
    firstName: 'Fatima', lastName: 'Iqbal', specialty: Specialty.GENERAL,
    gender: Gender.FEMALE, age: 35, city: 'Karachi', address: 'North Nazimabad, Karachi',
    phone: '+92 307 8901234',
    qualifications: ['MBBS — Dow University', 'Diploma in Family Medicine'],
    experiences: ['Family Physician (8 yrs)'],
    opdSchedule: 'Mon – Sat', availableTime: '10:00 AM – 02:00 PM', fees: 1500,
    image: '/images/doctors/jane.png',
    bio: 'General physician for everyday illnesses and preventive check-ups.',
    rating: 4.8,
  },
];

const BLOG_POSTS = [
  {
    title: 'Understanding Heart Health: Small Habits, Big Impact',
    slug: 'understanding-heart-health',
    category: 'Cardiology',
    author: 'Dr. Ghufran Ali',
    image: '/images/blog/artical_cardiology.jpg',
    excerpt:
      'Simple, evidence-based habits — movement, sleep and diet — that meaningfully lower your risk of heart disease.',
    content:
      'Heart disease remains one of the leading causes of death worldwide, yet a large share of risk is preventable. Regular physical activity, a balanced diet low in processed foods, good sleep, and not smoking together make a dramatic difference. This article walks through practical, sustainable changes you can start this week, and explains the warning signs that mean you should see a cardiologist.',
  },
  {
    title: 'COVID-19: Staying Safe and Recognising Symptoms',
    slug: 'covid-19-staying-safe',
    category: 'Public Health',
    author: 'Vita Care Editorial',
    image: '/images/blog/covid-19.png',
    excerpt:
      'What current guidance says about protecting yourself and others, and when to seek medical help.',
    content:
      'Respiratory viruses continue to circulate. Good hygiene, ventilation, staying up to date with recommended vaccines, and staying home when unwell all help reduce spread. Learn which symptoms are typically mild and manageable at home, and which ones — such as difficulty breathing — warrant urgent care.',
  },
  {
    title: 'Quitting Nicotine: A Practical Guide',
    slug: 'quitting-nicotine-guide',
    category: 'Lifestyle',
    author: 'Dr. Fatima Iqbal',
    image: '/images/blog/nicotine.png',
    excerpt:
      'Nicotine dependence is hard to break — but the right plan and support make success far more likely.',
    content:
      'Quitting smoking or vaping is one of the single best things you can do for your health. This guide covers nicotine replacement options, behavioural strategies, how to handle cravings and relapses without guilt, and where to find support. Within days of quitting your body already begins to recover.',
  },
  {
    title: 'Migraine vs. Ordinary Headache: Know the Difference',
    slug: 'migraine-vs-headache',
    category: 'Neurology',
    author: 'Dr. Saif Ur Rehman',
    image: '/images/blog/artical_cardiology.jpg',
    excerpt:
      'Not all headaches are equal. Understanding the difference helps you get the right treatment sooner.',
    content:
      'Migraine is a neurological condition, not just a bad headache. It often comes with sensitivity to light and sound, nausea, and throbbing pain on one side. Identifying your triggers and getting a proper assessment from a neurologist can transform how well it is controlled.',
  },
  {
    title: 'Protecting Your Bones as You Age',
    slug: 'protecting-your-bones',
    category: 'Osteoporosis',
    author: 'Dr. Bilal Ahmed',
    image: '/images/blog/covid-19.png',
    excerpt:
      'Bone density naturally declines with age. Nutrition, exercise and screening keep your skeleton strong.',
    content:
      'Osteoporosis silently weakens bones until a fracture occurs. Adequate calcium and vitamin D, weight-bearing exercise, and — when indicated — a bone density scan are the cornerstones of prevention. Learn who should be screened and what treatments are available.',
  },
  {
    title: 'When Should You See an ENT Specialist?',
    slug: 'when-to-see-ent',
    category: 'ENT',
    author: 'Dr. Usman Sheikh',
    image: '/images/blog/nicotine.png',
    excerpt:
      'Persistent ear, nose or throat problems are worth checking. Here is when to book an appointment.',
    content:
      'Recurring sinus infections, hearing changes, chronic sore throat, or persistent dizziness can all point to an ENT issue. This article explains common conditions an ENT specialist treats and the symptoms that mean it is time to see one rather than waiting it out.',
  },
];

async function run() {
  const ds = await AppDataSource.initialize();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  console.log('Seeding database...');

  await ds.transaction(async (manager) => {
    // --- Doctors ---
    for (const seed of DOCTORS) {
      const exists = await manager.findOne(User, {
        where: { email: seed.email },
      });
      if (exists) continue;

      const user = await manager.save(
        manager.create(User, {
          email: seed.email,
          passwordHash,
          role: UserRole.DOCTOR,
        }),
      );
      await manager.save(
        manager.create(Doctor, {
          userId: user.id,
          firstName: seed.firstName,
          lastName: seed.lastName,
          title: 'Dr',
          specialty: seed.specialty,
          age: seed.age,
          gender: seed.gender,
          phone: seed.phone,
          city: seed.city,
          address: seed.address,
          qualifications: seed.qualifications,
          experiences: seed.experiences,
          opdSchedule: seed.opdSchedule,
          availableTime: seed.availableTime,
          fees: seed.fees,
          imageUrl: seed.image,
          bio: seed.bio,
          rating: seed.rating,
        }),
      );
      console.log(`  + doctor ${seed.firstName} ${seed.lastName}`);
    }

    // --- Blog posts ---
    for (const post of BLOG_POSTS) {
      const exists = await manager.findOne(BlogPost, {
        where: { slug: post.slug },
      });
      if (exists) continue;
      await manager.save(
        manager.create(BlogPost, {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          author: post.author,
          imageUrl: post.image,
        }),
      );
      console.log(`  + blog "${post.title}"`);
    }

    // --- Demo patient + history + one appointment ---
    const demoEmail = 'patient@vitacare.test';
    let demoPatient = await manager.findOne(Patient, {
      where: { user: { email: demoEmail } },
      relations: { user: true },
    });

    if (!demoPatient) {
      const user = await manager.save(
        manager.create(User, {
          email: demoEmail,
          passwordHash,
          role: UserRole.PATIENT,
        }),
      );
      demoPatient = await manager.save(
        manager.create(Patient, {
          userId: user.id,
          firstName: 'Ali',
          lastName: 'Hassan',
          age: 29,
          gender: Gender.MALE,
          phone: '+92 311 2223334',
          city: 'Karachi',
          address: 'Bahadurabad, Karachi',
          currentMedication: 'None',
        }),
      );
      await manager.save(
        manager.create(MedicalHistory, {
          patientId: demoPatient.id,
          condition: 'Seasonal allergic rhinitis',
          notes: 'Recurs every spring; managed with antihistamines.',
          diagnosedAt: '2022-03-15',
        }),
      );
      console.log('  + demo patient Ali Hassan');

      // Book a sample appointment with the first doctor.
      const firstDoctor = await manager.findOne(Doctor, {
        where: { specialty: Specialty.NEUROLOGY },
      });
      if (firstDoctor) {
        await manager.save(
          manager.create(Appointment, {
            doctorId: firstDoctor.id,
            patientId: demoPatient.id,
            patientName: 'Ali Hassan',
            patientPhone: '+92 311 2223334',
            date: '2025-01-20',
            timeSlot: '05:00 PM',
            reason: 'Recurring migraines',
            status: AppointmentStatus.BOOKED,
          }),
        );
        console.log('  + sample appointment');
      }
    }
  });

  await ds.destroy();
  console.log('\nSeed complete.');
  console.log(`Login with any seeded email and password: ${DEFAULT_PASSWORD}`);
  console.log('  Patient:  patient@vitacare.test');
  console.log('  Doctor:   dr.saif@vitacare.test');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
