import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { User } from '../users/entities/user.entity';

export interface GoogleIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Verifies a Firebase ID token from "Continue with Google". Only the Firebase
 * project id is needed (public signing keys are fetched by firebase-admin);
 * no service-account file.
 */
@Injectable()
export class FirebaseVerifier {
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  get configured(): boolean {
    return !!this.config.get<string>('FIREBASE_PROJECT_ID');
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    if (!projectId) throw new ServiceUnavailableException('Google sign-in is not set up on this server yet.');
    if (!this.app) {
      this.app = getApps().find((a) => a.name === 'vita-care') ?? initializeApp({ projectId }, 'vita-care');
    }
    try {
      const t = await getAuth(this.app).verifyIdToken(idToken, false);
      if (t.firebase?.sign_in_provider !== 'google.com' || !t.email) {
        throw new UnauthorizedException('Please sign in with a Google account.');
      }
      return { uid: t.uid, email: t.email.toLowerCase(), emailVerified: t.email_verified === true, name: (t.name as string) || '' };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      const detail = err instanceof Error ? err.message : String(err);
      Logger.warn(`Firebase ID token rejected: ${detail}`, FirebaseVerifier.name);
      throw new UnauthorizedException('Google sign-in failed or expired. Please try again.');
    }
  }
}

/**
 * Finds or creates the Vita Care account for a Google identity.
 *  - Known Google account → sign in.
 *  - Existing account with the same (Google-verified) email → link it, sign in.
 *  - New person → create a patient account (Google has already verified the email).
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly verifier: FirebaseVerifier,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Known person → their user id. New person → a short-lived signup token: they first choose
   * patient / doctor / nurse and fill in their details (POST /auth/google/complete).
   */
  async resolve(idToken: string): Promise<{ userId: number } | { signup: { token: string; email: string; name: string } }> {
    const g = await this.verifier.verify(idToken);
    const users = this.ds.getRepository(User);

    const byUid = await users.findOne({ where: { googleUid: g.uid } });
    if (byUid) return { userId: this.ensureActive(byUid) };

    const byEmail = await users.findOne({ where: { email: g.email } });
    if (byEmail) {
      if (!g.emailVerified) throw new UnauthorizedException('Your Google email is not verified.');
      byEmail.googleUid = g.uid;
      byEmail.emailVerified = true;
      await users.save(byEmail);
      return { userId: this.ensureActive(byEmail) };
    }

    const token = this.jwt.sign(
      { purpose: 'google-signup', uid: g.uid, email: g.email, name: g.name, ev: g.emailVerified },
      { expiresIn: '30m' },
    );
    return { signup: { token, email: g.email, name: g.name } };
  }

  /** Read a signup token issued by resolve(). */
  readSignupToken(token: string): { uid: string; email: string; name: string; ev: boolean } {
    try {
      const p = this.jwt.verify<{ purpose: string; uid: string; email: string; name: string; ev: boolean }>(token);
      if (p.purpose !== 'google-signup') throw new Error('wrong purpose');
      return p;
    } catch {
      throw new UnauthorizedException('Your Google sign-up has expired. Please press "Continue with Google" again.');
    }
  }

  /** After the account is created from the role form: link Google and mark the email verified. */
  async linkNewAccount(userId: number, uid: string, emailVerified: boolean): Promise<void> {
    await this.ds.query(
      `UPDATE users SET google_uid = $1, auth_provider = 'google', email_verified = $2 WHERE id = $3`,
      [uid, emailVerified, userId],
    );
    this.logger.log(`New account from Google sign-in (user ${userId})`);
  }

  private ensureActive(u: User): number {
    if (!u.isActive) throw new UnauthorizedException('This account has been suspended. Please contact support.');
    return u.id;
  }
}
