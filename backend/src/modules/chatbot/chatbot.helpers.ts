import { Specialty } from '../../common/enums';

/**
 * Pure helpers for the AI Doctor: parsing the model's JSON and mapping its
 * free-text department onto our Specialty enum. No Nest / DB imports, so the
 * whole file is unit-tested in isolation.
 */

export type Urgency = 'routine' | 'soon' | 'emergency';
const VALID_URGENCIES: Urgency[] = ['routine', 'soon', 'emergency'];

export interface AiStructuredReply {
  reply: string;
  recommendedSpecialty: string | null;
  urgency: Urgency;
}

export interface PossibleCondition {
  name: string;
  likelihood: 'more likely' | 'possible' | 'less likely';
  why: string;
}

/** Clinical summary written for the doctor (always English). */
export interface ClinicalSummary {
  clinicalReasoning?: string;
  /** Red-flag phrases the patient denied or described as past history. */
  contextNotes?: string[];
  chiefComplaint: string;
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  relevantHistory: string;
  questionsForDoctor: string[];
}

export interface AiConsultReply extends AiStructuredReply {
  /** The model's short English reasoning (for the doctor, never the patient). */
  clinicalReasoning: string;
  stage: 'interviewing' | 'assessment';
  quickReplies: string[];
  possibleConditions: PossibleCondition[];
  selfCare: string[];
  redFlagsToWatch: string[];
  summary: ClinicalSummary | null;
}

const str = (v: unknown, max = 600): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const strList = (v: unknown, maxItems = 6, maxLen = 200): string[] =>
  Array.isArray(v)
    ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems)
    : [];

/** Strip ```json fences and pull out the first {...} object in the text. */
export function extractJson(content: string): Record<string, unknown> | null {
  const text = (content ?? '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Parse the model's raw text into the minimal structured reply.
 * Defends against code fences, wrong types and non-JSON output.
 */
export function parseStructuredReply(content: string): AiStructuredReply {
  const text = (content ?? '').trim();
  const fallback: AiStructuredReply = {
    reply: text || 'Sorry, I could not process that. Could you describe your symptoms again?',
    recommendedSpecialty: null,
    urgency: 'routine',
  };
  const parsed = extractJson(text);
  if (!parsed) return fallback;

  return {
    reply: str(parsed.reply, 4000) || fallback.reply,
    recommendedSpecialty:
      typeof parsed.recommendedSpecialty === 'string' ? parsed.recommendedSpecialty : null,
    urgency: VALID_URGENCIES.includes(parsed.urgency as Urgency)
      ? (parsed.urgency as Urgency)
      : 'routine',
  };
}

/** Full consult parser: base fields plus interview / assessment extras. */
export function parseConsultReply(content: string): AiConsultReply {
  const base = parseStructuredReply(content);
  const p = extractJson(content) ?? {};

  const conditions: PossibleCondition[] = Array.isArray(p.possibleConditions)
    ? (p.possibleConditions as unknown[])
        .map((c) => {
          const o = (c ?? {}) as Record<string, unknown>;
          const likelihood = ['more likely', 'possible', 'less likely'].includes(o.likelihood as string)
            ? (o.likelihood as PossibleCondition['likelihood'])
            : 'possible';
          return { name: str(o.name, 120), likelihood, why: str(o.why, 300) };
        })
        .filter((c) => c.name)
        .slice(0, 3)
    : [];

  let summary: ClinicalSummary | null = null;
  if (p.summary && typeof p.summary === 'object') {
    const s = p.summary as Record<string, unknown>;
    summary = {
      chiefComplaint: str(s.chiefComplaint, 300),
      duration: str(s.duration, 120),
      severity: str(s.severity, 120),
      associatedSymptoms: strList(s.associatedSymptoms, 10),
      relevantHistory: str(s.relevantHistory, 600),
      questionsForDoctor: strList(s.questionsForDoctor, 5, 250),
    };
    if (!summary.chiefComplaint) summary = null;
  }

  return {
    ...base,
    clinicalReasoning: str(p.clinicalReasoning, 800),
    stage: p.stage === 'assessment' ? 'assessment' : 'interviewing',
    quickReplies: strList(p.quickReplies, 4, 60),
    possibleConditions: conditions,
    selfCare: strList(p.selfCare, 5, 250),
    redFlagsToWatch: strList(p.redFlagsToWatch, 5, 200),
    summary,
  };
}

/**
 * Map the model's free-text department name onto our Specialty enum.
 * Exact enum names win; then keyword matching with word boundaries (so that
 * "mental" or "patient" never match "ent").
 */
export function mapSpecialty(value: string | null): Specialty | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (!normalized) return null;

  const exact = Object.values(Specialty).find((s) => s.toLowerCase() === normalized);
  if (exact) return exact;

  const table: Array<[RegExp, Specialty]> = [
    [/neuro|brain|nerve|migraine/, Specialty.NEUROLOGY],
    [/heart|cardio|cardiac/, Specialty.HEART_CARE],
    [/osteo|bone|joint|ortho|rheumat/, Specialty.OSTEOPOROSIS],
    [/\bent\b|\bear\b|nose|throat|otolaryng/, Specialty.ENT],
    [/p(a)?ediatric|paed|child|infant/, Specialty.PEDIATRICS],
    [/gyn|obstet|women'?s health|pregnan/, Specialty.GYNECOLOGY],
    [/derma|skin/, Specialty.DERMATOLOGY],
    [/psychi|psycholog|mental/, Specialty.PSYCHIATRY],
    [/general|physician|\bgp\b|family|internal medicine/, Specialty.GENERAL],
  ];
  for (const [re, specialty] of table) {
    if (re.test(normalized)) return specialty;
  }
  return null;
}
