import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AppointmentStatus } from '../../../common/enums';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { TriageSession } from '../../chatbot/entities/triage-session.entity';

/**
 * A booked appointment slot between a patient and a doctor.
 *
 * A PARTIAL unique index on (doctor_id, date, time_slot) WHERE status='booked'
 * enforces "one active booking per slot" in the database, while still letting
 * a cancelled slot be booked again. It is created in the migration.
 *
 * `reference` is a short random code (e.g. VC-7K2M9QXA) used for the public
 * receipt link, so receipts can't be enumerated by guessing numeric ids.
 */
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('uq_appointments_reference', { unique: true })
  @Column({ type: 'varchar', length: 16 })
  reference: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id' })
  doctorId: number;

  // Nullable: a logged-in patient is linked, but a guest booking may not be.
  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'patient_id', type: 'int', nullable: true })
  patientId: number | null;

  // Snapshot fields so the receipt is stable even if the profile changes.
  @Column({ name: 'patient_name' })
  patientName: string;

  @Column({ name: 'patient_phone' })
  patientPhone: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'time_slot' })
  timeSlot: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.BOOKED })
  status: AppointmentStatus;

  /** "clinic" or "home" (home visits are offered by physiotherapists). */
  @Column({ name: 'visit_type', type: 'varchar', length: 8, default: 'clinic' })
  visitType: 'clinic' | 'home';

  @Column({ name: 'home_address', type: 'varchar', length: 500, nullable: true })
  homeAddress: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: { to: (v: number | null) => v, from: (v: string | null) => (v == null ? null : Number(v)) } })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: { to: (v: number | null) => v, from: (v: string | null) => (v == null ? null : Number(v)) } })
  longitude: number | null;

  /** Home-visit charge at booking time (null for clinic visits). */
  @Column({ name: 'home_visit_charge', type: 'int', nullable: true })
  homeVisitCharge: number | null;

  /** AI pre-visit summary the patient chose to share with the doctor. */
  @ManyToOne(() => TriageSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'triage_session_id' })
  triageSession: TriageSession | null;

  @Column({ name: 'triage_session_id', type: 'int', nullable: true })
  triageSessionId: number | null;

  /** Private notes the doctor writes after the visit. */
  @Column({ name: 'doctor_notes', type: 'text', nullable: true })
  doctorNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
