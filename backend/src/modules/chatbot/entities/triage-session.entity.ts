import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

/**
 * One AI Doctor consultation.
 *
 * Stores the conversation, the deterministic red flags that fired, and the
 * model's clinical summary. When the patient books, the appointment links to
 * this row so the doctor opens the visit already knowing the story.
 *
 * `token` is a random UUID the browser holds; it is the only way to reach a
 * session without being its logged-in owner (numeric ids are never exposed).
 */
@Entity('triage_sessions')
export class TriageSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  token: string;

  @ManyToOne(() => Patient, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient | null;

  @Column({ name: 'patient_id', type: 'int', nullable: true })
  patientId: number | null;

  @Column({ type: 'varchar', length: 12, default: 'en' })
  language: string;

  /** "ai" (Qwen answered) or "offline" (rule-based fallback). */
  @Column({ type: 'varchar', length: 12, default: 'ai' })
  mode: string;

  @Column({ type: 'varchar', length: 12, default: 'routine' })
  urgency: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  specialty: string | null;

  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, unknown> | null;

  @Column({ name: 'possible_conditions', type: 'jsonb', nullable: true })
  possibleConditions: unknown[] | null;

  @Column({ name: 'red_flags', type: 'jsonb', nullable: true })
  redFlags: unknown[] | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  transcript: { role: string; content: string }[];

  /** "chat" (AI Doctor) or "report" (lab report explainer). */
  @Column({ type: 'varchar', length: 12, default: 'chat' })
  source: string;

  /** Set when a clinician/admin has reviewed a flagged session. */
  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
