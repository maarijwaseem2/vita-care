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
import { TriageSession } from '../../modules/chatbot/entities/triage-session.entity';
import { newReference } from '../../common/utils/reference';
import { generateDoctors } from './doctors-dataset';
import { Nurse } from '../../modules/nurses/entities/nurse.entity';
import { HomeCareRequest } from '../../modules/nurses/entities/home-care-request.entity';
import { alertLevel, checkVitals } from '../../modules/nurses/vitals';
import { BLOG_POSTS } from './blog-posts';
import { buildDaySchedule, clinicNow } from '../../common/utils/schedule';
import { randomUUID } from 'crypto';
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
    image: '',
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
    image: '',
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
    image: '',
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
    image: '',
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
    image: '',
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
    image: '',
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
    image: '',
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
    image: '',
    bio: 'General physician for everyday illnesses and preventive check-ups.',
    rating: 4.8,
  },
  {
    email: 'dr.maryam@vitacare.test',
    firstName: 'Maryam', lastName: 'Siddiqui', specialty: Specialty.PEDIATRICS,
    gender: Gender.FEMALE, age: 37, city: 'Karachi', address: 'Gulistan-e-Jauhar, Karachi',
    phone: '+92 308 1112233',
    qualifications: ['MBBS — Dow University', 'FCPS Paediatrics'],
    experiences: ['Consultant Paediatrician, National Institute of Child Health (7 yrs)'],
    opdSchedule: 'Mon – Sat', availableTime: '10:00 AM – 01:00 PM', fees: 2000,
    image: '', bio: 'Newborn care, childhood fevers, vaccination and growth concerns.', rating: 4.9,
  },
  {
    email: 'dr.zainab@vitacare.test',
    firstName: 'Zainab', lastName: 'Qureshi', specialty: Specialty.GYNECOLOGY,
    gender: Gender.FEMALE, age: 42, city: 'Lahore', address: 'Model Town, Lahore',
    phone: '+92 309 2223344',
    qualifications: ['MBBS — Fatima Jinnah Medical', 'FCPS Obstetrics & Gynaecology'],
    experiences: ['Consultant Gynaecologist, Services Hospital (10 yrs)'],
    opdSchedule: 'Mon, Tue, Thu, Sat', availableTime: '02:00 PM – 06:00 PM', fees: 2800,
    image: '', bio: 'Antenatal care, PCOS and menstrual health.', rating: 4.8,
  },
  {
    email: 'dr.imran@vitacare.test',
    firstName: 'Imran', lastName: 'Khattak', specialty: Specialty.DERMATOLOGY,
    gender: Gender.MALE, age: 40, city: 'Peshawar', address: 'University Town, Peshawar',
    phone: '+92 310 3334455',
    qualifications: ['MBBS — Khyber Medical College', 'FCPS Dermatology'],
    experiences: ['Dermatologist, Lady Reading Hospital (8 yrs)'],
    opdSchedule: 'Mon – Fri', availableTime: '04:00 PM – 08:00 PM', fees: 2200,
    image: '', bio: 'Eczema, acne, fungal infections and skin allergies.', rating: 4.6,
  },
  {
    email: 'dr.sadia@vitacare.test',
    firstName: 'Sadia', lastName: 'Aslam', specialty: Specialty.PSYCHIATRY,
    gender: Gender.FEMALE, age: 39, city: 'Islamabad', address: 'G-9 Markaz, Islamabad',
    phone: '+92 311 4445566',
    qualifications: ['MBBS', 'FCPS Psychiatry'],
    experiences: ['Consultant Psychiatrist, PIMS (9 yrs)'],
    opdSchedule: 'Tue, Wed, Thu', availableTime: '11:00 AM – 03:00 PM', fees: 3000,
    image: '', bio: 'Anxiety, depression, sleep problems and stress; confidential consultations.', rating: 4.9,
  },
  {
    email: 'dr.kamran@vitacare.test',
    firstName: 'Kamran', lastName: 'Baloch', specialty: Specialty.GENERAL,
    gender: Gender.MALE, age: 45, city: 'Quetta', address: 'Jinnah Road, Quetta',
    phone: '+92 312 5556677',
    qualifications: ['MBBS — Bolan Medical College', 'MCPS Family Medicine'],
    experiences: ['Family Physician (15 yrs)'],
    opdSchedule: 'Mon – Sat', availableTime: '09:00 AM – 01:00 PM', fees: 1200,
    image: '', bio: 'Primary care for families; diabetes and blood pressure follow-ups.', rating: 4.7,
  },
  {
    email: 'dr.nadia@vitacare.test',
    firstName: 'Nadia', lastName: 'Hussain', specialty: Specialty.HEART_CARE,
    gender: Gender.FEMALE, age: 46, city: 'Rawalpindi', address: 'Saddar, Rawalpindi',
    phone: '+92 313 6667788',
    qualifications: ['MBBS — Rawalpindi Medical University', 'FCPS Cardiology'],
    experiences: ['Consultant Cardiologist, Rawalpindi Institute of Cardiology (11 yrs)'],
    opdSchedule: 'Mon, Wed, Sat', availableTime: '03:00 PM – 07:00 PM', fees: 3200,
    image: '', bio: 'Chest pain assessment, heart failure and hypertension.', rating: 4.8,
  },
];



