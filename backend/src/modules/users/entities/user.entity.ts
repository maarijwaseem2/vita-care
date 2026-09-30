import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../common/enums';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

/**
 * Account/credentials record. Every person who signs in has one User row.
 * The role decides whether they own a Doctor profile or a Patient profile.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // select:false — never loaded unless a query explicitly asks for it
  // (only UsersService.findByEmailWithPassword does, for login).
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  /** Admins can suspend an account; suspended users cannot sign in. */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToOne(() => Doctor, (doctor) => doctor.user)
  doctor?: Doctor;

  @OneToOne(() => Patient, (patient) => patient.user)
  patient?: Patient;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
