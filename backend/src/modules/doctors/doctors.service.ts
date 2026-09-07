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

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
  ) {}

  /** Public search used by the "Find a doctor" list and department cards. */
  async findAll(query: QueryDoctorsDto): Promise<Doctor[]> {
    const qb = this.doctorsRepository.createQueryBuilder('doctor');

    if (query.city) {
      qb.andWhere('doctor.city LIKE :city', { city: `%${query.city}%` });
    }
    if (query.specialty) {
      qb.andWhere('doctor.specialty = :specialty', {
        specialty: query.specialty,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(doctor.firstName LIKE :s OR doctor.lastName LIKE :s OR doctor.specialty LIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return qb.orderBy('doctor.rating', 'DESC').getMany();
  }

  /** Return the doctors matching a specialty — used by the AI recommendation. */
  findBySpecialty(specialty: Specialty, limit = 3): Promise<Doctor[]> {
    return this.doctorsRepository.find({
      where: { specialty },
      order: { rating: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({ where: { id } });
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
    const doctor = await this.findOne(id);
    if (doctor.userId !== requesterUserId) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    Object.assign(doctor, dto);
    return this.doctorsRepository.save(doctor);
  }

  /** Distinct list of cities for search dropdowns. */
  async listCities(): Promise<string[]> {
    const rows = await this.doctorsRepository
      .createQueryBuilder('doctor')
      .select('DISTINCT doctor.city', 'city')
      .where('doctor.city IS NOT NULL')
      .getRawMany<{ city: string }>();
    return rows.map((r) => r.city).filter(Boolean);
  }
}
