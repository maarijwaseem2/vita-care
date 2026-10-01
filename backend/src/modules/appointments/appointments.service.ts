import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto, UpdateStatusDto } from './dto/create-appointment.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { AppointmentStatus, UserRole } from '../../common/enums';
import { buildDaySchedule, isBookableSlot, DaySchedule } from '../../common/utils/schedule';
import { newReference } from '../../common/utils/reference';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PatientsService } from '../patients/patients.service';
import { AuditService } from '../audit/audit.service';
import { NursesService } from '../nurses/nurses.service';

export type SlotStatus = 'available' | 'booked' | 'past';

// PostgreSQL SQLSTATE raised when a UNIQUE constraint is violated.
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    private readonly chatbotService: ChatbotService,
    private readonly audit: AuditService,
    private readonly nurses: NursesService,
  ) {}

  /**
   * Book a slot. The slot must be a real, future slot inside the doctor's OPD
   * schedule. A partial unique index on active bookings guarantees no two
   * patients get the same slot, even under concurrent requests.
   */
  async create(dto: CreateAppointmentDto, patientId?: number): Promise<Appointment> {
    const doctor = await this.doctorsService.findOne(dto.doctorId);

    const check = isBookableSlot(doctor, dto.date, dto.timeSlot);
    if (!check.ok) throw new BadRequestException(check.reason);

    const triageSessionId = await this.chatbotService.resolveToken(dto.triageSessionToken);
    const home = dto.visitType === 'home';
    if (home && !doctor.homeVisits) throw new BadRequestException('This doctor does not offer home visits');
    if (home && (dto.homeAddress?.trim().length ?? 0) < 8) {
      throw new BadRequestException('Please give the full home address for the visit');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const appointment = this.repo.create({
        reference: newReference(),
        doctorId: dto.doctorId,
        patientId: patientId ?? null,
        patientName: dto.patientName.trim(),
        patientPhone: dto.patientPhone.trim(),
        date: dto.date,
        timeSlot: dto.timeSlot,
        reason: dto.reason?.trim() || null,
        triageSessionId,
        visitType: home ? 'home' : 'clinic',
        homeAddress: home ? dto.homeAddress!.trim() : null,
        latitude: home ? dto.latitude ?? null : null,
        longitude: home ? dto.longitude ?? null : null,
        status: AppointmentStatus.BOOKED,
      });
      try {
        return await this.repo.save(appointment);
      } catch (error) {
        if (error instanceof QueryFailedError && (error as any).code === PG_UNIQUE_VIOLATION) {
          // A reference collision is astronomically rare; just retry with a new one.
          if (String((error as any).constraint ?? (error as any).detail).includes('reference')) continue;
          throw new ConflictException('That time slot is already booked. Please choose another.');
        }
        throw error;
      }
    }
    throw new ConflictException('Could not create the booking. Please try again.');
  }

  /** Slots for one doctor on one date, with availability. */
  async availability(doctorId: number, date: string) {
    const doctor = await this.doctorsService.findOne(doctorId);
    const day: DaySchedule = buildDaySchedule(doctor, date);
    const booked = day.opdDay ? await this.bookedSlots(doctorId, date) : [];
    return {
      date: day.date,
      opdDay: day.opdDay,
      closedReason: day.closedReason ?? null,
      opdSchedule: doctor.opdSchedule ?? null,
      availableTime: doctor.availableTime ?? null,
      slots: day.slots.map((s) => {
        const isBooked = booked.includes(s.time);
        const status: SlotStatus = s.past ? 'past' : isBooked ? 'booked' : 'available';
        return { time: s.time, past: s.past, booked: isBooked, status };
      }),
    };
  }

  /** Receipt by its unguessable reference (public link). */
  async findByReference(reference: string) {
    const appointment = await this.repo.findOne({
      where: { reference: reference.toUpperCase() },
      relations: { doctor: true },
    });
    if (!appointment) throw new NotFoundException('Booking not found. Please check the reference.');
    // Public link: never expose the doctor's private notes or internal ids.
    // Public link: never expose the doctor's notes, the home address or the location.
    const { doctorNotes, triageSessionId, homeAddress, latitude, longitude, ...rest } = appointment;
    return { ...rest, aiSummaryShared: !!triageSessionId };
  }

  async findForPatient(patientId: number) {
    const rows = await this.repo.find({
      where: { patientId },
      relations: { doctor: true },
      order: { date: 'DESC', timeSlot: 'ASC' },
    });
    return rows.map(({ doctorNotes, ...rest }) => ({ ...rest, aiSummaryShared: !!rest.triageSessionId }));
  }

  async findForDoctor(doctorId: number) {
    const rows = await this.repo.find({
      where: { doctorId },
      relations: { patient: true, triageSession: true },
      order: { date: 'ASC', timeSlot: 'ASC' },
    });
    // Only a light flag in the list; the full summary is fetched per visit.
    return rows.map(({ triageSession, ...rest }) => ({
      ...rest,
      hasAiSummary: !!triageSession,
      aiUrgency: (triageSession?.urgency as 'routine' | 'soon' | 'emergency' | undefined) ?? null,
    }));
  }

  async bookedSlots(doctorId: number, date: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { doctorId, date, status: AppointmentStatus.BOOKED },
      select: { timeSlot: true },
    });
    return rows.map((r) => r.timeSlot);
  }

  /**
   * Everything the doctor needs before the visit: the booking, the patient's
   * record and medical history, and the AI pre-visit summary if shared.
   * Only the doctor who owns the appointment can see this.
   */
  async clinicalView(id: number, user: AuthUser) {
    const appt = await this.repo.findOne({
      where: { id },
      relations: { doctor: true, patient: { medicalHistory: true }, triageSession: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (user.role !== UserRole.DOCTOR || appt.doctor.userId !== user.userId) {
      throw new ForbiddenException('Only the treating doctor can open this record');
    }
    await this.audit.record(user, 'clinical.view', 'appointment', id, { patientId: appt.patientId });

    const previousVisits = appt.patientId
      ? await this.repo.find({
          where: { patientId: appt.patientId, status: AppointmentStatus.COMPLETED },
          relations: { doctor: true },
          order: { date: 'DESC' },
          take: 10,
        })
      : [];

    const { triageSession, patient, ...booking } = appt;
    return {
      appointment: booking,
      patient: patient
        ? {
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`.trim(),
            age: patient.age,
            gender: patient.gender,
            city: patient.city,
            currentMedication: patient.currentMedication,
            medicalHistory: patient.medicalHistory ?? [],
          }
        : null,
      previousVisits: previousVisits
        .filter((v) => v.id !== appt.id)
        .map((v) => ({
          date: v.date,
          doctor: `${v.doctor.title} ${v.doctor.firstName} ${v.doctor.lastName}`,
          specialty: v.doctor.specialty,
          reason: v.reason,
          doctorNotes: v.doctorNotes,
        })),
      homeVisits: appt.patientId ? await this.nurses.visitsForPatient(appt.patientId) : [],
      aiSummary: triageSession ? this.chatbotService.publicSession(triageSession) : null,
    };
  }

  /**
   * Change status.
   *  - The patient who owns the booking may cancel it.
   *  - The doctor who owns it may cancel or complete it and add notes.
   */
  async updateStatus(id: number, dto: UpdateStatusDto, user: AuthUser): Promise<Appointment> {
    const appt = await this.repo.findOne({ where: { id }, relations: { doctor: true } });
    if (!appt) throw new NotFoundException('Appointment not found');

    const isDoctor = user.role === UserRole.DOCTOR && appt.doctor.userId === user.userId;
    let isPatient = false;
    if (user.role === UserRole.PATIENT && appt.patientId) {
      const me = await this.patientsService.findByUserId(user.userId).catch(() => null);
      isPatient = me?.id === appt.patientId;
    }
    if (!isDoctor && !isPatient) throw new ForbiddenException('You cannot change this appointment');
    if (isPatient && dto.status !== 'cancelled') {
      throw new ForbiddenException('Patients can only cancel a booking');
    }
    if (appt.status !== AppointmentStatus.BOOKED) {
      throw new BadRequestException(`This appointment is already ${appt.status}`);
    }

    appt.status = dto.status === 'completed' ? AppointmentStatus.COMPLETED : AppointmentStatus.CANCELLED;
    if (isDoctor && dto.doctorNotes !== undefined) appt.doctorNotes = dto.doctorNotes.trim() || null;
    const saved = await this.repo.save(appt);
    // Patients never see the doctor's private notes.
    if (!isDoctor) saved.doctorNotes = null;
    return saved;
  }
}
