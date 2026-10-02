// Shared TypeScript types mirroring the backend API responses.

export type UserRole = 'patient' | 'doctor' | 'nurse' | 'admin';
export type Gender = 'male' | 'female' | 'other';
export type Urgency = 'routine' | 'soon' | 'emergency';
export type ChatLanguage = 'en' | 'ur' | 'roman-ur';

export const SPECIALTIES = [
  'General Physician',
  'Heart Care',
  'Neurology',
  'Pediatrics',
  'Gynecology',
  'Dermatology',
  'Psychiatry',
  'ENT',
  'Osteoporosis',
  'Physiotherapy',
  'Radiology',
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  profileId: number;
  name: string;
  /** false until the email link is clicked (Google sign-in counts as verified). */
  emailVerified?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  /** Local development only (no email service): the verification link. */
  devVerificationUrl?: string;
}

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  title: string;
  specialty: Specialty;
  age?: number;
  gender?: Gender;
  phone?: string;
  city?: string;
  address?: string;
  qualifications?: string[];
  certificates?: string[];
  experiences?: string[];
  bio?: string;
  opdSchedule?: string;
  availableTime?: string;
  fees: number;
  imageUrl?: string | null;
  rating: number;
  clinicName?: string | null;
  experienceYears?: number | null;
  languages?: string[] | null;
  pmdcNumber?: string | null;
  /** PMDC for MBBS doctors, AHPC for physiotherapists. */
  council?: 'PMDC' | 'AHPC';
  /** Offers visits at the patient's home. */
  homeVisits?: boolean;
  /** Extra charge (Rs) for a home visit. */
  homeVisitCharge?: number;
  /** Set on AI recommendations: same area or same city as the patient. */
  proximity?: 'area' | 'city' | null;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationNote?: string | null;
}

export interface MedicalHistoryEntry {
  id: number;
  condition: string;
  notes?: string;
  diagnosedAt?: string;
  createdAt: string;
}

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  city?: string;
  address?: string;
  currentMedication?: string;
  imageUrl?: string;
  medicalHistory: MedicalHistoryEntry[];
}

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled';

export interface Appointment {
  visitType?: 'clinic' | 'home';
  homeVisitCharge?: number | null;
  homeAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  id: number;
  reference: string;
  doctorId: number;
  patientId?: number | null;
  patientName: string;
  patientPhone: string;
  date: string;
  timeSlot: string;
  reason?: string | null;
  status: AppointmentStatus;
  createdAt: string;
  doctorNotes?: string | null;
  triageSessionId?: number | null;
  doctor?: Doctor;
  patient?: Patient | null;
  /** Receipt only. */
  aiSummaryShared?: boolean;
  /** Doctor list only. */
  hasAiSummary?: boolean;
  aiUrgency?: Urgency | null;
}

export interface Availability {
  date: string;
  opdDay: boolean;
  closedReason: string | null;
  opdSchedule: string | null;
  availableTime: string | null;
  slots: { time: string; status: 'available' | 'booked' | 'past' }[];
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category?: string | null;
  author?: string | null;
  imageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  status?: 'draft' | 'published';
  readingMinutes?: number;
  publishedAt: string;
  updatedAt?: string;
  related?: BlogPost[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PossibleCondition {
  name: string;
  likelihood: 'more likely' | 'possible' | 'less likely';
  why: string;
}

export interface ClinicalSummary {
  chiefComplaint: string;
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  relevantHistory: string;
  questionsForDoctor: string[];
}

export interface RedFlag {
  id: string;
  label: string;
  urgency: Urgency;
}

export interface MedicineAdvice {
  id: string;
  name: string;
  examples: string[];
  usedFor: string;
  adultDose: string;
  maxDose: string;
  cautions: string[];
  reason: string;
}

export interface UsageInfo {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface ConsultResult {
  /** Today's AI allowance after this message (null in offline mode). */
  usage?: UsageInfo | null;
  sessionToken: string;
  mode: 'ai' | 'offline';
  language: ChatLanguage;
  reply: string;
  stage: 'interviewing' | 'assessment';
  quickReplies: string[];
  urgency: Urgency;
  recommendedSpecialty: Specialty | null;
  recommendedDoctors: Doctor[];
  possibleConditions: PossibleCondition[];
  selfCare: string[];
  /** Over-the-counter medicines for minor illness; doses come from the server's formulary. */
  medicines?: MedicineAdvice[];
  medicineNote?: string | null;
  redFlagsToWatch: string[];
  redFlags: RedFlag[];
  emergency: { headline: string; contacts: { name: string; number: string }[] } | null;
  summary: ClinicalSummary | null;
  usedMedicalRecord: boolean;
  disclaimer: string;
}

export interface AiStatus {
  aiEnabled: boolean;
}

export interface TriageSessionView {
  token: string;
  language: ChatLanguage;
  mode: 'ai' | 'offline';
  urgency: Urgency;
  specialty: Specialty | null;
  summary: ClinicalSummary | null;
  possibleConditions: PossibleCondition[];
  redFlags: RedFlag[];
  createdAt: string;
}

export interface ClinicalView {
  appointment: Appointment;
  patient: {
    name: string;
    age?: number;
    gender?: Gender;
    city?: string;
    currentMedication?: string;
    medicalHistory: MedicalHistoryEntry[];
  } | null;
  aiSummary: TriageSessionView | null;
  homeVisits?: import('./nurse').DoctorHomeVisit[];
  previousVisits: {
    date: string;
    doctor: string;
    specialty: Specialty;
    reason?: string | null;
    doctorNotes?: string | null;
  }[];
}

export interface ReportFinding {
  name: string;
  value: string;
  referenceRange: string;
  status: 'low' | 'normal' | 'high' | 'unclear' | 'needs review';
  explanation: string;
}

export interface ReportResult {
  possibleConditions: PossibleCondition[];
  sessionToken: string | null;
  readable: boolean;
  /** X-ray / CT / MRI / ultrasound picture: described, never diagnosed. */
  isImaging?: boolean;
  documentType: string;
  summary: string;
  findings: ReportFinding[];
  recommendedSpecialty: Specialty | null;
  recommendedDoctors: Doctor[];
  urgency: Urgency;
  questionsForDoctor: string[];
  disclaimer: string;
}
