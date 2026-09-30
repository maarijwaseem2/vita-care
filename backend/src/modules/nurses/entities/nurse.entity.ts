import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** A home-visit nurse. Hidden from patients until an admin verifies the PNC licence. */
@Entity('nurses')
export class Nurse {
  @PrimaryGeneratedColumn() id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' }) userId: number;
  @Column({ name: 'first_name' }) firstName: string;
  @Column({ name: 'last_name' }) lastName: string;
  @Column({ type: 'varchar', length: 10, nullable: true }) gender: 'male' | 'female' | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone: string | null;
  @Column() city: string;
  /** Neighbourhoods the nurse travels to. */
  @Column({ type: 'json', nullable: true }) areas: string[] | null;
  @Column() qualification: string;
  /** Pakistan Nursing & Midwifery Council registration number. */
  @Column({ name: 'pnc_number' }) pncNumber: string;
  /** Service ids from HOME_SERVICES. */
  @Column({ type: 'json', nullable: true }) skills: string[] | null;
  @Column({ name: 'experience_years', type: 'int', nullable: true }) experienceYears: number | null;
  @Column({ name: 'visit_fee', type: 'int', default: 0 }) visitFee: number;
  @Column({ name: 'available_days', type: 'varchar', length: 80, nullable: true }) availableDays: string | null;
  @Column({ type: 'text', nullable: true }) bio: string | null;
  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  rating: number;
  @Column({ name: 'verification_status', type: 'varchar', length: 12, default: 'pending' })
  verificationStatus: 'pending' | 'verified' | 'rejected';
  @Column({ name: 'verification_note', type: 'text', nullable: true }) verificationNote: string | null;
  @Column({ name: 'verified_at', type: 'timestamp', nullable: true }) verifiedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
