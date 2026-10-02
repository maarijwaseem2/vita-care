import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client for any OpenAI-compatible Chat Completions API.
 *
 * Defaults to Alibaba Cloud Model Studio (Qwen) via its OpenAI-compatible
 * endpoint. Switch provider by changing AI_BASE_URL / AI_MODEL only.
 */
export type ChatContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: ChatContent;
}

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: 'not_configured' | 'provider_error',
  ) {
    super(message);
  }
}

@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name);

  constructor(private readonly config: ConfigService) {}

  get configured(): boolean {
    const key = this.config.get<string>('AI_API_KEY');
    return !!key && !/your-api-key|^sk-\.\.\.$/.test(key);
  }

  get providerLabel(): string {
    const base = this.baseUrl;
    if (base.includes('dashscope') || base.includes('aliyuncs')) return 'Alibaba Cloud Qwen';
    if (/qwen/i.test(this.textModel)) return 'Qwen';
    if (base.includes('openai.com')) return 'OpenAI';
    return 'AI provider';
  }

  get textModel(): string {
    return this.config.get<string>('AI_MODEL') || 'qwen-plus';
  }

  get visionModel(): string {
    return this.config.get<string>('AI_VISION_MODEL') || 'qwen-vl-max';
  }

  private get baseUrl(): string {
    return (
      this.config.get<string>('AI_BASE_URL') ||
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    ).replace(/\/$/, '');
  }

  /** Call the model and return the raw text content of the first choice. */
  async complete(
    messages: ChatTurn[],
    opts: { model?: string; json?: boolean; temperature?: number; timeoutMs?: number; maxTokens?: number } = {},
  ): Promise<string> {
    if (!this.configured) {
      throw new AiUnavailableError('AI_API_KEY is not set', 'not_configured');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.get<string>('AI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: opts.model ?? this.textModel,
          messages,
          temperature: opts.temperature ?? 0.2,
          // Cap every answer so no single call can waste tokens.
          max_tokens: opts.maxTokens ?? 800,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`AI provider error ${res.status}: ${body.slice(0, 500)}`);
        throw new AiUnavailableError(`Provider returned ${res.status}`, 'provider_error');
      }
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;
      this.logger.error(`Failed to reach AI provider: ${(err as Error).message}`);
      throw new AiUnavailableError('Provider unreachable', 'provider_error');
    } finally {
      clearTimeout(timer);
    }
  }
}
