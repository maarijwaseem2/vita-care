import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentStatus } from '../../common/enums';

// MySQL error code raised when a UNIQUE constraint is violated.
const ER_DUP_ENTRY = 'ER_DUP_ENTRY';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly doctorsService: DoctorsService,
  ) {}

  /**
   * Book a slot. The unique index on (doctor, date, time) guarantees no two
   * patients can grab the same slot even under concurrent requests — we catch
   * the duplicate-key error and turn it into a friendly 409.
   */
  async create(
    dto: CreateAppointmentDto,
    patientId?: number,
  ): Promise<Appointment> {
    // Validates the doctor exists (throws 404 otherwise).
    await this.doctorsService.findOne(dto.doctorId);

    const appointment = this.appointmentsRepository.create({
      doctorId: dto.doctorId,
      patientId: patientId ?? null,
      patientName: dto.patientName,
      patientPhone: dto.patientPhone,
      date: dto.date,
      timeSlot: dto.timeSlot,
      reason: dto.reason,
      status: AppointmentStatus.BOOKED,
    });

    try {
      return await this.appointmentsRepository.save(appointment);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === ER_DUP_ENTRY
      ) {
        throw new ConflictException(
          'That time slot is already booked. Please choose another.',
        );
      }
      throw error;
    }
  }

  /** Full appointment with doctor details — used to render the receipt. */
  async findOneWithDoctor(id: number): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: { doctor: true },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment #${id} not found`);
    }
    return appointment;
  }

  /** All appointments for a patient (their bookings page). */
  findForPatient(patientId: number): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { patientId },
      relations: { doctor: true },
      order: { date: 'DESC' },
    });
  }

  /** All appointments for a doctor (their schedule). */
  findForDoctor(doctorId: number): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { doctorId },
      relations: { patient: true },
      order: { date: 'ASC' },
    });
  }

  /** Slots already taken for a doctor on a given day (to grey them out). */
  async bookedSlots(doctorId: number, date: string): Promise<string[]> {
    const rows = await this.appointmentsRepository.find({
      where: { doctorId, date, status: AppointmentStatus.BOOKED },
      select: { timeSlot: true },
    });
    return rows.map((r) => r.timeSlot);
  }
}
