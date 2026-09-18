import { Specialty } from '../../common/enums';

/**
 * The structured shape we expect the language model to return.
 * Kept as a plain interface (no Nest/DB imports) so this whole module is
 * pure and can be unit-tested in isolation, without a database or network.
 */
export interface AiStructuredReply {
  reply: string;
  recommendedSpecialty: string | null;
  urgency: 'routine' | 'soon' | 'emergency';
}

const VALID_URGENCIES = ['routine', 'soon', 'emergency'] as const;

/**
 * Parse the model's raw text into our structured reply.
 *
 * The model is asked to return strict JSON, but we defend against:
 *  - accidental ```json code fences,
 *  - missing / wrong-typed fields,
 *  - completely invalid output (we fall back to treating the text as the reply).
 */
export function parseStructuredReply(content: string): AiStructuredReply {
  const text = (content ?? '').trim();

  const fallback: AiStructuredReply = {
    reply:
      text ||
      'Sorry, I could not process that. Could you describe your symptoms again?',
    recommendedSpecialty: null,
    urgency: 'routine',
  };

  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    return {
      reply:
        typeof parsed.reply === 'string' && parsed.reply.trim()
          ? (parsed.reply as string)
          : fallback.reply,
      recommendedSpecialty:
        typeof parsed.recommendedSpecialty === 'string'
          ? (parsed.recommendedSpecialty as string)
          : null,
      urgency: VALID_URGENCIES.includes(parsed.urgency as never)
        ? (parsed.urgency as AiStructuredReply['urgency'])
        : 'routine',
    };
  } catch {
    return fallback;
  }
}

/**
 * Loosely map the model's free-text department name onto our Specialty enum.
 * Returns null when nothing matches so the caller can simply skip the
 * doctor-recommendation step.
 */
export function mapSpecialty(value: string | null): Specialty | null {
  if (!value) return null;
  const normalized = value.toLowerCase();

  const table: Array<[string[], Specialty]> = [
    [['neuro', 'brain', 'nerve'], Specialty.NEUROLOGY],
    [['heart', 'cardio', 'cardiac'], Specialty.HEART_CARE],
    [['osteo', 'bone', 'joint', 'ortho'], Specialty.OSTEOPOROSIS],
    [['ent', 'ear', 'nose', 'throat'], Specialty.ENT],
    [['general', 'physician', 'gp', 'family'], Specialty.GENERAL],
  ];

  for (const [keywords, specialty] of table) {
    if (keywords.some((k) => normalized.includes(k))) {
      return specialty;
    }
  }
  return null;
}
