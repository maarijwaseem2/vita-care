import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppointmentStatus } from '../../../common/enums';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

/**
 * A booked appointment slot between a patient and a doctor.
 *
 * The unique index on (doctor_id, date, time_slot) is what enforces
 * "one booking per slot" at the database level — the same rule the original
 * Firebase code tried to check in JavaScript, now guaranteed by MySQL.
 */
@Entity('appointments')
@Index('uq_doctor_slot', ['doctorId', 'date', 'timeSlot'], { unique: true })
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments, {
    onDelete: 'CASCADE',
  })
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

  @Column({ name: 'patient_id', nullable: true })
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
  reason: string;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.BOOKED })
  status: AppointmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
