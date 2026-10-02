import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { dataSourceOptions } from './config/data-source';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { BlogModule } from './modules/blog/blog.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { VoiceModule } from './modules/voice/voice.module';
import { NursesModule } from './modules/nurses/nurses.module';
import { EmailModule } from './modules/email/email.module';
import { ContactModule } from './modules/contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions }),

    // Default: 120 requests/min per IP. Login, booking and AI routes set
    // stricter limits with @Throttle. Set THROTTLE_DISABLED=true for load tests.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),

    AuthModule,
    UsersModule,
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    BlogModule,
    ChatbotModule,
    AuditModule,
    AdminModule,
    VoiceModule,
    NursesModule,
    EmailModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
