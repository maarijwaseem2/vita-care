import { http } from './api';
import type { Paged } from './types';

export type ServiceId =
  | 'injection' | 'wound_care' | 'vitals' | 'elderly_care' | 'post_op' | 'catheter' | 'mother_baby' | 'sample';

export const SERVICES: { id: ServiceId; label: string; urdu: string }[] = [
  { id: 'injection', label: 'Injection / IV drip', urdu: 'انجکشن / ڈرپ' },
  { id: 'wound_care', label: 'Wound dressing', urdu: 'زخم کی پٹی' },
  { id: 'vitals', label: 'BP, sugar & vitals check', urdu: 'بی پی اور شوگر چیک' },
  { id: 'elderly_care', label: 'Elderly / bedridden care', urdu: 'بزرگوں کی دیکھ بھال' },
  { id: 'post_op', label: 'Post-surgery care', urdu: 'آپریشن کے بعد' },
  { id: 'catheter', label: 'Catheter / NG tube care', urdu: 'کیتھیٹر' },
  { id: 'mother_baby', label: 'Mother & newborn care', urdu: 'ماں اور نومولود' },
  { id: 'sample', label: 'Blood sample collection', urdu: 'خون کا نمونہ' },
];
export const serviceLabel = (id: string) => SERVICES.find((s) => s.id === id)?.label ?? id;

export const QUALIFICATIONS = ['BSN (Registered Nurse)', 'Diploma RN', 'Post-RN BSN', 'Midwife', 'Lady Health Visitor (LHV)', 'Licensed Practical Nurse'];
/** Single visits (about 1 hour) or full 12-hour duties, as home-care nurses usually work. */
export const WINDOWS = [
  { id: 'morning', label: 'Single visit · Morning (8 AM–12 PM)', shift: false },
  { id: 'afternoon', label: 'Single visit · Afternoon (12–4 PM)', shift: false },
  { id: 'evening', label: 'Single visit · Evening (4–8 PM)', shift: false },
  { id: 'day_shift', label: '12-hour day duty (8 AM–8 PM)', shift: true },
  { id: 'night_shift', label: '12-hour night duty (8 PM–8 AM)', shift: true },
];
export const windowLabel = (id: string) => WINDOWS.find((w) => w.id === id)?.label ?? id;

export interface Vitals {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  pulse?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  bloodSugar?: number | null;
  respiratoryRate?: number | null;
}
export interface VitalAlert { vital: keyof Vitals; level: 'soon' | 'emergency'; message: string }

export interface PublicNurse {
  id: number; firstName: string; lastName: string; gender: 'male' | 'female' | null; city: string;
  areas: string[] | null; qualification: string; skills: ServiceId[] | null; experienceYears: number | null;
  visitFee: number; availableDays: string | null; bio: string | null; rating: number; phone?: string | null;
}

export interface NurseProfile extends PublicNurse {
  pncNumber: string; phone: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected'; verificationNote: string | null;
  user?: { email: string; isActive: boolean };
  createdAt: string;
}

export type VisitStatus = 'requested' | 'accepted' | 'completed' | 'cancelled';

export interface PatientVisit {
  id: number; reference: string; service: ServiceId; visitDate: string; timeWindow: string; address: string; city: string;
  preferredGender: string; notes: string | null; status: VisitStatus; vitals: Vitals | null; vitalAlerts: VitalAlert[] | null;
  alertLevel: 'soon' | 'emergency' | null; nurseNotes: string | null;
  nurse: PublicNurse | null; orderedByDoctor: { id: number; name: string } | null;
}

export interface NurseVisit {
  id: number; reference: string; service: ServiceId; visitDate: string; timeWindow: string; city: string; address: string;
  preferredGender: string; notes: string | null; status: VisitStatus; vitals: Vitals | null; vitalAlerts: VitalAlert[];
  alertLevel: 'soon' | 'emergency' | null; nurseNotes: string | null; directRequest: boolean; orderedBy: string | null;
  latitude?: number | null; longitude?: number | null;
  patient: { name: string; age: number | null; gender: string | null; phone: string | null; conditions?: string[]; currentMedication?: string | null } | null;
}

