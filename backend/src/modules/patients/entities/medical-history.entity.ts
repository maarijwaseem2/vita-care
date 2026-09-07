import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patient } from './patient.entity';

/**
 * A single entry in a patient's medical history — a past condition,
 * diagnosis or note. Stored so patients no longer need to carry physical
 * documents and doctors can review history before an appointment.
 */
@Entity('medical_history')
export class MedicalHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patient, (patient) => patient.medicalHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'patient_id' })
  patientId: number;

  @Column()
  condition: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'diagnosed_at', type: 'date', nullable: true })
  diagnosedAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
