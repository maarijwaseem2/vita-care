import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/enums';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
    profileId: number;
    name: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientsRepository: Repository<Patient>,
  ) {}

  private static readonly SALT_ROUNDS = 10;

  /** Register a patient: creates the User + Patient profile in one transaction. */
  async registerPatient(dto: RegisterPatientDto): Promise<AuthResponse> {
    await this.ensureEmailAvailable(dto.email);
    const passwordHash = await bcrypt.hash(
      dto.password,
      AuthService.SALT_ROUNDS,
    );

    const patient = await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: dto.email,
        passwordHash,
        role: UserRole.PATIENT,
      });
      const savedUser = await manager.save(user);

      const profile = manager.create(Patient, {
        userId: savedUser.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        age: dto.age,
        gender: dto.gender,
        phone: dto.phone,
        city: dto.city,
        address: dto.address,
      });
      return manager.save(profile);
    });

    return this.buildAuthResponse(
      patient.userId,
      dto.email,
      UserRole.PATIENT,
      patient.id,
      `${patient.firstName} ${patient.lastName}`,
    );
  }

  /** Register a doctor: creates the User + Doctor profile in one transaction. */
  async registerDoctor(dto: RegisterDoctorDto): Promise<AuthResponse> {
    await this.ensureEmailAvailable(dto.email);
    const passwordHash = await bcrypt.hash(
      dto.password,
      AuthService.SALT_ROUNDS,
    );

    const doctor = await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: dto.email,
        passwordHash,
        role: UserRole.DOCTOR,
      });
      const savedUser = await manager.save(user);

      const profile = manager.create(Doctor, {
        userId: savedUser.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title ?? 'Dr',
        specialty: dto.specialty,
        age: dto.age,
        gender: dto.gender,
        phone: dto.phone,
        city: dto.city,
        address: dto.address,
        qualifications: dto.qualifications ?? [],
        experiences: dto.experiences ?? [],
        opdSchedule: dto.opdSchedule,
        availableTime: dto.availableTime,
        fees: dto.fees ?? 0,
      });
      return manager.save(profile);
    });

    return this.buildAuthResponse(
      doctor.userId,
      dto.email,
      UserRole.DOCTOR,
      doctor.id,
      `${doctor.title} ${doctor.firstName} ${doctor.lastName}`,
    );
  }

  /** Verify credentials and return a signed token. */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { profileId, name } = await this.resolveProfile(user);
    return this.buildAuthResponse(user.id, user.email, user.role, profileId, name);
  }

  // --- helpers ---

  private async ensureEmailAvailable(email: string): Promise<void> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
  }

  private async resolveProfile(
    user: User,
  ): Promise<{ profileId: number; name: string }> {
    if (user.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findOne({
        where: { userId: user.id },
      });
      return {
        profileId: doctor?.id ?? 0,
        name: doctor ? `${doctor.title} ${doctor.firstName} ${doctor.lastName}` : '',
      };
    }
    const patient = await this.patientsRepository.findOne({
      where: { userId: user.id },
    });
    return {
      profileId: patient?.id ?? 0,
      name: patient ? `${patient.firstName} ${patient.lastName}` : '',
    };
  }

  private buildAuthResponse(
    userId: number,
    email: string,
    role: UserRole,
    profileId: number,
    name: string,
  ): AuthResponse {
    const accessToken = this.jwtService.sign({ sub: userId, email, role });
    return {
      accessToken,
      user: { id: userId, email, role, profileId, name },
    };
  }
}