export interface DoctorHomeVisit {
  id: number; service: ServiceId; visitDate: string; status: VisitStatus; nurse: string | null;
  vitals: Vitals | null; vitalAlerts: VitalAlert[]; alertLevel: 'soon' | 'emergency' | null; nurseNotes: string | null;
}

export interface RegisterNursePayload {
  email: string; password: string; firstName: string; lastName: string; gender: 'male' | 'female'; phone?: string;
  city: string; areas?: string[]; qualification: string; pncNumber: string; skills: ServiceId[];
  experienceYears?: number; visitFee: number; availableDays?: string; bio?: string;
}

export const nursesApi = {
  list: (params: { city?: string; gender?: string; service?: string }) =>
    http.get<PublicNurse[]>('/nurses', { params }).then((r) => r.data),
  me: () => http.get<NurseProfile>('/nurses/me').then((r) => r.data),
  updateMe: (data: Partial<NurseProfile>) => http.patch<NurseProfile>('/nurses/me', data).then((r) => r.data),
};

export const homeCareApi = {
  create: (data: {
    service: ServiceId; visitDate: string; timeWindow: string; address: string; city: string;
    preferredGender?: string; notes?: string; nurseId?: number; latitude?: number; longitude?: number;
  }) => http.post<PatientVisit>('/home-care', data).then((r) => r.data),
  minePatient: () => http.get<PatientVisit[]>('/home-care/me/patient').then((r) => r.data),
  cancel: (id: number) => http.patch(`/home-care/${id}/cancel`).then((r) => r.data),
  open: () => http.get<NurseVisit[]>('/home-care/nurse/open').then((r) => r.data),
  mineNurse: () => http.get<NurseVisit[]>('/home-care/nurse/mine').then((r) => r.data),
  accept: (id: number) => http.patch(`/home-care/${id}/accept`).then((r) => r.data),
  decline: (id: number) => http.patch(`/home-care/${id}/decline`).then((r) => r.data),
  complete: (id: number, vitals: Vitals, notes: string) =>
    http.patch<NurseVisit>(`/home-care/${id}/complete`, { vitals, notes }).then((r) => r.data),
  order: (data: { appointmentId: number; service: ServiceId; visitDate: string; timeWindow?: string; notes?: string }) =>
    http.post('/home-care/order', data).then((r) => r.data),
};

export const adminNursesApi = {
  list: (params: { status?: string; search?: string; page?: number }) =>
    http.get<Paged<NurseProfile>>('/admin/nurses', { params }).then((r) => r.data),
  verify: (id: number, status: 'verified' | 'rejected' | 'pending', note?: string) =>
    http.patch(`/admin/nurses/${id}/verification`, { status, note }).then((r) => r.data),
};

/** Human label for a vital sign key. */
export const VITAL_LABELS: Record<keyof Vitals, string> = {
  bpSystolic: 'BP', bpDiastolic: 'BP', pulse: 'Pulse', temperatureC: 'Temp', spo2: 'SpO₂', bloodSugar: 'Sugar', respiratoryRate: 'Resp. rate',
};

export function formatVitals(v: Vitals | null): string[] {
  if (!v) return [];
  const out: string[] = [];
  if (v.bpSystolic || v.bpDiastolic) out.push(`BP ${v.bpSystolic ?? '–'}/${v.bpDiastolic ?? '–'}`);
  if (v.pulse) out.push(`Pulse ${v.pulse}`);
  if (v.temperatureC) out.push(`Temp ${v.temperatureC}°C`);
  if (v.spo2) out.push(`SpO₂ ${v.spo2}%`);
  if (v.bloodSugar) out.push(`Sugar ${v.bloodSugar} mg/dL`);
  if (v.respiratoryRate) out.push(`Resp ${v.respiratoryRate}/min`);
  return out;
}

/** Google Maps link: exact pin if the patient shared a location, else the address. */
export function mapsLink(address: string, lat?: number | null, lng?: number | null): string {
  const q = lat != null && lng != null ? `${lat},${lng}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
