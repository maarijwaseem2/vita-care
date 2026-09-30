import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /** Never throws: an audit failure must not break the user's request. */
  async record(
    actor: AuthUser | null | undefined,
    action: string,
    entity: string,
    entityId?: string | number | null,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.repo.insert({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action,
        entity,
        entityId: entityId == null ? null : String(entityId),
        meta: (meta ?? null) as never,
      });
    } catch (err) {
      this.logger.error(`Audit write failed: ${(err as Error).message}`);
    }
  }

  async list(page = 1, limit = 50) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }
}
