import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiClient } from '../chatbot/ai-client';
import type { ChatLanguage } from '../chatbot/language';

/**
 * Server-side voice for the AI Doctor (OpenAI audio API).
 *
 * Why server-side: browser speech works only in some browsers, and most
 * phones have no Urdu voice installed. Research (see docs) also showed that
 * Alibaba's Qwen3-ASR and Qwen TTS do not list Urdu, so voice uses OpenAI,
 * which accepts Urdu speech and can speak Urdu. The chat model stays
 * whichever provider AI_* points to (Qwen or OpenAI).
 *
 *  - transcribe: patient audio → text (Urdu script or English); for Roman Urdu
 *    mode the Urdu text is transliterated into Roman Urdu.
 *  - speak: reply text → MP3. Roman Urdu is first converted to Urdu script so
 *    the voice pronounces it as Urdu, not as English words.
 */
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ai: AiClient,
  ) {}

  private get key(): string | null {
    const explicit = this.config.get<string>('VOICE_API_KEY') || this.config.get<string>('OPENAI_API_KEY');
    if (explicit) return explicit;
    const base = this.config.get<string>('AI_BASE_URL') || '';
    const aiKey = this.config.get<string>('AI_API_KEY');
    return base.includes('openai.com') && aiKey ? aiKey : null;
  }

  private get base(): string {
    return (this.config.get<string>('VOICE_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  status() {
    return {
      serverVoice: !!this.key,
      provider: this.key ? 'OpenAI audio' : 'Browser speech (fallback)',
      sttModel: this.key ? this.sttModel : null,
      ttsModel: this.key ? this.ttsModel : null,
    };
  }

  private get sttModel() {
    return this.config.get<string>('VOICE_STT_MODEL') || 'gpt-4o-mini-transcribe';
  }

  private get ttsModel() {
    return this.config.get<string>('VOICE_TTS_MODEL') || 'gpt-4o-mini-tts';
  }

  private requireKey(): string {
    const key = this.key;
    if (!key) {
      throw new ServiceUnavailableException('Server voice is off. Set OPENAI_API_KEY (or VOICE_API_KEY) on the backend.');
    }
    return key;
  }

  async transcribe(file: Express.Multer.File, language: ChatLanguage): Promise<{ text: string; language: ChatLanguage }> {
    const key = this.requireKey();
    if (!file?.buffer?.length) throw new BadRequestException('No audio received');

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'audio/webm' }), file.originalname || 'speech.webm');
    form.append('model', this.sttModel);
    form.append('language', language === 'en' ? 'en' : 'ur');
    form.append('prompt', language === 'en'
      ? 'A patient describing symptoms to a doctor.'
      : 'مریض ڈاکٹر کو اپنی علامات بتا رہا ہے۔ بخار، سر درد، کھانسی، سینے میں درد۔');

    const res = await fetch(`${this.base}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      this.logger.error(`STT error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      throw new ServiceUnavailableException('Could not understand the audio. Please try again or type.');
    }
    const data: any = await res.json();
    let text: string = (data?.text ?? '').trim();
    if (!text) throw new BadRequestException('No speech detected. Please speak a little louder.');

    if (language === 'roman-ur' && /[\u0600-\u06FF]/.test(text)) {
      text = await this.convert(text, 'Transliterate this Urdu text into natural Roman Urdu (Urdu written in English letters, as Pakistanis type on WhatsApp). Output only the transliteration.');
    }
    return { text: text.slice(0, 2000), language };
  }

  async speak(text: string, language: ChatLanguage): Promise<Buffer> {
    const key = this.requireKey();
    let input = text.trim().slice(0, 1500);
    if (!input) throw new BadRequestException('Nothing to read aloud');

    if (language === 'roman-ur' && !/[\u0600-\u06FF]/.test(input)) {
      input = await this.convert(input, 'Convert this Roman Urdu into Urdu script (Nastaliq letters) so a text-to-speech voice pronounces it correctly. Keep medical words and numbers. Output only the Urdu text.');
    }

    const res = await fetch(`${this.base}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ttsModel,
        voice: this.config.get<string>('VOICE_TTS_VOICE') || 'coral',
        input,
        response_format: 'mp3',
        instructions:
          language === 'en'
            ? 'Calm, warm and clear, like a caring doctor.'
            : 'Speak natural Pakistani Urdu with a warm, calm, caring tone, like a family doctor. Clear and not too fast.',
      }),
    });
    if (!res.ok) {
      this.logger.error(`TTS error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      throw new ServiceUnavailableException('Could not create the voice reply right now.');
    }
    return Buffer.from(await res.arrayBuffer());
  }

  /** Small text conversion via the chat model; falls back to the input on failure. */
  private async convert(text: string, instruction: string): Promise<string> {
    if (!this.ai.configured) return text;
    try {
      const out = await this.ai.complete(
        [
          { role: 'system', content: instruction },
          { role: 'user', content: text },
        ],
        { temperature: 0, timeoutMs: 15_000 },
      );
      return out.trim() || text;
    } catch {
      return text;
    }
  }
}
