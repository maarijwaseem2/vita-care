import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientsRepository: Repository<Patient>,
    @InjectRepository(MedicalHistory)
    private readonly medicalHistoryRepository: Repository<MedicalHistory>,
  ) {}

  async findOne(id: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOne({
      where: { id },
      relations: { medicalHistory: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }
    return patient;
  }

  async findByUserId(userId: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOne({
      where: { userId },
      relations: { medicalHistory: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    return patient;
  }

  async update(
    id: number,
    dto: UpdatePatientDto,
    requesterUserId: number,
  ): Promise<Patient> {
    const patient = await this.findOne(id);
    this.assertOwnership(patient, requesterUserId);
    Object.assign(patient, dto);
    return this.patientsRepository.save(patient);
  }

  // --- Medical history ---

  async addMedicalHistory(
    patientId: number,
    dto: CreateMedicalHistoryDto,
    requesterUserId: number,
  ): Promise<MedicalHistory> {
    const patient = await this.findOne(patientId);
    this.assertOwnership(patient, requesterUserId);

    const entry = this.medicalHistoryRepository.create({
      patientId,
      condition: dto.condition,
      notes: dto.notes,
      diagnosedAt: dto.diagnosedAt,
    });
    return this.medicalHistoryRepository.save(entry);
  }

  async removeMedicalHistory(
    patientId: number,
    historyId: number,
    requesterUserId: number,
  ): Promise<{ deleted: boolean }> {
    const patient = await this.findOne(patientId);
    this.assertOwnership(patient, requesterUserId);

    const entry = await this.medicalHistoryRepository.findOne({
      where: { id: historyId, patientId },
    });
    if (!entry) {
      throw new NotFoundException('Medical history entry not found');
    }
    await this.medicalHistoryRepository.remove(entry);
    return { deleted: true };
  }

  private assertOwnership(patient: Patient, requesterUserId: number): void {
    if (patient.userId !== requesterUserId) {
      throw new ForbiddenException('You can only manage your own records');
    }
  }
}
