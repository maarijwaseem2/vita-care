import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { EmailService, verificationEmail } from '../email/email.service';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
/** One verification email per 24 hours (the link itself also lasts 24 hours). */
const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Email verification by link. The token is random (32 bytes), only its hash is
 * stored, it works once and expires after 24 hours.
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get appUrl(): string {
    return (this.config.get<string>('APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  /**
   * Create a fresh token and email the link. Returns the link only in local
   * development without Brevo (so testers can still verify); never in production.
   */
  async sendFor(userId: number, email: string, name: string): Promise<{ sent: boolean; devVerificationUrl?: string }> {
    const token = randomBytes(32).toString('hex');
    await this.ds.query(
      `UPDATE users SET email_verify_token_hash = $1, email_verify_sent_at = now() WHERE id = $2`,
      [sha256(token), userId],
    );
    const link = `${this.appUrl}/verify-email?token=${token}`;
    const sent = await this.email.send({ to: email, toName: name, ...verificationEmail(name || 'there', link) });
    if (!sent) this.logger.warn(`Verification link for ${email}: ${link}`);
    const exposeLink = !sent && process.env.NODE_ENV !== 'production';
    return { sent, ...(exposeLink ? { devVerificationUrl: link } : {}) };
  }

  async verify(token: string): Promise<{ verified: true; email: string }> {
    if (!/^[a-f0-9]{64}$/.test(token ?? '')) throw new BadRequestException('This verification link is not valid.');
    const rows: { id: number; email: string; sent: Date | null }[] = await this.ds.query(
      `SELECT id, email, email_verify_sent_at AS sent FROM users WHERE email_verify_token_hash = $1`,
      [sha256(token)],
    );
    const user = rows[0];
    if (!user) throw new BadRequestException('This verification link is not valid or was already used.');
    if (!user.sent || Date.now() - new Date(user.sent).getTime() > TOKEN_TTL_MS) {
      throw new BadRequestException('This verification link has expired. Sign in and send a new one.');
    }
    await this.ds.query(
      `UPDATE users SET email_verified = true, email_verify_token_hash = NULL WHERE id = $1`,
      [user.id],
    );
    return { verified: true, email: user.email };
  }

  async resend(userId: number): Promise<{ alreadyVerified?: true; sent?: boolean; devVerificationUrl?: string }> {
    const rows: { email: string; verified: boolean; sent: Date | null; name: string | null }[] = await this.ds.query(
      `SELECT u.email, u.email_verified AS verified, u.email_verify_sent_at AS sent,
              COALESCE(p.first_name, d.first_name, n.first_name) AS name
         FROM users u
         LEFT JOIN patients p ON p.user_id = u.id
         LEFT JOIN doctors d ON d.user_id = u.id
         LEFT JOIN nurses n ON n.user_id = u.id
        WHERE u.id = $1`,
      [userId],
    );
    const u = rows[0];
    if (!u) throw new BadRequestException('Account not found');
    if (u.verified) return { alreadyVerified: true };
    if (u.sent && Date.now() - new Date(u.sent).getTime() < RESEND_COOLDOWN_MS) {
      const hours = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(u.sent).getTime())) / 3_600_000);
      throw new HttpException(
        `We already sent the confirmation link to your email. Please open it from your inbox (also check spam). You can ask for a new link in about ${hours} hour${hours === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.sendFor(userId, u.email, u.name ?? '');
  }

  async isVerified(userId: number): Promise<boolean> {
    const rows: { v: boolean }[] = await this.ds.query(`SELECT email_verified AS v FROM users WHERE id = $1`, [userId]);
    return !!rows[0]?.v;
  }
}
