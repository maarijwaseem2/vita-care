import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only record of sensitive reads and every admin change. */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 12, nullable: true })
  actorRole: string | null;

  /** e.g. "doctor.verify", "clinical.view", "blog.update". */
  @Column({ type: 'varchar', length: 60 })
  action: string;

  @Column({ type: 'varchar', length: 40 })
  entity: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 40, nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
