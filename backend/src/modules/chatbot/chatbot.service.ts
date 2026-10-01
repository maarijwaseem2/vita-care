import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ChatDto, ReportDto } from './dto/chat.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Specialty, UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TriageSession } from './entities/triage-session.entity';
import { AiClient, AiUnavailableError } from './ai-client';
import {
  AiConsultReply,
  PossibleCondition,
  ClinicalSummary,
  extractJson,
  mapSpecialty,
  parseConsultReply,
} from './chatbot.helpers';
import { ChatLanguage, detectLanguage } from './language';
import { knowledgeForPrompt, retrieveKnowledge } from './knowledge';
import {
  EmergencyInfo,
  RedFlag,
  Urgency,
  analyseRedFlags,
  emergencyInfo,
  maxUrgency,
  urgencyFromFlags,
} from './safety';
import { offlineConsult, refineSpecialty } from './offline-triage';
import { MedicineAdvice, offlineMedicinePicks, resolveMedicines } from './medicines';
import { consultSystemPrompt, reportSystemPrompt, safetyCheckPrompt } from './prompts';

export interface ConsultResult {
  /** Over-the-counter medicines for minor illness (doses from our formulary, safety-filtered). */
  medicines: MedicineAdvice[];
  /** Why no medicines were suggested (pregnancy, child), if relevant. */
  medicineNote: string | null;
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
  redFlagsToWatch: string[];
  redFlags: RedFlag[];
  emergency: EmergencyInfo | null;
  summary: ClinicalSummary | null;
  usedMedicalRecord: boolean;
  disclaimer: string;
}

export interface ReportFinding {
  name: string;
  value: string;
  referenceRange: string;
  status: 'low' | 'normal' | 'high' | 'unclear' | 'needs review';
  explanation: string;
}

export interface ReportResult {
  readable: boolean;
  /** true for an X-ray / CT / MRI / ultrasound picture (described only, never diagnosed). */
  isImaging: boolean;
  documentType: string;
  summary: string;
  findings: ReportFinding[];
  recommendedSpecialty: Specialty | null;
  recommendedDoctors: Doctor[];
  urgency: Urgency;
  possibleConditions: PossibleCondition[];
  questionsForDoctor: string[];
  /** Attach this report to a booking so the doctor sees it. */
  sessionToken: string | null;
  disclaimer: string;
}

const DISCLAIMER =
  'Preliminary AI guidance, not a medical diagnosis. A licensed doctor must confirm. ' +
  'In an emergency call 1122.';

