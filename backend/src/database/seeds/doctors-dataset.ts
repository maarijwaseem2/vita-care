import { Gender, Specialty } from '../../common/enums';

/**
 * Deterministic demo dataset of ~72 doctors across 9 departments and 12 cities.
 *
 * All people, PMDC numbers, phone numbers and clinics are FICTIONAL and
 * generated for demonstration. Nothing here refers to a real practitioner.
 */
export interface GeneratedDoctor {
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
  bio: string;
  rating: number;
  pmdcNumber: string;
  clinicName: string;
  experienceYears: number;
  languages: string[];
  council?: 'PMDC' | 'AHPC';
  homeVisits?: boolean;
}

const MALE = ['Ahmed', 'Hamza', 'Usama', 'Faisal', 'Tariq', 'Zeeshan', 'Adnan', 'Kashif', 'Omer', 'Asif', 'Junaid', 'Salman', 'Waqas', 'Irfan', 'Naveed', 'Shahid', 'Danish', 'Rehan'];
const FEMALE = ['Amna', 'Sadaf', 'Rabia', 'Sidra', 'Mehwish', 'Nida', 'Saima', 'Iqra', 'Maham', 'Hira', 'Farah', 'Kiran', 'Uzma', 'Bushra', 'Sobia', 'Anum', 'Mariam', 'Alina'];
const LAST = ['Siddiqui', 'Qureshi', 'Malik', 'Chaudhry', 'Butt', 'Sheikh', 'Khan', 'Baig', 'Mirza', 'Abbasi', 'Hashmi', 'Jafri', 'Rizvi', 'Awan', 'Khattak', 'Durrani', 'Memon', 'Soomro', 'Baloch', 'Yousafzai', 'Ansari', 'Bhatti', 'Gillani', 'Lodhi'];

const CITIES: { city: string; areas: string[]; languages: string[] }[] = [
  { city: 'Karachi', areas: ['Clifton', 'Gulshan-e-Iqbal', 'North Nazimabad', 'DHA Phase 6', 'PECHS'], languages: ['Sindhi'] },
  { city: 'Lahore', areas: ['Gulberg', 'Johar Town', 'Model Town', 'DHA Phase 5', 'Allama Iqbal Town'], languages: ['Punjabi'] },
  { city: 'Islamabad', areas: ['F-8 Markaz', 'G-9', 'Blue Area', 'I-8', 'E-11'], languages: ['Punjabi', 'Pashto'] },
  { city: 'Rawalpindi', areas: ['Saddar', 'Satellite Town', 'Bahria Town', 'Chaklala'], languages: ['Punjabi', 'Pothwari'] },
  { city: 'Peshawar', areas: ['University Town', 'Hayatabad', 'Saddar'], languages: ['Pashto', 'Hindko'] },
  { city: 'Quetta', areas: ['Jinnah Road', 'Samungli Road', 'Cantt'], languages: ['Pashto', 'Balochi'] },
  { city: 'Multan', areas: ['Gulgasht', 'Cantt', 'Bosan Road'], languages: ['Saraiki', 'Punjabi'] },
  { city: 'Faisalabad', areas: ['Madina Town', 'Peoples Colony', 'Susan Road'], languages: ['Punjabi'] },
  { city: 'Hyderabad', areas: ['Latifabad', 'Qasimabad', 'Saddar'], languages: ['Sindhi'] },
  { city: 'Sialkot', areas: ['Cantt', 'Paris Road'], languages: ['Punjabi'] },
  { city: 'Abbottabad', areas: ['Supply', 'Mandian'], languages: ['Hindko', 'Pashto'] },
  { city: 'Gujranwala', areas: ['Satellite Town', 'Model Town'], languages: ['Punjabi'] },
];

const SPEC: Record<Specialty, { degree: string; title: string; focus: string[]; fee: [number, number]; notMbbs?: boolean }> = {
  [Specialty.NEUROLOGY]: { degree: 'FCPS Neurology', title: 'Neurologist', focus: ['migraine and headache', 'epilepsy', 'stroke follow-up', 'nerve pain and numbness'], fee: [2500, 4000] },
  [Specialty.HEART_CARE]: { degree: 'FCPS Cardiology', title: 'Cardiologist', focus: ['chest pain assessment', 'high blood pressure', 'heart failure', 'palpitations'], fee: [2500, 4500] },
  [Specialty.OSTEOPOROSIS]: { degree: 'FCPS Orthopaedic Surgery', title: 'Orthopaedic Surgeon', focus: ['knee and joint pain', 'back pain', 'bone density', 'sports injuries'], fee: [2000, 3500] },
  [Specialty.ENT]: { degree: 'FCPS Otorhinolaryngology', title: 'ENT Specialist', focus: ['sinus problems', 'ear infections and hearing', 'tonsils and throat', 'vertigo'], fee: [1800, 3000] },
  [Specialty.GENERAL]: { degree: 'MCPS Family Medicine', title: 'Family Physician', focus: ['fever and infections', 'diabetes follow-up', 'blood pressure', 'preventive check-ups'], fee: [1000, 2000] },
  [Specialty.PEDIATRICS]: { degree: 'FCPS Paediatrics', title: 'Paediatrician', focus: ['newborn care', 'childhood fever', 'vaccination', 'growth and nutrition'], fee: [1500, 3000] },
  [Specialty.GYNECOLOGY]: { degree: 'FCPS Obstetrics & Gynaecology', title: 'Gynaecologist', focus: ['antenatal care', 'PCOS', 'menstrual problems', 'infertility'], fee: [2000, 3500] },
  [Specialty.DERMATOLOGY]: { degree: 'FCPS Dermatology', title: 'Dermatologist', focus: ['acne', 'eczema', 'fungal infections', 'hair loss'], fee: [1800, 3000] },
  [Specialty.PHYSIOTHERAPY]: { degree: 'DPT (Doctor of Physical Therapy)', title: 'Physiotherapist', focus: ['back and neck pain', 'sports injuries', 'stroke rehabilitation', 'post-surgery rehab', 'frozen shoulder', 'knee arthritis exercise'], fee: [1500, 3000], notMbbs: true },
  [Specialty.RADIOLOGY]: { degree: 'FCPS Radiology', title: 'Radiologist', focus: ['X-ray reporting', 'CT and MRI', 'ultrasound', 'musculoskeletal imaging'], fee: [2000, 3500] },
  [Specialty.PSYCHIATRY]: { degree: 'FCPS Psychiatry', title: 'Psychiatrist', focus: ['anxiety', 'depression', 'sleep problems', 'stress'], fee: [2500, 4000] },
};

