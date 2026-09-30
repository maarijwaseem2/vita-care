import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { TriageSession } from './entities/triage-session.entity';
import { AiClient } from './ai-client';

@Module({
  imports: [TypeOrmModule.forFeature([TriageSession]), DoctorsModule, PatientsModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, AiClient],
  exports: [ChatbotService, AiClient],
})
export class ChatbotModule {}
