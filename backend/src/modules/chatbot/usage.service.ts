import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { clinicNow } from '../../common/utils/schedule';

export type UsageKind = 'message' | 'report' | 'voice';

export interface UsageInfo {
  kind: UsageKind;
  used: number;
  /** null = unlimited (admins). */
  limit: number | null;
  remaining: number | null;
}

const DEFAULTS: Record<UsageKind, number> = { message: 40, report: 5, voice: 40 };
const ENV: Record<UsageKind, string> = {
  message: 'AI_DAILY_MESSAGES',
  report: 'AI_DAILY_REPORTS',
  voice: 'AI_DAILY_VOICE',
};

/**
 * Daily AI allowance per signed-in user (resets at midnight Pakistan time).
 * Admins are unlimited (testing, evaluation). The check-and-count is a single
 * SQL statement, so parallel requests cannot go over the limit.
 */
@Injectable()
export class UsageService {
  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
  ) {}

  limitFor(kind: UsageKind): number {
    const v = Number(this.config.get<string>(ENV[kind]));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULTS[kind];
  }

  /** Count one use, or throw 429 with a friendly message when the day's limit is reached. */
  async consume(user: AuthUser, kind: UsageKind): Promise<UsageInfo> {
    if (user.role === UserRole.ADMIN) return { kind, used: 0, limit: null, remaining: null };
    const limit = this.limitFor(kind);
    const day = clinicNow().date;
    const rows: { count: number }[] = await this.ds.query(
      `INSERT INTO ai_usage (user_id, day, kind, count) VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, day, kind) DO UPDATE SET count = ai_usage.count + 1
       WHERE ai_usage.count < $4
       RETURNING count`,
      [user.userId, day, kind, limit],
    );
    if (!rows.length) {
      const what = kind === 'message' ? 'AI Doctor messages' : kind === 'report' ? 'report or scan explanations' : 'voice uses';
      throw new HttpException(
        `You have used today's ${limit} ${what}. The limit resets at midnight. In an emergency call 1122.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const used = rows[0].count;
    return { kind, used, limit, remaining: Math.max(0, limit - used) };
  }

  /** Today's usage for every kind (for the UI). */
  async today(user: AuthUser): Promise<Record<UsageKind, UsageInfo>> {
    const day = clinicNow().date;
    const rows: { kind: UsageKind; count: number }[] = await this.ds.query(
      `SELECT kind, count FROM ai_usage WHERE user_id = $1 AND day = $2`,
      [user.userId, day],
    );
    const out = {} as Record<UsageKind, UsageInfo>;
    for (const kind of ['message', 'report', 'voice'] as UsageKind[]) {
      const used = rows.find((r) => r.kind === kind)?.count ?? 0;
      const limit = user.role === UserRole.ADMIN ? null : this.limitFor(kind);
      out[kind] = { kind, used, limit, remaining: limit == null ? null : Math.max(0, limit - used) };
    }
    return out;
  }
}
