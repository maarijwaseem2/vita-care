// Shared TypeScript types mirroring the backend API responses.

export type UserRole = 'patient' | 'doctor';
export type Gender = 'male' | 'female' | 'other';
export type Urgency = 'routine' | 'soon' | 'emergency';

export const SPECIALTIES = [
  'Neurology',
  'Heart Care',
  'Osteoporosis',
  'ENT',
  'General Physician',
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  profileId: number;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
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
  imageUrl?: string;
  rating: number;
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

export interface Appointment {
  id: number;
  doctorId: number;
  patientId?: number | null;
  patientName: string;
  patientPhone: string;
  date: string;
  timeSlot: string;
  reason?: string;
  status: 'booked' | 'completed' | 'cancelled';
  createdAt: string;
  doctor?: Doctor;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category?: string;
  author?: string;
  imageUrl?: string;
  publishedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConsultResult {
  reply: string;
  urgency: Urgency;
  recommendedSpecialty: Specialty | null;
  recommendedDoctors: Doctor[];
  disclaimer: string;
}
