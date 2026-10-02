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

  /** Email confirmed by link (Brevo) or by Google sign-in. Needed for the AI features. */
  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  /** SHA-256 of the current verification token (the token itself is only in the email). */
  @Column({ name: 'email_verify_token_hash', type: 'varchar', length: 64, nullable: true, select: false })
  emailVerifyTokenHash: string | null;

  @Column({ name: 'email_verify_sent_at', type: 'timestamp', nullable: true })
  emailVerifySentAt: Date | null;

  /** "password" or "google". */
  @Column({ name: 'auth_provider', type: 'varchar', length: 12, default: 'password' })
  authProvider: string;

  @Column({ name: 'google_uid', type: 'varchar', length: 128, nullable: true })
  googleUid: string | null;

  @OneToOne(() => Doctor, (doctor) => doctor.user)
  doctor?: Doctor;

  @OneToOne(() => Patient, (patient) => patient.user)
  patient?: Patient;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
