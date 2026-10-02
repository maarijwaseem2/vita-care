import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { EmailService, resetCodeEmail } from '../email/email.service';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_AFTER_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const hash = (userId: number, code: string) => createHash('sha256').update(`${userId}:${code}`).digest('hex');

/**
 * "Forgot password" with a 6-digit code sent by email.
 *  - The answer is the same whether or not the email exists (no account guessing).
 *  - One code per 10 minutes; a code works for 15 minutes and for at most 5 tries.
 *  - Only a hash of the code is stored.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly email: EmailService,
  ) {}

  async request(rawEmail: string): Promise<{ message: string; devCode?: string }> {
    const message = 'If an account exists for this email, we have sent a 6-digit code. It works for 15 minutes.';
    const email = rawEmail.trim().toLowerCase();
    const rows: { id: number; active: boolean; sent: Date | null; name: string | null }[] = await this.ds.query(
      `SELECT u.id, u.is_active AS active, u.reset_sent_at AS sent,
              COALESCE(p.first_name, d.first_name, n.first_name, 'there') AS name
         FROM users u
         LEFT JOIN patients p ON p.user_id = u.id
         LEFT JOIN doctors d ON d.user_id = u.id
         LEFT JOIN nurses n ON n.user_id = u.id
        WHERE u.email = $1`,
      [email],
    );
    const u = rows[0];
    if (!u || !u.active) return { message };
    if (u.sent && Date.now() - new Date(u.sent).getTime() < RESEND_AFTER_MS) {
      return { message: 'We already sent you a code a few minutes ago. Please check your inbox and spam folder, or try again after 10 minutes.' };
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.ds.query(
      `UPDATE users SET reset_code_hash = $1, reset_code_expires_at = now() + interval '15 minutes',
              reset_attempts = 0, reset_sent_at = now() WHERE id = $2`,
      [hash(u.id, code), u.id],
    );
    const sent = await this.email.send({ to: email, toName: u.name ?? undefined, ...resetCodeEmail(u.name ?? 'there', code) });
    if (!sent) this.logger.warn(`Password reset code for ${email}: ${code}`);
    return !sent && process.env.NODE_ENV !== 'production' ? { message, devCode: code } : { message };
  }

  async reset(rawEmail: string, code: string, newPassword: string): Promise<{ reset: true }> {
    const email = rawEmail.trim().toLowerCase();
    const rows: { id: number; hash: string | null; expires: Date | null; attempts: number }[] = await this.ds.query(
      `SELECT id, reset_code_hash AS hash, reset_code_expires_at AS expires, reset_attempts AS attempts
         FROM users WHERE email = $1 AND is_active = true`,
      [email],
    );
    const u = rows[0];
    const invalid = new BadRequestException('This code is wrong or has expired. Ask for a new code.');
    if (!u || !u.hash || !u.expires || new Date(u.expires).getTime() < Date.now()) throw invalid;
    if (u.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many wrong codes. Ask for a new code.');
    }
    if (hash(u.id, code) !== u.hash) {
      await this.ds.query(`UPDATE users SET reset_attempts = reset_attempts + 1 WHERE id = $1`, [u.id]);
      throw invalid;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    // Using the code proves the person owns the email, so the email also counts as verified.
    await this.ds.query(
      `UPDATE users SET password_hash = $1, reset_code_hash = NULL, reset_code_expires_at = NULL,
              reset_attempts = 0, email_verified = true WHERE id = $2`,
      [passwordHash, u.id],
    );
    return { reset: true };
  }
}
