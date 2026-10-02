import { Body, Controller, Get, Injectable, Module, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EmailService, contactNotificationEmail } from '../email/email.service';
import { IsPkPhone } from '../../common/validators/pk-phone';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

export const CONTACT_TOPICS = ['General question', 'Appointment problem', 'Join as doctor or nurse', 'Technical problem', 'Feedback or complaint', 'Partnership'];

export class ContactDto {
  @IsString() @MinLength(2, { message: 'Please write your name' }) @MaxLength(120) name: string;
  @IsEmail({}, { message: 'Enter a valid email address' }) email: string;
  @IsOptional() @IsPkPhone({ allowEmpty: true }) phone?: string;
  @IsIn(CONTACT_TOPICS, { message: 'Choose a topic' }) topic: string;
  @IsString() @MinLength(10, { message: 'Please write a little more (at least 10 characters)' }) @MaxLength(3000) message: string;
}

class StatusDto {
  @IsIn(['new', 'read', 'done']) status: 'new' | 'read' | 'done';
}

@Injectable()
export class ContactService {
  constructor(
    private readonly ds: DataSource,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: ContactDto) {
    const [row] = await this.ds.query(
      `INSERT INTO contact_messages (name, email, phone, topic, message) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [dto.name.trim(), dto.email.trim().toLowerCase(), dto.phone?.trim() || null, dto.topic, dto.message.trim()],
    );
    // Notify the support inbox (never blocks the user's request).
    const to = this.config.get<string>('SUPPORT_EMAIL') || 'maarijwaseem7@gmail.com';
    this.email.send({ to, ...contactNotificationEmail(dto) }).catch(() => undefined);
    return { received: true, id: row.id, message: 'Thank you. We usually reply within one working day.' };
  }

  async list(status?: string, page = 1) {
    const limit = 20;
    const where = status && status !== 'all' ? `WHERE status = $1` : '';
    const args: unknown[] = where ? [status] : [];
    const items = await this.ds.query(
      `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      args,
    );
    const [{ total }] = await this.ds.query(`SELECT count(*)::int AS total FROM contact_messages ${where}`, args);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async setStatus(id: number, status: string) {
    await this.ds.query(`UPDATE contact_messages SET status = $1 WHERE id = $2`, [status, id]);
    return { id, status };
  }
}

@Controller()
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** POST /contact — public contact form (5 messages per 10 minutes per visitor). */
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('contact')
  create(@Body() dto: ContactDto) {
    return this.contact.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/contact-messages')
  list(@Query('status') status?: string, @Query('page') page?: string) {
    return this.contact.list(status, Math.max(1, Number(page) || 1));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/contact-messages/:id')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusDto) {
    return this.contact.setStatus(id, dto.status);
  }
}

@Module({ controllers: [ContactController], providers: [ContactService] })
export class ContactModule {}
