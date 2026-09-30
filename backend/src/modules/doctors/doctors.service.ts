import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { QueryDoctorsDto } from './dto/query-doctors.dto';
import { Specialty } from '../../common/enums';

/** Escape % and _ so user input is matched literally inside ILIKE. */
const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
  ) {}

  /** Public search used by the "Find a doctor" list and department cards. */
  async findAll(query: QueryDoctorsDto): Promise<Doctor[]> {
    const qb = this.doctorsRepository
      .createQueryBuilder('doctor')
      .where("doctor.verificationStatus = 'verified'");

    if (query.city) {
      qb.andWhere('doctor.city ILIKE :city', { city: `%${escapeLike(query.city)}%` });
    }
    if (query.specialty) {
      qb.andWhere('doctor.specialty = :specialty', { specialty: query.specialty });
    }
    if (query.search) {
      // specialty is a Postgres enum, so cast it before a text match.
      qb.andWhere(
        `(doctor.firstName ILIKE :s OR doctor.lastName ILIKE :s
          OR CONCAT(doctor.firstName, ' ', doctor.lastName) ILIKE :s
          OR CAST(doctor.specialty AS TEXT) ILIKE :s OR doctor.city ILIKE :s)`,
        { s: `%${escapeLike(query.search.trim())}%` },
      );
    }

    return qb.orderBy('doctor.rating', 'DESC').addOrderBy('doctor.id', 'ASC').getMany();
  }

  /**
   * Doctors for a specialty — used by the AI recommendation.
   * Doctors in the patient's own city are listed first.
   */
  async findBySpecialty(specialty: Specialty, limit = 3, preferCity?: string | null): Promise<Doctor[]> {
    const qb = this.doctorsRepository
      .createQueryBuilder('doctor')
      .where('doctor.specialty = :specialty', { specialty })
      .andWhere("doctor.verificationStatus = 'verified'");
    if (preferCity) {
      qb.addOrderBy(`CASE WHEN LOWER(doctor.city) = LOWER(:city) THEN 0 ELSE 1 END`, 'ASC')
        .setParameter('city', preferCity);
    }
    return qb.addOrderBy('doctor.rating', 'DESC').take(limit).getMany();
  }

  /** Public profile: only verified doctors can be viewed or booked. */
  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({ where: { id, verificationStatus: 'verified' } });
    if (!doctor) {
      throw new NotFoundException(`Doctor #${id} not found`);
    }
    return doctor;
  }

  findByUserId(userId: number): Promise<Doctor | null> {
    return this.doctorsRepository.findOne({ where: { userId } });
  }

  /** Update a profile, ensuring the caller owns it. */
  async update(
    id: number,
    dto: UpdateDoctorDto,
    requesterUserId: number,
  ): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException(`Doctor #${id} not found`);
    if (doctor.userId !== requesterUserId) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    // A changed PMDC number must be checked again by an admin.
    const pmdcChanged = dto.pmdcNumber !== undefined && dto.pmdcNumber !== doctor.pmdcNumber;
    Object.assign(doctor, dto);
    if (pmdcChanged) {
      doctor.verificationStatus = 'pending';
      doctor.verifiedAt = null;
    }
    return this.doctorsRepository.save(doctor);
  }

  /** Distinct list of cities for search dropdowns. */
  async listCities(): Promise<string[]> {
    const rows = await this.doctorsRepository
      .createQueryBuilder('doctor')
      .select('DISTINCT doctor.city', 'city')
      .where('doctor.city IS NOT NULL')
      .andWhere("doctor.verificationStatus = 'verified'")
      .orderBy('city', 'ASC')
      .getRawMany<{ city: string }>();
    return rows.map((r) => r.city).filter(Boolean);
  }
}
