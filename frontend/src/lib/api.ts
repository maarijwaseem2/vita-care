import axios, { AxiosError } from 'axios';
import type {
  AiStatus,
  Appointment,
  Availability,
  AuthResponse,
  ChatLanguage,
  ClinicalView,
  ReportResult,
  TriageSessionView,
  BlogPost,
  ChatMessage,
  ConsultResult,
  Doctor,
  Paged,
  Patient,
  Specialty,
} from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TOKEN_KEY = 'vitacare_token';

/** Central axios instance. Attaches the JWT (if present) to every request. */
export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/** Turn an axios error into a plain, user-friendly message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string | string[] };
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a minute and try again.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot reach the server. Is the backend running?';
    }
  }
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  async loginRequest(email: string, password: string): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  async registerPatient(payload: Record<string, unknown>): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>(
      '/auth/register/patient',
      payload,
    );
    return data;
  },

  async registerDoctor(payload: Record<string, unknown>): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>(
      '/auth/register/doctor',
      payload,
    );
    return data;
  },
};

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------
export const doctorsApi = {
  async list(params?: {
    city?: string;
    specialty?: Specialty;
    search?: string;
  }): Promise<Doctor[]> {
    const { data } = await http.get<Doctor[]>('/doctors', { params });
    return data;
  },

  async get(id: number): Promise<Doctor> {
    const { data } = await http.get<Doctor>(`/doctors/${id}`);
    return data;
  },

  async cities(): Promise<string[]> {
    const { data } = await http.get<string[]>('/doctors/cities');
    return data;
  },

  async myProfile(): Promise<Doctor> {
    const { data } = await http.get<Doctor>('/doctors/me/profile');
    return data;
  },

  async update(id: number, payload: Partial<Doctor>): Promise<Doctor> {
    const { data } = await http.patch<Doctor>(`/doctors/${id}`, payload);
    return data;
  },
};

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
export const patientsApi = {
  async me(): Promise<Patient> {
    const { data } = await http.get<Patient>('/patients/me');
    return data;
  },

  async update(id: number, payload: Partial<Patient>): Promise<Patient> {
    const { data } = await http.patch<Patient>(`/patients/${id}`, payload);
    return data;
  },

  async addHistory(
    id: number,
    payload: { condition: string; notes?: string; diagnosedAt?: string },
  ) {
    const { data } = await http.post(`/patients/${id}/medical-history`, payload);
    return data;
  },

  async removeHistory(id: number, historyId: number) {
    const { data } = await http.delete(
      `/patients/${id}/medical-history/${historyId}`,
    );
    return data;
  },
};

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export const appointmentsApi = {
  async book(payload: {
    doctorId: number;
    patientName: string;
    patientPhone: string;
    date: string;
    timeSlot: string;
    reason?: string;
    triageSessionToken?: string;
    visitType?: 'clinic' | 'home';
    homeAddress?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<Appointment> {
    const { data } = await http.post<Appointment>('/appointments', payload);
    return data;
  },

  async availability(doctorId: number, date: string): Promise<Availability> {
    const { data } = await http.get<Availability>('/appointments/availability', {
      params: { doctorId, date },
    });
    return data;
  },

  async receipt(reference: string): Promise<Appointment> {
    const { data } = await http.get<Appointment>(
      `/appointments/receipt/${encodeURIComponent(reference)}`,
    );
    return data;
  },

  async myPatientAppointments(): Promise<Appointment[]> {
    const { data } = await http.get<Appointment[]>('/appointments/me/patient');
    return data;
  },

  async myDoctorAppointments(): Promise<Appointment[]> {
    const { data } = await http.get<Appointment[]>('/appointments/me/doctor');
    return data;
  },

  async clinical(id: number): Promise<ClinicalView> {
    const { data } = await http.get<ClinicalView>(`/appointments/${id}/clinical`);
    return data;
  },

  async setStatus(
    id: number,
    status: 'completed' | 'cancelled',
    doctorNotes?: string,
  ): Promise<Appointment> {
    const { data } = await http.patch<Appointment>(`/appointments/${id}/status`, {
      status,
      ...(doctorNotes !== undefined ? { doctorNotes } : {}),
    });
    return data;
  },
};

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------
export const blogApi = {
  async list(params: { page?: number; limit?: number; category?: string } = {}): Promise<Paged<BlogPost>> {
    const { data } = await http.get<Paged<BlogPost>>('/blog', { params });
    return data;
  },

  async get(slug: string): Promise<BlogPost> {
    const { data } = await http.get<BlogPost>(`/blog/${slug}`);
    return data;
  },
};

// ---------------------------------------------------------------------------
// Chatbot (AI Doctor)
// ---------------------------------------------------------------------------
export const chatbotApi = {
  async status(): Promise<AiStatus> {
    const { data } = await http.get<AiStatus>('/chatbot/status');
    return data;
  },

  async consult(
    messages: ChatMessage[],
    opts: { language?: ChatLanguage; sessionToken?: string } = {},
  ): Promise<ConsultResult> {
    const { data } = await http.post<ConsultResult>('/chatbot/consult', {
      messages,
      ...opts,
    });
    return data;
  },

  async session(token: string): Promise<TriageSessionView> {
    const { data } = await http.get<TriageSessionView>(`/chatbot/sessions/${token}`);
    return data;
  },

  async report(payload: {
    imageBase64: string;
    mimeType: string;
    language?: ChatLanguage;
  }): Promise<ReportResult> {
    const { data } = await http.post<ReportResult>('/chatbot/report', payload, {
      timeout: 90_000,
    });
    return data;
  },
};

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export const tokenStorage = {
  get: () =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ---------------------------------------------------------------------------
// Voice (server-side speech, OpenAI audio)
// ---------------------------------------------------------------------------
export const voiceApi = {
  async status(): Promise<{ serverVoice: boolean; provider: string }> {
    const { data } = await http.get('/voice/status');
    return data;
  },
  async transcribe(audio: Blob, language: ChatLanguage): Promise<string> {
    const form = new FormData();
    const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', audio, `speech.${ext}`);
    form.append('language', language);
    const { data } = await http.post<{ text: string }>('/voice/transcribe', form, { timeout: 60_000 });
    return data.text;
  },
  async speak(text: string, language: ChatLanguage): Promise<Blob> {
    const { data } = await http.post('/voice/speak', { text, language }, { responseType: 'blob', timeout: 60_000 });
    return data as Blob;
  },
};
