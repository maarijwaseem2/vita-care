import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { TriageSession } from '../chatbot/entities/triage-session.entity';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { DoctorQuery, TriageQuery, UserQuery, VerifyDoctorDto } from './dto/admin.dto';
import { UserRole } from '../../common/enums';

const paged = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
});

@Injectable()
export class AdminService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TriageSession) private readonly sessions: Repository<TriageSession>,
    private readonly audit: AuditService,
  ) {}

  /** Numbers for the admin dashboard. One round-trip per block, all cheap aggregates. */
  async stats() {
    const q = (sql: string) => this.ds.query(sql);
    const [counts] = await q(`
      SELECT
        (SELECT count(*) FROM patients)::int                                             AS patients,
        (SELECT count(*) FROM doctors WHERE verification_status = 'verified')::int       AS "doctorsVerified",
        (SELECT count(*) FROM doctors WHERE verification_status = 'pending')::int        AS "doctorsPending",
        (SELECT count(*) FROM appointments)::int                                         AS appointments,
        (SELECT count(*) FROM appointments WHERE status = 'booked' AND date >= CURRENT_DATE)::int AS "upcomingAppointments",
        (SELECT count(*) FROM appointments WHERE triage_session_id IS NOT NULL)::int     AS "bookingsWithAiSummary",
        (SELECT count(*) FROM triage_sessions)::int                                      AS consultations,
        (SELECT count(*) FROM triage_sessions WHERE urgency = 'emergency')::int          AS emergencies,
        (SELECT count(*) FROM triage_sessions WHERE urgency = 'emergency' AND reviewed_at IS NULL)::int AS "emergenciesUnreviewed",
        (SELECT count(*) FROM triage_sessions WHERE mode = 'offline')::int               AS "offlineConsultations",
        (SELECT count(*) FROM blog_posts WHERE status = 'published')::int                AS "postsPublished"
    `);
    const daily = await q(`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
             (SELECT count(*) FROM triage_sessions t WHERE t.created_at::date = d::date)::int AS consultations,
             (SELECT count(*) FROM appointments a WHERE a.created_at::date = d::date)::int    AS bookings
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') d
       ORDER BY d
    `);
    const bySpecialty = await q(`
      SELECT specialty, count(*)::int AS count FROM triage_sessions
       WHERE specialty IS NOT NULL GROUP BY specialty ORDER BY count DESC
    `);
    const byLanguage = await q(`
      SELECT language, count(*)::int AS count FROM triage_sessions GROUP BY language ORDER BY count DESC
    `);
    const byUrgency = await q(`
      SELECT urgency, count(*)::int AS count FROM triage_sessions GROUP BY urgency
    `);
    return { ...counts, daily, bySpecialty, byLanguage, byUrgency };
  }

  // ---------- doctors ----------

  async listDoctors(q: DoctorQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.doctors
      .createQueryBuilder('d')
      .leftJoin('d.user', 'u')
      .addSelect(['u.email', 'u.isActive', 'u.createdAt']);
    if (q.status && q.status !== 'all') qb.andWhere('d.verificationStatus = :s', { s: q.status });
    if (q.search) {
      qb.andWhere(
        `(d.firstName ILIKE :t OR d.lastName ILIKE :t OR d.pmdcNumber ILIKE :t OR d.city ILIKE :t OR u.email ILIKE :t)`,
        { t: `%${q.search}%` },
      );
    }
    // Pending first so the review queue is always on top.
    // One-to-one join, so plain OFFSET/LIMIT is safe (and works with a computed sort).
    qb.addSelect(`CASE d.verification_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 2 ELSE 1 END`, 'queue_rank')
      .orderBy('queue_rank', 'ASC')
      .addOrderBy('d.verifiedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('d.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);
    const [items, total] = await qb.getManyAndCount();
    return paged(items, total, page, limit);
  }

  async verifyDoctor(id: number, dto: VerifyDoctorDto, actor: AuthUser) {
    const doctor = await this.doctors.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (dto.status === 'rejected' && !dto.note?.trim()) {
      throw new BadRequestException('Please give a reason so the doctor can fix it');
    }
    if (dto.status === 'verified' && !doctor.pmdcNumber) {
      throw new BadRequestException('A doctor cannot be verified without a PMDC number');
    }
    doctor.verificationStatus = dto.status;
    doctor.verificationNote = dto.note?.trim() || null;
    doctor.verifiedAt = dto.status === 'verified' ? new Date() : null;
    const saved = await this.doctors.save(doctor);
    await this.audit.record(actor, `doctor.${dto.status}`, 'doctor', id, {
      pmdcNumber: doctor.pmdcNumber,
      note: dto.note ?? null,
    });
    return saved;
  }

  // ---------- AI safety monitor ----------

  async listTriage(q: TriageQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (q.urgency && q.urgency !== 'all') where.urgency = q.urgency;
    if (q.reviewed === 'yes') where.reviewedAt = Not(IsNull());
    if (q.reviewed === 'no') where.reviewedAt = IsNull();
    const [rows, total] = await this.sessions.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // The list never carries full transcripts; open one to read it.
    const items = rows.map(({ transcript, ...s }) => ({
      ...s,
      firstMessage: transcript.find((m) => m.role === 'user')?.content.slice(0, 160) ?? '',
      turns: transcript.length,
    }));
    return paged(items, total, page, limit);
  }

  async getTriage(id: number, actor: AuthUser) {
    const s = await this.sessions.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Consultation not found');
    await this.audit.record(actor, 'triage.view', 'triage_session', id);
    return s;
  }

  async reviewTriage(id: number, note: string, actor: AuthUser) {
    const s = await this.sessions.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Consultation not found');
    s.reviewedAt = new Date();
    s.reviewNote = note.trim();
    await this.sessions.save(s);
    await this.audit.record(actor, 'triage.review', 'triage_session', id, { note });
    return { id, reviewedAt: s.reviewedAt, reviewNote: s.reviewNote };
  }

  // ---------- users ----------

  async listUsers(q: UserQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qb = this.users.createQueryBuilder('u')
      .leftJoinAndSelect('u.patient', 'p')
      .leftJoinAndSelect('u.doctor', 'd')

    if (q.role && q.role !== 'all') qb.andWhere('u.role = :r', { r: q.role });
    if (q.search) {
      qb.andWhere(
        `(u.email ILIKE :t OR p.firstName ILIKE :t OR p.lastName ILIKE :t OR d.firstName ILIKE :t OR d.lastName ILIKE :t
          OR u.id IN (SELECT user_id FROM nurses WHERE first_name ILIKE :t OR last_name ILIKE :t))`,
        { t: `%${q.search}%` },
      );
    }
    qb.orderBy('u.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const nurseRows: { user_id: number; first_name: string; last_name: string; city: string }[] = rows.some((u) => u.role === UserRole.NURSE)
      ? await this.ds.query(`SELECT user_id, first_name, last_name, city FROM nurses WHERE user_id = ANY($1)`, [rows.map((u) => u.id)])
      : [];
    const nurseBy = new Map(nurseRows.map((n) => [n.user_id, n]));
    const items = rows.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      name: u.doctor
        ? `${u.doctor.title} ${u.doctor.firstName} ${u.doctor.lastName}`
        : nurseBy.get(u.id)
          ? `Nurse ${nurseBy.get(u.id)!.first_name} ${nurseBy.get(u.id)!.last_name}`
        : u.patient
          ? `${u.patient.firstName} ${u.patient.lastName}`
          : 'Administrator',
      city: u.doctor?.city ?? u.patient?.city ?? nurseBy.get(u.id)?.city ?? null,
    }));
    return paged(items, total, page, limit);
  }

  async setActive(id: number, isActive: boolean, actor: AuthUser) {
    if (id === actor.userId) throw new ForbiddenException('You cannot suspend your own account');
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN && !isActive) {
      const admins = await this.users.count({ where: { role: UserRole.ADMIN, isActive: true } });
      if (admins <= 1) throw new ForbiddenException('The last active admin cannot be suspended');
    }
    user.isActive = isActive;
    await this.users.save(user);
    await this.audit.record(actor, isActive ? 'user.activate' : 'user.suspend', 'user', id);
    return { id, isActive };
  }
}