/** First OPD day at least `minDaysAhead` days from today, with its first slot. */
function nextOpdDay(doc: Doctor, minDaysAhead: number): { date: string; time: string } | null {
  const [y, m, d] = clinicNow().date.split('-').map(Number);
  for (let i = minDaysAhead; i < 30; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    const day = buildDaySchedule(doc, date);
    if (day.opdDay && day.slots.length) return { date, time: day.slots[1]?.time ?? day.slots[0].time };
  }
  return null;
}

async function run() {
  const ds = await AppDataSource.initialize();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  console.log('Seeding database...');

  await ds.transaction(async (manager) => {
    // --- Doctors: the 14 named demo doctors + a generated dataset ---
    const named = DOCTORS.map((d, i) => ({
      ...d,
      pmdcNumber: `${40000 + i * 173}-P`,
      clinicName: d.address.split(',')[0] + ' Medical Centre',
      experienceYears: Number(d.experiences.join(' ').match(/\((\d+)\s*yrs?\)/)?.[1] ?? 10),
      languages: ['Urdu', 'English'],
    }));
    const everyone = [...named, ...generateDoctors(72).map((g) => ({ ...g, image: '' }))];
    let added = 0;
    for (const seed of everyone) {
      const exists = await manager.findOne(User, { where: { email: seed.email } });
      if (exists) continue;
      const user = await manager.save(
        manager.create(User, { email: seed.email, passwordHash, role: UserRole.DOCTOR }),
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
          imageUrl: seed.image || undefined,
          bio: seed.bio,
          rating: seed.rating,
          pmdcNumber: seed.pmdcNumber,
          clinicName: seed.clinicName,
          experienceYears: seed.experienceYears,
          languages: seed.languages,
          verificationStatus: 'verified',
          verifiedAt: new Date(),
        }),
      );
      added++;
    }
    if (added) console.log(`  + ${added} verified doctors`);

    // --- Doctors waiting for the admin (verification queue demo) ---
    const queue = [
      { email: 'dr.pending.hassan@vitacare.test', firstName: 'Hassan', lastName: 'Raza', specialty: Specialty.HEART_CARE, city: 'Lahore', pmdc: '52611-P', status: 'pending', note: null },
      { email: 'dr.pending.mahnoor@vitacare.test', firstName: 'Mahnoor', lastName: 'Tariq', specialty: Specialty.DERMATOLOGY, city: 'Karachi', pmdc: '61842-P', status: 'pending', note: null },
      { email: 'dr.rejected.kamal@vitacare.test', firstName: 'Kamal', lastName: 'Ahmed', specialty: Specialty.GENERAL, city: 'Multan', pmdc: '99999-P', status: 'rejected', note: 'PMDC number not found in the practitioners register. Please check and resubmit.' },
    ] as const;
    for (const q of queue) {
      if (await manager.findOne(User, { where: { email: q.email } })) continue;
      const user = await manager.save(manager.create(User, { email: q.email, passwordHash, role: UserRole.DOCTOR }));
      await manager.save(
        manager.create(Doctor, {
          userId: user.id, firstName: q.firstName, lastName: q.lastName, title: 'Dr',
          specialty: q.specialty, city: q.city, address: `${q.city}`, gender: Gender.MALE,
          qualifications: ['MBBS'], experiences: [], opdSchedule: 'Mon – Fri', availableTime: '05:00 PM – 08:00 PM',
          fees: 2000, pmdcNumber: q.pmdc, clinicName: `${q.lastName} Clinic`, experienceYears: 5,
          languages: ['Urdu', 'English'], verificationStatus: q.status, verificationNote: q.note,
        }),
      );
      console.log(`  + ${q.status} doctor ${q.firstName} ${q.lastName}`);
    }

    // --- Admin ---
    const adminEmail = 'admin@vitacare.test';
    if (!(await manager.findOne(User, { where: { email: adminEmail } }))) {
      await manager.save(manager.create(User, { email: adminEmail, passwordHash, role: UserRole.ADMIN }));
      console.log('  + admin account');
    }

    // --- Blog posts ---
    for (const post of BLOG_POSTS) {
      if (await manager.findOne(BlogPost, { where: { slug: post.slug } })) continue;
      const words = post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      await manager.save(
        manager.create(BlogPost, {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          author: post.author,
          imageUrl: post.image,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          status: 'published',
          readingMinutes: Math.max(1, Math.round(words / 200)),
          publishedAt: new Date(Date.now() - post.daysAgo * 86_400_000),
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
          age: 52,
          gender: Gender.MALE,
          phone: '+92 311 2223334',
          city: 'Karachi',
          address: 'Bahadurabad, Karachi',
          currentMedication: 'Metformin 500 mg twice daily; Amlodipine 5 mg once daily',
        }),
      );
      await manager.save([
        manager.create(MedicalHistory, {
          patientId: demoPatient.id,
          condition: 'Type 2 diabetes',
          notes: 'HbA1c 7.4% in March 2026.',
          diagnosedAt: '2019-06-10',
        }),
        manager.create(MedicalHistory, {
          patientId: demoPatient.id,
          condition: 'Hypertension',
          notes: 'Usually 135/85 on medication.',
          diagnosedAt: '2021-02-01',
        }),
        manager.create(MedicalHistory, {
          patientId: demoPatient.id,
          condition: 'Seasonal allergic rhinitis',
          notes: 'Recurs every spring.',
          diagnosedAt: '2016-03-15',
        }),
      ]);
      console.log('  + demo patient Ali Hassan (diabetes, hypertension)');

      const neuro = await manager.findOne(Doctor, { where: { specialty: Specialty.NEUROLOGY }, order: { id: 'ASC' } });
      const gp = await manager.findOne(Doctor, { where: { specialty: Specialty.GENERAL }, order: { id: 'ASC' } });

      // A finished past visit so the doctor view shows history.
      if (gp) {
        await manager.save(
          manager.create(Appointment, {
            reference: newReference(),
            doctorId: gp.id,
            patientId: demoPatient.id,
            patientName: 'Ali Hassan',
            patientPhone: '+92 311 2223334',
            date: '2026-06-12',
            timeSlot: '11:00 AM',
            reason: 'Diabetes follow-up',
            status: AppointmentStatus.COMPLETED,
            doctorNotes: 'Sugar controlled. Continue metformin. Repeat HbA1c in 3 months.',
          }),
        );
      }

      // An upcoming visit with an AI pre-visit summary attached, so the
      // doctor dashboard can be demoed even without an AI key.
      if (neuro) {
        const session = await manager.save(
          manager.create(TriageSession, {
            token: randomUUID(),
            patientId: demoPatient.id,
            language: 'roman-ur',
            mode: 'ai',
            urgency: 'soon',
            specialty: Specialty.NEUROLOGY,
            summary: {
              chiefComplaint: 'Recurrent one-sided throbbing headache',
              duration: '3 weeks, 3–4 episodes per week',
              severity: '7/10 at peak',
              associatedSymptoms: ['nausea', 'light sensitivity', 'blurred vision before attacks'],
              relevantHistory: 'Type 2 diabetes and hypertension on metformin and amlodipine. No head injury. No weakness or speech change.',
              questionsForDoctor: [
                'Could the headaches be related to blood pressure or my medicines?',
                'Do I need a scan?',
              ],
            },
            possibleConditions: [
              { name: 'Migraine with aura', likelihood: 'more likely', why: 'One-sided throbbing pain with visual changes before attacks' },
              { name: 'Headache from high blood pressure', likelihood: 'possible', why: 'Known hypertension' },
            ],
            redFlags: [],
            transcript: [
              { role: 'user', content: 'Mujhe 3 hafte se sar ke ek taraf dard hota hai' },
              { role: 'assistant', content: 'Dard kitna shadeed hota hai, 0 se 10 mein?' },
              { role: 'user', content: '7 tak chala jata hai, roshni se aur barhta hai' },
            ],
          }),
        );
        const next = nextOpdDay(neuro, 2);
        if (next) {
          await manager.save(
            manager.create(Appointment, {
              reference: newReference(),
              doctorId: neuro.id,
              patientId: demoPatient.id,
              patientName: 'Ali Hassan',
              patientPhone: '+92 311 2223334',
              date: next.date,
              timeSlot: next.time,
              reason: 'Recurring headaches',
              triageSessionId: session.id,
              status: AppointmentStatus.BOOKED,
            }),
          );
          console.log(`  + upcoming appointment with AI summary on ${next.date} ${next.time}`);
        }
      }
    }
  });

  // --- Home-visit nurses (fictional) and sample visits ---
  {
    const NURSE_FIRST_F = ['Nasreen', 'Shazia', 'Rukhsana', 'Samina', 'Farzana', 'Tahira', 'Nazia', 'Sumaira', 'Robina', 'Shabana', 'Asma', 'Fouzia'];
    const NURSE_FIRST_M = ['Imran', 'Shahzad', 'Asad', 'Tanveer', 'Waseem', 'Nadeem'];
    const NURSE_LAST = ['Akhtar', 'Bibi', 'Parveen', 'Masih', 'Gill', 'Khan', 'Iqbal', 'Rehman', 'Bashir', 'Yousaf', 'Anwar', 'Sadiq'];
    const CITIES = [
      ['Karachi', ['Clifton', 'Gulshan-e-Iqbal', 'North Nazimabad', 'DHA', 'PECHS']],
      ['Lahore', ['Gulberg', 'Johar Town', 'Model Town', 'DHA']],
      ['Islamabad', ['F-8', 'G-9', 'I-8', 'E-11']],
      ['Rawalpindi', ['Saddar', 'Satellite Town', 'Bahria Town']],
      ['Peshawar', ['Hayatabad', 'University Town']],
      ['Quetta', ['Jinnah Road', 'Cantt']],
      ['Multan', ['Gulgasht', 'Cantt']],
      ['Faisalabad', ['Madina Town', 'Peoples Colony']],
      ['Hyderabad', ['Latifabad', 'Qasimabad']],
      ['Sialkot', ['Cantt']],
      ['Abbottabad', ['Supply']],
      ['Gujranwala', ['Satellite Town']],
    ] as const;
    const QUALS = ['BSN (Registered Nurse)', 'Diploma RN', 'Post-RN BSN', 'Midwife', 'Lady Health Visitor (LHV)'];
    const SKILL_SETS = [
      ['injection', 'wound_care', 'vitals', 'sample'],
      ['elderly_care', 'vitals', 'catheter', 'injection'],
      ['post_op', 'wound_care', 'injection', 'vitals'],
      ['mother_baby', 'vitals', 'injection'],
    ];
    const nurseSeeds = [
      { email: 'nurse@vitacare.test', first: 'Nasreen', last: 'Akhtar', gender: 'female', city: 'Karachi', areas: ['Clifton', 'DHA', 'PECHS', 'Gulshan-e-Iqbal'], qual: 'BSN (Registered Nurse)', skills: ['injection', 'wound_care', 'vitals', 'elderly_care', 'post_op', 'sample'], fee: 2000, status: 'verified' as const },
      { email: 'nurse.pending@vitacare.test', first: 'Rizwana', last: 'Kausar', gender: 'female', city: 'Lahore', areas: ['Gulberg'], qual: 'Diploma RN', skills: ['injection', 'vitals'], fee: 1500, status: 'pending' as const },
    ];
    for (let i = 0; i < 24; i++) {
      const female = i % 4 !== 3;
      const [city, areas] = CITIES[i % CITIES.length];
      nurseSeeds.push({
        email: `nurse.${i + 1}@vitacare.test`,
        first: female ? NURSE_FIRST_F[i % NURSE_FIRST_F.length] : NURSE_FIRST_M[i % NURSE_FIRST_M.length],
        last: NURSE_LAST[(i * 5) % NURSE_LAST.length],
        gender: female ? 'female' : 'male',
        city,
        areas: [...areas],
        qual: female && i % 6 === 3 ? 'Midwife' : QUALS[i % QUALS.length],
        skills: SKILL_SETS[i % SKILL_SETS.length],
        fee: 1200 + (i % 5) * 300,
        status: 'verified' as const,
      });
    }
    let nAdded = 0;
    for (const [i, n] of nurseSeeds.entries()) {
      if (await ds.getRepository(User).findOne({ where: { email: n.email } })) continue;
      const u = await ds.getRepository(User).save(ds.getRepository(User).create({ email: n.email, passwordHash, role: UserRole.NURSE }));
      await ds.getRepository(Nurse).save(
        ds.getRepository(Nurse).create({
          userId: u.id, firstName: n.first, lastName: n.last, gender: n.gender as 'male' | 'female',
          phone: `+92 3${(i % 4) + 1}${i % 10} ${String(2000000 + i * 7919).slice(0, 7)}`,
          city: n.city, areas: n.areas, qualification: n.qual, pncNumber: `PNC-${String(20000 + i * 131)}`,
          skills: n.skills, experienceYears: 3 + (i % 12), visitFee: n.fee,
          availableDays: i % 2 ? 'Mon – Sat' : 'Daily', rating: Math.round((4.3 + (i % 7) / 10) * 10) / 10,
          bio: `${n.qual.split(' (')[0]} providing home visits in ${n.city}.`,
          verificationStatus: n.status, verifiedAt: n.status === 'verified' ? new Date() : null,
        }),
      );
      nAdded++;
    }
    if (nAdded) console.log(`  + ${nAdded} nurses (1 pending verification)`);

    // Sample visits for the demo patient (Karachi)
    const demo = await ds.getRepository(Patient).findOne({ where: { user: { email: 'patient@vitacare.test' } }, relations: { user: true } });
    const demoNurse = await ds.getRepository(Nurse).findOne({ where: { user: { email: 'nurse@vitacare.test' } }, relations: { user: true } });
    const saif = await ds.getRepository(Doctor).findOne({ where: { user: { email: 'dr.saif@vitacare.test' } }, relations: { user: true } });
    const hcRepo = ds.getRepository(HomeCareRequest);
    if (demo && demoNurse && !(await hcRepo.count({ where: { patientId: demo.id } }))) {
      if (!demo.address) {
        demo.address = 'House 14, Street 7, Block 2, PECHS, Karachi';
        await ds.getRepository(Patient).save(demo);
      }
      const [y, m, d] = clinicNow().date.split('-').map(Number);
      const day = (offset: number) => new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
      const vitals = { bpSystolic: 166, bpDiastolic: 98, pulse: 88, temperatureC: 36.8, spo2: 97, bloodSugar: 212 };
      const alerts = checkVitals(vitals);
      await hcRepo.save([
        hcRepo.create({
          reference: 'HN-DEMO0001', patientId: demo.id, nurseId: demoNurse.id, service: 'vitals', visitDate: day(-3), timeWindow: 'morning',
          address: demo.address, city: 'Karachi', preferredGender: 'any', notes: 'Weekly BP and sugar check.',
          status: 'completed', vitals, vitalAlerts: alerts, alertLevel: alertLevel(alerts),
          nurseNotes: 'Patient comfortable. Missed evening amlodipine twice this week. Advised to take regularly and follow up with doctor.',
          acceptedAt: new Date(Date.now() - 4 * 86_400_000), completedAt: new Date(Date.now() - 3 * 86_400_000),
        }),
        hcRepo.create({
          reference: 'HN-DEMO0002', patientId: demo.id, orderedByDoctorId: saif?.id ?? null, service: 'injection', visitDate: day(1), timeWindow: 'evening',
          address: demo.address, city: 'Karachi', preferredGender: 'any',
          notes: 'Ordered by Dr Saif: vitamin B12 injection course, first dose. Check BP at the visit.', status: 'requested',
        }),
        hcRepo.create({
          reference: 'HN-DEMO0003', patientId: demo.id, nurseId: demoNurse.id, service: 'post_op', visitDate: day(0), timeWindow: 'afternoon',
          address: demo.address, city: 'Karachi', preferredGender: 'any',
          notes: 'Post-op check after hernia repair: wound, temperature and oxygen.', status: 'accepted',
          acceptedAt: new Date(),
        }),
      ]);
      console.log('  + 3 sample home visits for the demo patient (completed with vitals, open doctor order, accepted for today)');
    }
  }

  // --- Sample consultation history (last 14 days) so the admin dashboard has a shape ---
  const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM triage_sessions WHERE language IS NOT NULL`);
  if (n < 20) {
    const specs = ['General Physician', 'Neurology', 'Heart Care', 'Pediatrics', 'Dermatology', 'ENT', 'Gynecology', 'Osteoporosis', 'Psychiatry'];
    const langs = ['roman-ur', 'roman-ur', 'roman-ur', 'en', 'en', 'ur'];
    const complaints = ['Bukhar aur jism mein dard', 'Sar dard 3 din se', 'Seene mein jalan', 'Bachay ko khansi', 'Jild par kharish', 'Kaan mein dard', 'Periods be-qaida', 'Ghutnon mein dard', 'Neend nahi aati'];
    let rows = 0;
    for (let day = 13; day >= 0; day--) {
      const perDay = 3 + ((day * 7) % 6);
      for (let k = 0; k < perDay; k++) {
        const i = day * 11 + k;
        const emergency = i % 17 === 0;
        const urgency = emergency ? 'emergency' : i % 4 === 0 ? 'soon' : 'routine';
        const spec = specs[i % specs.length];
        await ds.query(
          `INSERT INTO triage_sessions (token, language, mode, source, urgency, specialty, summary, possible_conditions, red_flags, transcript, created_at, updated_at, reviewed_at)
           VALUES ($1, $2, $3, 'chat', $4, $5, $6, '[]', $7, $8, now() - ($9 || ' days')::interval - ($10 || ' minutes')::interval, now(), $11)`,
          [
            randomUUID(), langs[i % langs.length], i % 5 === 0 ? 'offline' : 'ai', urgency, spec,
            JSON.stringify({ chiefComplaint: complaints[i % complaints.length], duration: '', severity: '', associatedSymptoms: [], relevantHistory: '', questionsForDoctor: [] }),
            JSON.stringify(emergency ? [{ id: 'chest_pain', label: 'Chest pain or pressure', urgency: 'emergency' }] : []),
            JSON.stringify([{ role: 'user', content: `[sample] ${complaints[i % complaints.length]}` }]),
            String(day), String(k * 37 + 60),
            emergency && day > 2 ? new Date() : null,
          ],
        );
        rows++;
      }
    }
    console.log(`  + ${rows} sample consultations over the last 14 days (marked [sample])`);
  }

  await ds.destroy();
  console.log('\nSeed complete.');
  console.log(`Login with any seeded email and password: ${DEFAULT_PASSWORD}`);
  console.log('  Patient:  patient@vitacare.test');
  console.log('  Doctor:   dr.saif@vitacare.test  (has an upcoming visit with an AI summary)');
  console.log('  Admin:    admin@vitacare.test');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
