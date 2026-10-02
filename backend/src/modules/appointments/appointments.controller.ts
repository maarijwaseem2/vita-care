import {
  Body,
  Controller,
  Get,
  NotFoundException,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateStatusDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { PatientsService } from '../patients/patients.service';
import { DoctorsService } from '../doctors/doctors.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  /** Book as a guest or as a signed-in patient (then it appears in their dashboard). */
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Req() req: { user?: AuthUser | null }) {
    // Booking is for patients (or guests). A signed-in doctor, nurse or admin would get a booking
    // they can never see, so they are asked to use a patient account instead.
    if (req.user && req.user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Appointments are booked from a patient account. Sign out, or sign in as a patient, to book.');
    }
    let patientId: number | undefined;
    if (req.user?.role === UserRole.PATIENT) {
      const patient = await this.patientsService.findByUserId(req.user.userId);
      patientId = patient.id;
    }
    return this.appointmentsService.create(dto, patientId);
  }

  /** GET /appointments/availability?doctorId=&date= — slots with booked / past flags. */
  @Get('availability')
  availability(@Query('doctorId', ParseIntPipe) doctorId: number, @Query('date') date: string) {
    if (!DATE_RE.test(date ?? '')) throw new NotFoundException('Use date=YYYY-MM-DD');
    return this.appointmentsService.availability(doctorId, date);
  }

  /** GET /appointments/slots?doctorId=&date= — taken slots (kept for older clients). */
  @Get('slots')
  bookedSlots(@Query('doctorId', ParseIntPipe) doctorId: number, @Query('date') date: string) {
    return this.appointmentsService.bookedSlots(doctorId, date);
  }

  /** GET /appointments/receipt/VC-XXXXXXXX — public receipt by random reference. */
  @Get('receipt/:reference')
  receipt(@Param('reference') reference: string) {
    if (!/^VC-[A-Z0-9]{8}$/i.test(reference)) throw new NotFoundException('Booking not found');
    return this.appointmentsService.findByReference(reference);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @Get('me/patient')
  async myPatientAppointments(@CurrentUser() user: AuthUser) {
    const patient = await this.patientsService.findByUserId(user.userId);
    return this.appointmentsService.findForPatient(patient.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get('me/doctor')
  async myDoctorAppointments(@CurrentUser() user: AuthUser) {
    const doctor = await this.doctorsService.findByUserId(user.userId);
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return this.appointmentsService.findForDoctor(doctor.id);
  }

  /** Doctor-only: patient record, history and AI pre-visit summary. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get(':id/clinical')
  clinical(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.clinicalView(id, user);
  }

  /** Patient cancels; doctor cancels or completes (with notes). */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.updateStatus(id, dto, user);
  }
}
