import { Logger } from '@nestjs/common';

const PLACEHOLDER_SECRETS = ['', 'dev-secret', 'change_this_to_a_long_random_secret_string'];

/** Refuse to start in production with an unsafe JWT secret; warn in development. */
export function assertSafeConfig(): void {
  const secret = process.env.JWT_SECRET ?? '';
  const unsafe = PLACEHOLDER_SECRETS.includes(secret) || secret.length < 24;
  if (unsafe && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a long random value in production.');
  }
  if (unsafe) {
    Logger.warn('JWT_SECRET is a placeholder. Fine for local dev, never for deployment.', 'Config');
  }
  if (!process.env.AI_API_KEY || /your-api-key/.test(process.env.AI_API_KEY)) {
    Logger.warn('AI_API_KEY not set: AI Doctor runs in OFFLINE rule-based mode.', 'Config');
  }
}

export const jwtSecret = (): string => process.env.JWT_SECRET || 'dev-secret';