/**
 * The AI Doctor.
 *
 * Pipeline for every patient turn:
 *   1. Deterministic red-flag guard scans the patient's words (en / ur / roman-ur).
 *   2. Patient record (age, conditions, medicines) is loaded from the DB.
 *   3. Qwen interviews / assesses, returning strict JSON.
 *      If the model is unavailable, a rule-based interviewer takes over (mode "offline").
 *   4. Final urgency = max(model, guard) — the guard can only escalate.
 *   5. Real doctors in that department are recommended, patient's city first.
 *   6. The session is saved so it can be attached to a booking for the doctor.
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly ai: AiClient,
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    @InjectRepository(TriageSession)
    private readonly sessions: Repository<TriageSession>,
  ) {}

  async consult(dto: ChatDto, user?: AuthUser | null): Promise<ConsultResult> {
    const userText = dto.messages.filter((m) => m.role === 'user').map((m) => m.content);
    // Detect from the whole conversation: short answers like "2 din" or
    // "Moderate" should not flip the language mid-consultation.
    const language: ChatLanguage = dto.language ?? detectLanguage(userText.join(' '));

    // 1. Safety guard over everything the patient has said (negation / history aware).
    const allText = userText.join('\n');
    const analysed = analyseRedFlags(allText);
    const redFlags: RedFlag[] = analysed
      .filter((f) => f.status === 'active')
      .map(({ id, label, urgency }) => ({ id, label, urgency }));
    const contextNotes = analysed
      .filter((f) => f.status !== 'active')
      .map((f) => `${f.label} (${f.status === 'negated' ? 'denied' : f.status === 'informational' ? 'asked about, not reported' : 'past history'})`);

    // 2. Medical record context (server-side, never trusted from the client).
    const patient = await this.loadPatient(user);
    const profile = patient ? this.describePatient(patient) : null;

    // 3. Model (with retrieved guidance) + an independent emergency check, in parallel.
    //    If the model is unavailable, a rule-based interviewer takes over.
    const knowledge = knowledgeForPrompt(retrieveKnowledge(allText));
    let mode: 'ai' | 'offline' = 'ai';
    let reply: AiConsultReply;
    const hasActiveEmergency = redFlags.some((f) => f.urgency === 'emergency');
    const [main, second] = await Promise.allSettled([
      this.ai.complete(
        [
          {
            role: 'system',
            content: consultSystemPrompt({
              language,
              patientProfile: profile,
              redFlagLabels: redFlags.filter((f) => f.urgency === 'emergency').map((f) => f.label),
              knowledge,
              contextNotes,
            }),
          },
          ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        { json: true },
      ),
      hasActiveEmergency ? Promise.resolve(null) : this.safetySecondOpinion(userText),
    ]);
    if (main.status === 'fulfilled') {
      reply = parseConsultReply(main.value);
    } else {
      if (!(main.reason instanceof AiUnavailableError)) throw main.reason;
      mode = 'offline';
      reply = offlineConsult(dto.messages, language);
    }
    if (second.status === 'fulfilled' && second.value) {
      redFlags.push({ id: 'ai_safety_check', label: `AI safety check: ${second.value}`, urgency: 'emergency' });
    }
    const guardUrgency = urgencyFromFlags(redFlags);
    if (reply.summary) {
      reply.summary = {
        ...reply.summary,
        clinicalReasoning: reply.clinicalReasoning || undefined,
        contextNotes: contextNotes.length ? contextNotes : undefined,
      };
    }

    // 4. The guard can only escalate.
    const urgency = maxUrgency(reply.urgency, guardUrgency);
    const isEmergency = urgency === 'emergency';
    const stage = isEmergency ? 'assessment' : reply.stage;
    // If the guard overruled the model (or no model ran), the model's calmer
    // wording must not be shown next to an emergency banner.
    const guardOverruled = isEmergency && reply.urgency !== 'emergency';
    let replyText = reply.reply;
    if (isEmergency && (mode === 'offline' || guardOverruled)) {
      replyText = emergencyInfo(redFlags, language).headline;
    }
    if (guardOverruled) {
      reply.possibleConditions = [];
      reply.selfCare = [];
    }

    // 5. Department (a vague "General Physician" is sharpened by the patient's own words),
    //    then doctors in it, patient's city first.
    const specialty =
      stage === 'assessment'
        ? refineSpecialty(mapSpecialty(reply.recommendedSpecialty), allText)
        : mapSpecialty(reply.recommendedSpecialty);

    // 5b. Over-the-counter medicines for minor, non-emergency problems only.
    //     If the model suggested none for a routine case, the rule-based picks are used.
    let medicines: MedicineAdvice[] = [];
    let medicineNote: string | null = null;
    if (stage === 'assessment' && urgency !== 'emergency') {
      const picks = reply.medicinePicks.length
        ? reply.medicinePicks
        : urgency === 'routine'
          ? offlineMedicinePicks(allText)
          : [];
      const resolved = resolveMedicines(picks, {
        text: allText,
        record: profile,
        age: patient?.age ?? null,
        urgency,
      });
      medicines = resolved.medicines;
      medicineNote = resolved.note;
      if (reply.summary && medicines.length) {
        reply.summary.suggestedOtc = medicines.map((m) => m.name);
      }
    }

    const recommendedDoctors =
      specialty && stage === 'assessment'
        ? await this.doctorsService.findBySpecialty(specialty, 3, patient?.city)
        : [];

    // 6. Persist.
    const session = await this.saveSession(dto, {
      patientId: patient?.id ?? null,
      language,
      mode,
      urgency,
      specialty,
      summary: reply.summary,
      possibleConditions: reply.possibleConditions,
      redFlags,
      assistantReply: replyText,
    });

    return {
      sessionToken: session.token,
      mode,
      language,
      reply: replyText,
      stage,
      quickReplies: isEmergency ? [] : reply.quickReplies,
      urgency,
      recommendedSpecialty: specialty,
      recommendedDoctors,
      possibleConditions: reply.possibleConditions,
      selfCare: reply.selfCare,
      medicines,
      medicineNote,
      redFlagsToWatch: reply.redFlagsToWatch,
      redFlags,
      emergency: isEmergency ? emergencyInfo(redFlags, language) : null,
      summary: reply.summary,
      usedMedicalRecord: !!profile,
      disclaimer: DISCLAIMER,
    };
  }

  /** Explain a photo of a lab report or prescription (Qwen-VL). */
  async explainReport(dto: ReportDto, user?: AuthUser | null): Promise<ReportResult> {
    const language: ChatLanguage = dto.language ?? 'en';
    const patient = await this.loadPatient(user);
    let raw: string;
    try {
      raw = await this.ai.complete(
        [
          { role: 'system', content: reportSystemPrompt(language) },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${dto.mimeType};base64,${dto.imageBase64.replace(/\s/g, '')}` },
              },
              {
                type: 'text',
                text: patient
                  ? `Patient context: ${this.describePatient(patient)}\nExplain this document.`
                  : 'Explain this document.',
              },
            ],
          },
        ],
        { model: this.ai.visionModel, json: true, timeoutMs: 60_000 },
      );
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        throw new ServiceUnavailableException(
          err.reason === 'not_configured'
            ? 'Report reading needs the AI to be switched on (set AI_API_KEY on the server).'
            : 'The report reader is temporarily unavailable. Please try again.',
        );
      }
      throw err;
    }

    const p = extractJson(raw) ?? {};
    const statuses = ['low', 'normal', 'high', 'unclear', 'needs review'];
    const s = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const findings: ReportFinding[] = Array.isArray(p.findings)
      ? (p.findings as any[])
          .map((f) => ({
            name: s(f?.name, 120),
            value: s(f?.value, 60),
            referenceRange: s(f?.referenceRange, 60),
            status: statuses.includes(f?.status) ? f.status : 'unclear',
            explanation: s(f?.explanation, 300),
          }))
          .filter((f) => f.name)
          .slice(0, 40)
      : [];
    const docType = s(p.documentType, 40).toLowerCase();
    // A scan image is described, never diagnosed: no conditions, sent to a radiologist.
    const isImaging = /x-?ray|ct|mri|ultrasound|scan/.test(docType) && !/report/.test(docType);
    const specialty = isImaging
      ? Specialty.RADIOLOGY
      : mapSpecialty(typeof p.recommendedSpecialty === 'string' ? p.recommendedSpecialty : null);
    const urgency: Urgency = isImaging
      ? p.urgency === 'emergency' ? 'soon' : 'routine'
      : ['routine', 'soon', 'emergency'].includes(p.urgency as string)
      ? (p.urgency as Urgency)
      : 'routine';
    const possibleConditions = isImaging
      ? []
      : parseConsultReply(JSON.stringify({ reply: 'x', possibleConditions: p.possibleConditions })).possibleConditions;
    const readable = p.readable !== false;
    const summaryText = s(p.summary, 1500) || raw.slice(0, 1500);

    // Save as a consultation (source "report") so it can be attached to a booking.
    let sessionToken: string | null = null;
    if (readable && findings.length) {
      const abnormal = findings.filter((f) => f.status === 'low' || f.status === 'high');
      const session = await this.sessions
        .save(
          this.sessions.create({
            token: randomUUID(),
            patientId: patient?.id ?? null,
            language,
            mode: 'ai',
            source: 'report',
            urgency,
            specialty,
            possibleConditions,
            redFlags: [],
            summary: {
              chiefComplaint: `Uploaded ${s(p.documentType, 40) || 'lab report'} for explanation`,
              duration: '',
              severity: '',
              associatedSymptoms: [],
              relevantHistory: abnormal.length
                ? `Abnormal: ${abnormal.map((f) => `${f.name} ${f.value} (${f.status}, ref ${f.referenceRange || 'n/a'})`).join('; ')}`
                : 'All readable values within the printed reference ranges.',
              questionsForDoctor: [],
              clinicalReasoning: summaryText.slice(0, 800),
            } as unknown as Record<string, unknown>,
            transcript: [{ role: 'assistant', content: summaryText }],
          }),
        )
        .catch(() => null);
      sessionToken = session?.token ?? null;
    }

    return {
      readable,
      isImaging,
      documentType: s(p.documentType, 40) || 'other',
      summary: summaryText,
      findings,
      recommendedSpecialty: specialty,
      recommendedDoctors: specialty
        ? await this.doctorsService.findBySpecialty(specialty, 3, patient?.city)
        : [],
      urgency,
      possibleConditions,
      sessionToken,
      questionsForDoctor: Array.isArray(p.questionsForDoctor)
        ? (p.questionsForDoctor as unknown[]).map((q) => s(q, 250)).filter(Boolean).slice(0, 5)
        : [],
      disclaimer: DISCLAIMER,
    };
  }

  /** Public view of a session by its token (used by the booking page). */
  /**
   * A guest's session is readable with its (unguessable) token alone.
   * A signed-in patient's session is readable only by that patient.
   */
  async getSessionByToken(token: string, user?: AuthUser | null) {
    const session = await this.sessions.findOne({ where: { token } });
    if (!session) throw new NotFoundException('Consultation not found');
    if (session.patientId) {
      const me = await this.loadPatient(user);
      if (me?.id !== session.patientId) throw new NotFoundException('Consultation not found');
    }
    return this.publicSession(session);
  }

  /** Resolve a token to a session id, for linking to a booking. */
  async resolveToken(token?: string | null): Promise<number | null> {
    if (!token) return null;
    const session = await this.sessions.findOne({ where: { token }, select: { id: true } });
    return session?.id ?? null;
  }

  publicSession(s: TriageSession) {
    return {
      token: s.token,
      language: s.language,
      mode: s.mode,
      source: s.source,
      urgency: s.urgency,
      specialty: s.specialty,
      summary: s.summary,
      possibleConditions: s.possibleConditions ?? [],
      redFlags: s.redFlags ?? [],
      createdAt: s.createdAt,
    };
  }

  // --- helpers ---

  /**
   * Narrow, independent "is this an emergency?" question to the model.
   * Returns a reason when it says yes; null otherwise or on any failure
   * (it can only ever add urgency, never block the main answer).
   */
  private async safetySecondOpinion(userText: string[]): Promise<string | null> {
    if (!this.ai.configured) return null;
    try {
      const raw = await this.ai.complete(
        [
          { role: 'system', content: safetyCheckPrompt() },
          { role: 'user', content: userText.slice(-6).join('\n---\n') },
        ],
        { json: true, temperature: 0, timeoutMs: 12_000 },
      );
      const p = extractJson(raw);
      return p?.emergency === true ? String(p.reason ?? 'possible emergency').slice(0, 120) : null;
    } catch {
      return null;
    }
  }

  private async loadPatient(user?: AuthUser | null): Promise<Patient | null> {
    if (!user || user.role !== UserRole.PATIENT) return null;
    return this.patientsService.findByUserId(user.userId).catch(() => null);
  }

  private describePatient(p: Patient): string {
    const parts = [
      p.age ? `Age ${p.age}` : null,
      p.gender ? `gender ${p.gender}` : null,
      p.city ? `lives in ${p.city}` : null,
    ].filter(Boolean);
    const history = (p.medicalHistory ?? [])
      .map((h) => `${h.condition}${h.diagnosedAt ? ` (since ${h.diagnosedAt.slice(0, 4)})` : ''}${h.notes ? ` – ${h.notes}` : ''}`)
      .join('; ');
    return [
      parts.join(', ') || 'Basic details not provided',
      `Known conditions: ${history || 'none recorded'}`,
      `Current medicines: ${p.currentMedication || 'none recorded'}`,
    ].join('\n');
  }

  private async saveSession(
    dto: ChatDto,
    data: {
      patientId: number | null;
      language: ChatLanguage;
      mode: 'ai' | 'offline';
      urgency: Urgency;
      specialty: Specialty | null;
      summary: ClinicalSummary | null;
      possibleConditions: PossibleCondition[];
      redFlags: RedFlag[];
      assistantReply: string;
    },
  ): Promise<TriageSession> {
    let session = dto.sessionToken
      ? await this.sessions.findOne({ where: { token: dto.sessionToken } })
      : null;
    // A token for someone else's record is treated as a new session.
    if (session && session.patientId && session.patientId !== data.patientId) session = null;
    if (!session) session = this.sessions.create({ token: randomUUID() });

    session.patientId = data.patientId ?? session.patientId ?? null;
    session.language = data.language;
    session.mode = data.mode;
    session.urgency = maxUrgency((session.urgency as Urgency) ?? 'routine', data.urgency);
    session.specialty = data.specialty ?? session.specialty ?? null;
    if (data.summary) session.summary = data.summary as unknown as Record<string, unknown>;
    if (data.possibleConditions.length) session.possibleConditions = data.possibleConditions;
    if (data.redFlags.length) session.redFlags = data.redFlags;
    session.transcript = [
      ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'assistant', content: data.assistantReply },
    ].slice(-40);

    try {
      return await this.sessions.save(session);
    } catch (err) {
      this.logger.error(`Could not save triage session: ${(err as Error).message}`);
      return session;
    }
  }
}
