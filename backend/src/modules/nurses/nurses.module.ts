import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nurse } from './entities/nurse.entity';
import { HomeCareRequest } from './entities/home-care-request.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { NursesService } from './nurses.service';
import { HomeCareController, NursesController } from './nurses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Nurse, HomeCareRequest, Patient, Doctor, Appointment])],
  controllers: [NursesController, HomeCareController],
  providers: [NursesService],
  exports: [NursesService],
})
export class NursesModule {}
