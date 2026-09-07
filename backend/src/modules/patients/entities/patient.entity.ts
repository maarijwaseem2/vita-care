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
import { Gender } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { MedicalHistory } from './medical-history.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

/** A patient's profile. Medical history is kept in a separate table (1:N). */
@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

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

  @Column({ name: 'current_medication', type: 'text', nullable: true })
  currentMedication: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @OneToMany(() => MedicalHistory, (history) => history.patient, {
    cascade: true,
  })
  medicalHistory: MedicalHistory[];

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
