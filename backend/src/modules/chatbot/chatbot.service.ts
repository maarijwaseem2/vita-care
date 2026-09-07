import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatDto } from './dto/chat.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { Specialty } from '../../common/enums';
import { Doctor } from '../doctors/entities/doctor.entity';

interface AiStructuredReply {
  reply: string;
  recommendedSpecialty: string | null;
  urgency: 'routine' | 'soon' | 'emergency';
}

export interface ConsultResult {
  reply: string;
  urgency: 'routine' | 'soon' | 'emergency';
  recommendedSpecialty: Specialty | null;
  recommendedDoctors: Doctor[];
  disclaimer: string;
}

/**
 * The "AI Doctor". Sends the patient's described symptoms to an
 * OpenAI-compatible chat model, then maps the model's suggested department to
 * real doctors stored in our database so the patient can book a follow-up.
 *
 * IMPORTANT: this provides *preliminary guidance only* and is not a diagnosis.
 * That boundary is enforced in the system prompt and surfaced to the user.
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  private static readonly DISCLAIMER =
    'This is preliminary AI guidance, not a medical diagnosis. For anything ' +
    'urgent or worsening, contact a licensed doctor or emergency services.';

  constructor(
    private readonly configService: ConfigService,
    private readonly doctorsService: DoctorsService,
  ) {}

  async consult(dto: ChatDto): Promise<ConsultResult> {
    const structured = await this.askModel(dto);

    const specialty = this.mapSpecialty(structured.recommendedSpecialty);
    const recommendedDoctors = specialty
      ? await this.doctorsService.findBySpecialty(specialty, 3)
      : [];

    return {
      reply: structured.reply,
      urgency: structured.urgency,
      recommendedSpecialty: specialty,
      recommendedDoctors,
      disclaimer: ChatbotService.DISCLAIMER,
    };
  }

  // --- LLM call ---

  private async askModel(dto: ChatDto): Promise<AiStructuredReply> {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    const baseUrl =
      this.configService.get<string>('AI_BASE_URL') ??
      'https://api.openai.com/v1';
    const model =
      this.configService.get<string>('AI_MODEL') ?? 'gpt-4o-mini';

    if (!apiKey || apiKey.includes('your-api-key')) {
      // Fail loudly but cleanly so the frontend can show a helpful message.
      throw new ServiceUnavailableException(
        'AI Doctor is not configured. Set AI_API_KEY in the backend .env file.',
      );
    }

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(dto.patientContext) },
      ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`AI provider error ${response.status}: ${body}`);
        throw new ServiceUnavailableException(
          'The AI Doctor is temporarily unavailable. Please try again.',
        );
      }

      const data: any = await response.json();
      const content: string = data?.choices?.[0]?.message?.content ?? '';
      return this.parseStructuredReply(content);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('Failed to reach AI provider', error as Error);
      throw new ServiceUnavailableException(
        'The AI Doctor could not be reached. Please try again later.',
      );
    }
  }

  private buildSystemPrompt(patientContext?: string): string {
    const specialties = Object.values(Specialty).join(', ');
    const context = patientContext
      ? `\n\nKnown patient context: ${patientContext}`
      : '';

    return [
      'You are "AI Doctor", a careful medical triage assistant for the Vita Care platform.',
      'Your job is to gather a patient\'s symptoms, give a clear PRELIMINARY, non-diagnostic assessment, suggest safe self-care where appropriate, and recommend which medical department they should see.',
      'You must NOT provide a definitive diagnosis, prescribe specific medications or doses, or replace a real physician.',
      'If symptoms suggest a medical emergency (e.g. chest pain, difficulty breathing, stroke signs, severe bleeding), set urgency to "emergency" and tell the patient to seek emergency care immediately.',
      `Recommend exactly one department from this list when a referral is useful: ${specialties}. If none clearly fits, use "General Physician". If more information is still needed, you may set recommendedSpecialty to null and ask a follow-up question.`,
      'Keep replies concise, warm and easy to understand for a non-medical person.',
      'Respond ONLY with a valid JSON object in exactly this shape:',
      '{"reply": string, "recommendedSpecialty": string | null, "urgency": "routine" | "soon" | "emergency"}',
      context,
    ].join('\n');
  }

  private parseStructuredReply(content: string): AiStructuredReply {
    const fallback: AiStructuredReply = {
      reply:
        content?.trim() ||
        'Sorry, I could not process that. Could you describe your symptoms again?',
      recommendedSpecialty: null,
      urgency: 'routine',
    };

    try {
      // Strip accidental code fences before parsing.
      const cleaned = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return {
        reply:
          typeof parsed.reply === 'string' ? parsed.reply : fallback.reply,
        recommendedSpecialty:
          typeof parsed.recommendedSpecialty === 'string'
            ? parsed.recommendedSpecialty
            : null,
        urgency: ['routine', 'soon', 'emergency'].includes(parsed.urgency)
          ? parsed.urgency
          : 'routine',
      };
    } catch {
      return fallback;
    }
  }

  /** Loosely map the model's free-text department to our Specialty enum. */
  private mapSpecialty(value: string | null): Specialty | null {
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
}
