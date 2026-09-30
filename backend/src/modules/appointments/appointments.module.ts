import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { NursesModule } from '../nurses/nurses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), DoctorsModule, PatientsModule, ChatbotModule, NursesModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
