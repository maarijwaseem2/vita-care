import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { PatientsService } from '../patients/patients.service';
import { DoctorsService } from '../doctors/doctors.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  /**
   * Book an appointment. Works for guests and logged-in patients:
   * if a valid patient token is present we link the booking to their profile.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    let patientId: number | undefined;
    const user = req.user as AuthUser | undefined;
    if (user?.role === UserRole.PATIENT) {
      const patient = await this.patientsService.findByUserId(user.userId);
      patientId = patient.id;
    }
    return this.appointmentsService.create(dto, patientId);
  }

  /** GET /appointments/:id/receipt — data for the printable receipt. */
  @Get(':id/receipt')
  receipt(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findOneWithDoctor(id);
  }

  /** GET /appointments/slots?doctorId=&date= — taken slots for a doctor/day. */
  @Get('slots')
  bookedSlots(
    @Query('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.bookedSlots(doctorId, date);
  }

  /** The logged-in patient's own appointments. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @Get('me/patient')
  async myPatientAppointments(@CurrentUser() user: AuthUser) {
    const patient = await this.patientsService.findByUserId(user.userId);
    return this.appointmentsService.findForPatient(patient.id);
  }

  /** The logged-in doctor's schedule. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get('me/doctor')
  async myDoctorAppointments(@CurrentUser() user: AuthUser) {
    const doctor = await this.doctorsService.findByUserId(user.userId);
    return this.appointmentsService.findForDoctor(doctor!.id);
  }
}