const SCHEDULES: [string, string][] = [
  ['Mon – Fri', '05:00 PM – 09:00 PM'],
  ['Mon – Sat', '10:00 AM – 02:00 PM'],
  ['Mon, Wed, Fri', '04:00 PM – 08:00 PM'],
  ['Tue, Thu, Sat', '06:00 PM – 09:00 PM'],
  ['Mon – Thu', '02:00 PM – 06:00 PM'],
  ['Mon, Tue, Thu, Sat', '11:00 AM – 03:00 PM'],
];

/** Small deterministic PRNG so every seed run produces the same dataset. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function generateDoctors(
  count = 72,
  opts: { specialties?: Specialty[]; seed?: number; emailPrefix?: string } = {},
): GeneratedDoctor[] {
  const r = rng(opts.seed ?? 20261003);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  // Default = the original nine departments, so re-seeding an existing database stays stable.
  const specialties =
    opts.specialties ??
    Object.values(Specialty).filter((s) => s !== Specialty.PHYSIOTHERAPY && s !== Specialty.RADIOLOGY);
  const prefix = opts.emailPrefix ?? 'dr';
  const used = new Set<string>();
  const out: GeneratedDoctor[] = [];

  for (let i = 0; i < count; i++) {
    const specialty = specialties[i % specialties.length];
    const place = CITIES[specialties.length === 1 ? i % CITIES.length : Math.floor(i / specialties.length) % CITIES.length];
    const female = specialty === Specialty.GYNECOLOGY ? true : r() < 0.45;
    let firstName = '';
    let lastName = '';
    do {
      firstName = pick(female ? FEMALE : MALE);
      lastName = pick(LAST);
    } while (used.has(firstName + lastName));
    used.add(firstName + lastName);

    const spec = SPEC[specialty];
    const years = 4 + Math.floor(r() * 22);
    const [opdSchedule, availableTime] = pick(SCHEDULES);
    const [lo, hi] = spec.fee;
    const fees = Math.round((lo + r() * (hi - lo)) / 100) * 100;
    const focus = [...spec.focus].sort(() => r() - 0.5).slice(0, 2);
    const area = pick(place.areas);

    out.push({
      email: `${prefix}.${firstName}.${lastName}.${i + 1}`.toLowerCase() + '@vitacare.test',
      firstName,
      lastName,
      specialty,
      gender: female ? Gender.FEMALE : Gender.MALE,
      age: 28 + years + Math.floor(r() * 4),
      city: place.city,
      address: `${area}, ${place.city}`,
      phone: `+92 3${Math.floor(r() * 5)}${Math.floor(r() * 10)} ${String(1000000 + Math.floor(r() * 8999999)).slice(0, 7)}`,
      qualifications: spec.notMbbs ? [spec.degree] : ['MBBS', spec.degree],
      experiences: [`${spec.title} in private practice (${years} yrs)`],
      opdSchedule,
      availableTime,
      fees,
      bio: `${spec.title} in ${place.city} with ${years} years of experience. Special interest in ${focus.join(' and ')}.`,
      rating: Math.round((4.2 + r() * 0.75) * 10) / 10,
      pmdcNumber:
        specialty === Specialty.PHYSIOTHERAPY
          ? `AHPC-PT-${10000 + Math.floor(r() * 89999)}`
          : `${10000 + Math.floor(r() * 89999)}-P`,
      council: specialty === Specialty.PHYSIOTHERAPY ? 'AHPC' : 'PMDC',
      homeVisits: specialty === Specialty.PHYSIOTHERAPY,
      clinicName: `${lastName} ${spec.title === 'Family Physician' ? 'Family Clinic' : 'Clinic'}, ${area}`,
      experienceYears: years,
      languages: ['Urdu', 'English', ...place.languages],
    });
  }
  return out;
}

/** Physiotherapists across all 12 cities (separate seed so the doctor list above never shifts). */
export function generatePhysiotherapists(count = 12): GeneratedDoctor[] {
  return generateDoctors(count, { specialties: [Specialty.PHYSIOTHERAPY], seed: 20261101, emailPrefix: 'pt' });
}

/** Radiologists who read X-ray, CT, MRI and ultrasound (MBBS + FCPS, PMDC). */
export function generateRadiologists(count = 8): GeneratedDoctor[] {
  return generateDoctors(count, { specialties: [Specialty.RADIOLOGY], seed: 20261201, emailPrefix: 'rad' });
}
