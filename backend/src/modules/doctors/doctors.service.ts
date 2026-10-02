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

/** Cities patients often name in chat (Roman spellings included). */
const KNOWN_CITIES = ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'pindi', 'peshawar', 'quetta', 'multan', 'faisalabad', 'hyderabad', 'sialkot', 'abbottabad', 'gujranwala', 'isb'];

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

  /**
   * Area-wise recommendation for the AI Doctor and report reader:
   *   1. same area as the patient (area = first part of the doctor's address, e.g. "Clifton"),
   *   2. same city, 3. anywhere; then by rating.
   * City comes from the patient's profile, or a city named in the chat if the profile has none.
   */
  async recommend(
    specialty: Specialty,
    where: { city?: string | null; address?: string | null; text?: string | null },
    limit = 3,
  ): Promise<(Doctor & { proximity: 'area' | 'city' | null })[]> {
    const all = await this.doctorsRepository.find({ where: { specialty, verificationStatus: 'verified' } });
    const norm = (v: string) => v.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    const text = norm(where.text ?? '');
    let city = where.city ? norm(where.city) : null;
    if (!city) {
      const known = [...new Set(all.map((d) => norm(d.city ?? '')).filter(Boolean)), ...KNOWN_CITIES];
      city = known.find((c) => new RegExp(`\\b${c}\\b`).test(text)) ?? null;
      if (city === 'pindi') city = 'rawalpindi';
      if (city === 'isb') city = 'islamabad';
    }
    const hay = norm(`${where.address ?? ''} ${where.text ?? ''}`);
    const scored = all.map((d) => {
      const sameCity = !!city && norm(d.city ?? '') === city;
      const area = norm((d.address ?? '').split(',')[0] ?? '');
      const first = area.split(' ')[0] ?? '';
      const sameArea = sameCity && area.length > 2 && area !== city && (hay.includes(area) || (first.length >= 4 && new RegExp(`\\b${first}\\b`).test(hay)));
      const proximity: 'area' | 'city' | null = sameArea ? 'area' : sameCity ? 'city' : null;
      return { d, rank: sameArea ? 0 : sameCity ? 1 : 2, proximity };
    });
    scored.sort((a, b) => a.rank - b.rank || Number(b.d.rating) - Number(a.d.rating) || a.d.id - b.d.id);
    return scored.slice(0, limit).map((x) => Object.assign(x.d, { proximity: x.proximity }));
  }

  /** Save a new profile photo for the signed-in doctor. */
  async setPhoto(userId: number, url: string): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    doctor.imageUrl = url;
    return this.doctorsRepository.save(doctor);
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
