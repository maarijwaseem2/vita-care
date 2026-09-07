import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender, Specialty } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

/** A doctor's public profile plus the private fields used for scheduling. */
@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  // e.g. "Dr", "Prof"
  @Column({ default: 'Dr' })
  title: string;

  @Column({ type: 'enum', enum: Specialty, default: Specialty.GENERAL })
  specialty: Specialty;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  // Free-text lists stored as JSON so the count can vary per doctor.
  @Column({ type: 'json', nullable: true })
  qualifications: string[];

  @Column({ type: 'json', nullable: true })
  certificates: string[];

  @Column({ type: 'json', nullable: true })
  experiences: string[];

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'opd_schedule', nullable: true })
  opdSchedule: string;

  @Column({ name: 'available_time', nullable: true })
  availableTime: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fees: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 4.5 })
  rating: number;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
