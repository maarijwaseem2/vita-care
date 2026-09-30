import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Nurse } from './nurse.entity';
import type { VitalAlert, Vitals } from '../vitals';

/**
 * One home visit. Requested by a patient, or ordered by the treating doctor
 * after an appointment. The nurse records vitals on completion; red-flag
 * rules turn abnormal readings into alerts for patient and doctor.
 */
@Entity('home_care_requests')
export class HomeCareRequest {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 16, unique: true }) reference: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;
  @Column({ name: 'patient_id' }) patientId: number;

  @ManyToOne(() => Nurse, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'nurse_id' })
  nurse: Nurse | null;
  @Column({ name: 'nurse_id', type: 'int', nullable: true }) nurseId: number | null;

  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ordered_by_doctor_id' })
  orderedByDoctor: Doctor | null;
  @Column({ name: 'ordered_by_doctor_id', type: 'int', nullable: true }) orderedByDoctorId: number | null;

  @Column({ name: 'appointment_id', type: 'int', nullable: true }) appointmentId: number | null;
  @Column({ type: 'varchar', length: 40 }) service: string;
  @Column({ name: 'visit_date', type: 'date' }) visitDate: string;
  @Column({ name: 'time_window', type: 'varchar', length: 12 }) timeWindow: string;
  @Column({ type: 'varchar', length: 500 }) address: string;
  @Column({ type: 'varchar', length: 80 }) city: string;
  @Column({ name: 'preferred_gender', type: 'varchar', length: 8, default: 'any' }) preferredGender: 'any' | 'female' | 'male';
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'varchar', length: 12, default: 'requested' }) status: 'requested' | 'accepted' | 'completed' | 'cancelled';
  @Column({ type: 'jsonb', nullable: true }) vitals: Vitals | null;
  @Column({ name: 'vital_alerts', type: 'jsonb', nullable: true }) vitalAlerts: VitalAlert[] | null;
  @Column({ name: 'alert_level', type: 'varchar', length: 12, nullable: true }) alertLevel: 'soon' | 'emergency' | null;
  @Column({ name: 'nurse_notes', type: 'text', nullable: true }) nurseNotes: string | null;
  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true }) acceptedAt: Date | null;
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true }) completedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
