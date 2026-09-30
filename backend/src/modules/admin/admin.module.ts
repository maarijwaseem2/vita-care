import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Doctor } from '../doctors/entities/doctor.entity';
import { User } from '../users/entities/user.entity';
import { TriageSession } from '../chatbot/entities/triage-session.entity';
import { BlogModule } from '../blog/blog.module';
import { NursesModule } from '../nurses/nurses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, User, TriageSession]), BlogModule, NursesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
