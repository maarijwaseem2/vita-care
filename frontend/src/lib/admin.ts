import { http, tokenStorage } from './api';
import type { BlogPost, Doctor, Paged, Urgency } from './types';

export interface AdminStats {
  patients: number;
  doctorsVerified: number;
  doctorsPending: number;
  appointments: number;
  upcomingAppointments: number;
  bookingsWithAiSummary: number;
  consultations: number;
  emergencies: number;
  emergenciesUnreviewed: number;
  offlineConsultations: number;
  postsPublished: number;
  nursesVerified?: number;
  nursesPending?: number;
  homeVisits?: number;
  homeVisitsOpen?: number;
  homeVisitEmergencies?: number;
  daily: { day: string; consultations: number; bookings: number }[];
  bySpecialty: { specialty: string; count: number }[];
  byLanguage: { language: string; count: number }[];
  byUrgency: { urgency: Urgency; count: number }[];
}

export interface AdminDoctor extends Doctor {
  pmdcNumber: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationNote: string | null;
  verifiedAt: string | null;
  clinicName: string | null;
  experienceYears: number | null;
  languages: string[] | null;
  createdAt: string;
  user?: { email: string; isActive: boolean; createdAt: string };
}

export interface AdminTriageRow {
  id: number;
  token: string;
  language: string;
  mode: string;
  source: string;
  urgency: Urgency;
  specialty: string | null;
  redFlags: { id: string; label: string }[] | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  firstMessage: string;
  turns: number;
  patientId: number | null;
}

export interface AdminTriageFull extends Omit<AdminTriageRow, 'firstMessage' | 'turns'> {
  transcript: { role: string; content: string }[];
  summary: Record<string, unknown> | null;
  possibleConditions: { name: string; likelihood: string; why: string }[] | null;
}

export interface AdminUser {
  id: number;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  isActive: boolean;
  createdAt: string;
  name: string;
  city: string | null;
}

export interface AuditEntry {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface BlogInput {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  category?: string;
  author?: string;
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: 'draft' | 'published';
}

type Q = Record<string, string | number | undefined>;
const get = async <T>(url: string, params?: Q) => (await http.get<T>(url, { params })).data;

export const adminApi = {
  stats: () => get<AdminStats>('/admin/stats'),
  doctors: (p: Q) => get<Paged<AdminDoctor>>('/admin/doctors', p),
  verify: async (id: number, status: 'verified' | 'rejected' | 'pending', note?: string) =>
    (await http.patch<AdminDoctor>(`/admin/doctors/${id}/verification`, { status, note })).data,
  triage: (p: Q) => get<Paged<AdminTriageRow>>('/admin/triage', p),
  triageOne: (id: number) => get<AdminTriageFull>(`/admin/triage/${id}`),
  review: async (id: number, note: string) => (await http.patch(`/admin/triage/${id}/review`, { note })).data,
  users: (p: Q) => get<Paged<AdminUser>>('/admin/users', p),
  setActive: async (id: number, isActive: boolean) =>
    (await http.patch(`/admin/users/${id}/active`, { isActive })).data,
  audit: (p: Q) => get<Paged<AuditEntry>>('/admin/audit', p),
  blogList: (p: Q) => get<Paged<BlogPost>>('/admin/blog', p),
  blogGet: (id: number) => get<BlogPost>(`/admin/blog/${id}`),
  blogCreate: async (b: BlogInput) => {
    const post = (await http.post<BlogPost>('/admin/blog', b)).data;
    await refreshPublicBlog(post.slug);
    return post;
  },
  blogUpdate: async (id: number, b: BlogInput, oldSlug?: string) => {
    const post = (await http.patch<BlogPost>(`/admin/blog/${id}`, b)).data;
    await refreshPublicBlog(post.slug, oldSlug);
    return post;
  },
  blogDelete: async (id: number, slug?: string) => {
    const res = (await http.delete(`/admin/blog/${id}`)).data;
    await refreshPublicBlog(slug);
    return res;
  },
  slugFor: async (title: string, excludeId?: number) =>
    (await get<{ slug: string }>('/admin/blog/slug-suggestion', { title, excludeId })).slug,
  upload: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return (await http.post<{ url: string }>('/admin/uploads', form)).data.url;
  },
};

/**
 * Ask the Next.js server to rebuild the public blog pages now (admin token
 * required), so a published or edited post shows up immediately.
 * Never throws: a failed refresh only means the normal 60 s cache applies.
 */
async function refreshPublicBlog(slug?: string, oldSlug?: string) {
  try {
    const token = tokenStorage.get();
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ slug, oldSlug }),
    });
  } catch {
    /* ignore */
  }
}
