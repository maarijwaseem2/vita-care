import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Nurse } from './entities/nurse.entity';
import { HomeCareRequest } from './entities/home-care-request.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CompleteVisitDto, CreateHomeCareDto, DoctorOrderDto, NurseQuery, UpdateNurseDto } from './dto/nurse.dto';
import { HOME_SERVICES } from './services';
import { alertLevel, checkVitals } from './vitals';
import { clinicNow, daysBetween } from '../../common/utils/schedule';
import { newReference } from '../../common/utils/reference';

/** What patients may see about a nurse (no phone until a visit is accepted). */
const PUBLIC_NURSE = (n: Nurse) => ({
  id: n.id, firstName: n.firstName, lastName: n.lastName, gender: n.gender, city: n.city, areas: n.areas,
  qualification: n.qualification, skills: n.skills, experienceYears: n.experienceYears, visitFee: n.visitFee,
  availableDays: n.availableDays, bio: n.bio, rating: n.rating,
});

@Injectable()
export class NursesService {
  constructor(
    @InjectRepository(Nurse) private readonly nurses: Repository<Nurse>,
    @InjectRepository(HomeCareRequest) private readonly requests: Repository<HomeCareRequest>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    private readonly audit: AuditService,
  ) {}

  services() {
    return HOME_SERVICES;
  }

  // ---------- public directory ----------

  async listVerified(q: NurseQuery) {
    const qb = this.nurses.createQueryBuilder('n').where("n.verificationStatus = 'verified'");
    if (q.city) qb.andWhere('n.city ILIKE :city', { city: q.city });
    if (q.gender) qb.andWhere('n.gender = :g', { g: q.gender });
    if (q.service) qb.andWhere(`n.skills::jsonb ? :svc`, { svc: q.service });
    const rows = await qb.orderBy('n.rating', 'DESC').addOrderBy('n.id', 'ASC').getMany();
    return rows.map(PUBLIC_NURSE);
  }

  // ---------- nurse self ----------

  async me(user: AuthUser): Promise<Nurse> {
    const nurse = await this.nurses.findOne({ where: { userId: user.userId } });
    if (!nurse) throw new NotFoundException('Nurse profile not found');
    return nurse;
  }

  async updateMe(user: AuthUser, dto: UpdateNurseDto) {
    const nurse = await this.me(user);
    Object.assign(nurse, dto);
    return this.nurses.save(nurse);
  }

  private async verifiedMe(user: AuthUser): Promise<Nurse> {
    const nurse = await this.me(user);
    if (nurse.verificationStatus !== 'verified') {
      throw new ForbiddenException('Your PNC licence is still being verified. You can accept visits after approval.');
    }
    return nurse;
  }

  /** Open requests the nurse can take: same city, gender preference met, service in skills, or addressed to them. */
  async openForNurse(user: AuthUser) {
    const nurse = await this.verifiedMe(user);
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.patient', 'p')
      .leftJoinAndSelect('r.orderedByDoctor', 'd')
      .where("r.status = 'requested'")
      .andWhere('r.visitDate >= :today', { today: clinicNow().date })
      .andWhere(new Brackets((b) => {
        b.where('r.nurseId = :me', { me: nurse.id }).orWhere(
          new Brackets((o) => {
            o.where('r.nurseId IS NULL')
              .andWhere('LOWER(r.city) = LOWER(:city)', { city: nurse.city })
              .andWhere("(r.preferredGender = 'any' OR r.preferredGender = :g)", { g: nurse.gender ?? 'any' });
          }),
        );
      }))
      .orderBy('r.visitDate', 'ASC')
      .addOrderBy('r.createdAt', 'ASC');
    const rows = await qb.getMany();
    const skills = nurse.skills ?? [];
    return rows.filter((r) => r.nurseId === nurse.id || skills.includes(r.service)).map((r) => this.forNurse(r, false));
  }

  async mineForNurse(user: AuthUser) {
    const nurse = await this.me(user);
    const rows = await this.requests.find({
      where: { nurseId: nurse.id },
      relations: { patient: { medicalHistory: true }, orderedByDoctor: true },
      order: { visitDate: 'DESC' },
    });
    return rows.filter((r) => r.status !== 'requested').map((r) => this.forNurse(r, true));
  }

  async accept(user: AuthUser, id: number) {
    const nurse = await this.verifiedMe(user);
    const r = await this.requests.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'requested') throw new BadRequestException('This visit has already been taken or closed');
    if (r.nurseId && r.nurseId !== nurse.id) throw new ForbiddenException('This visit was requested from another nurse');
    // Atomic claim: only succeeds if nobody else accepted in between.
    const res = await this.requests
      .createQueryBuilder()
      .update()
      .set({ status: 'accepted', nurseId: nurse.id, acceptedAt: () => 'now()' })
      .where("id = :id AND status = 'requested'", { id })
      .execute();
    if (!res.affected) throw new BadRequestException('Another nurse accepted this visit a moment ago');
    await this.audit.record(user, 'homecare.accept', 'home_care_request', id);
    return this.requests.findOne({ where: { id } });
  }

  async decline(user: AuthUser, id: number) {
    const nurse = await this.me(user);
    const r = await this.requests.findOne({ where: { id } });
    if (!r || r.nurseId !== nurse.id) throw new NotFoundException('Request not found');
    if (r.status === 'completed' || r.status === 'cancelled') throw new BadRequestException(`This visit is already ${r.status}`);
    // Back to the open pool so another nurse can take it.
    r.nurseId = null;
    r.status = 'requested';
    r.acceptedAt = null;
    await this.requests.save(r);
    await this.audit.record(user, 'homecare.decline', 'home_care_request', id);
    return r;
  }

  async complete(user: AuthUser, id: number, dto: CompleteVisitDto) {
    const nurse = await this.verifiedMe(user);
    const r = await this.requests.findOne({ where: { id } });
    if (!r || r.nurseId !== nurse.id) throw new NotFoundException('Request not found');
    if (r.status !== 'accepted') throw new BadRequestException('Accept the visit before completing it');
    if (daysBetween(clinicNow().date, r.visitDate) > 0) throw new BadRequestException('You can complete a visit on or after its date');
    const alerts = checkVitals(dto.vitals);
    r.vitals = dto.vitals;
    r.vitalAlerts = alerts;
    r.alertLevel = alertLevel(alerts);
    r.nurseNotes = dto.notes.trim();
    r.status = 'completed';
    r.completedAt = new Date();
    await this.requests.save(r);
    await this.audit.record(user, 'homecare.complete', 'home_care_request', id, { alertLevel: r.alertLevel });
    return this.forNurse(r, true);
  }

  // ---------- patient ----------

  private async patientOf(user: AuthUser): Promise<Patient> {
    const p = await this.patients.findOne({ where: { userId: user.userId } });
    if (!p) throw new NotFoundException('Patient profile not found');
    return p;
  }

  private checkDate(visitDate: string) {
    const d = daysBetween(clinicNow().date, visitDate);
    if (Number.isNaN(d) || d < 0) throw new BadRequestException('Choose today or a future date');
    if (d > 30) throw new BadRequestException('Home visits can be booked up to 30 days ahead');
  }

  async create(user: AuthUser, dto: CreateHomeCareDto) {
    const patient = await this.patientOf(user);
    this.checkDate(dto.visitDate);
    if (dto.nurseId) {
      const n = await this.nurses.findOne({ where: { id: dto.nurseId, verificationStatus: 'verified' } });
      if (!n) throw new BadRequestException('That nurse is not available');
      if (!(n.skills ?? []).includes(dto.service)) throw new BadRequestException('That nurse does not provide this service');
    }
    const r = await this.requests.save(
      this.requests.create({
        reference: newReference().replace('VC-', 'HN-'),
        patientId: patient.id,
        nurseId: dto.nurseId ?? null,
        service: dto.service,
        visitDate: dto.visitDate,
        timeWindow: dto.timeWindow,
        address: dto.address.trim(),
        city: dto.city.trim(),
        preferredGender: dto.preferredGender ?? 'any',
        notes: dto.notes?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        status: 'requested',
      }),
    );
    return r;
  }

  async mineForPatient(user: AuthUser) {
    const patient = await this.patientOf(user);
    const rows = await this.requests.find({
      where: { patientId: patient.id },
      relations: { nurse: true, orderedByDoctor: true },
      order: { visitDate: 'DESC', id: 'DESC' },
    });
    return rows.map((r) => ({
      ...r,
      // The nurse's phone is shared with the patient only once the visit is accepted.
      nurse: r.nurse ? { ...PUBLIC_NURSE(r.nurse), phone: r.status === 'accepted' || r.status === 'completed' ? r.nurse.phone : null } : null,
      orderedByDoctor: r.orderedByDoctor ? { id: r.orderedByDoctor.id, name: `${r.orderedByDoctor.title} ${r.orderedByDoctor.firstName} ${r.orderedByDoctor.lastName}` } : null,
    }));
  }

  async cancelByPatient(user: AuthUser, id: number) {
    const patient = await this.patientOf(user);
    const r = await this.requests.findOne({ where: { id } });
    if (!r || r.patientId !== patient.id) throw new NotFoundException('Request not found');
    if (r.status === 'completed' || r.status === 'cancelled') throw new BadRequestException(`This visit is already ${r.status}`);
    r.status = 'cancelled';
    return this.requests.save(r);
  }

  // ---------- doctor ----------

  /** The treating doctor orders a home visit after an appointment; address comes from the patient's profile. */
  async orderByDoctor(user: AuthUser, dto: DoctorOrderDto) {
    const doctor = await this.doctors.findOne({ where: { userId: user.userId } });
    if (!doctor) throw new ForbiddenException('Doctor profile not found');
    const appt = await this.appointments.findOne({ where: { id: dto.appointmentId } });
    if (!appt || appt.doctorId !== doctor.id) throw new ForbiddenException('You can only order care for your own patients');
    if (!appt.patientId) throw new BadRequestException('This was a guest booking; the patient needs a Vita Care account for home visits');
    const patient = await this.patients.findOne({ where: { id: appt.patientId } });
    if (!patient?.address || !patient.city) {
      throw new BadRequestException("The patient's address is missing from their profile. Ask them to add it.");
    }
    this.checkDate(dto.visitDate);
    const r = await this.requests.save(
      this.requests.create({
        reference: newReference().replace('VC-', 'HN-'),
        patientId: patient.id,
        orderedByDoctorId: doctor.id,
        appointmentId: appt.id,
        service: dto.service,
        visitDate: dto.visitDate,
        timeWindow: dto.timeWindow ?? 'morning',
        address: patient.address,
        city: patient.city,
        preferredGender: 'any',
        notes: dto.notes?.trim() || null,
        status: 'requested',
      }),
    );
    await this.audit.record(user, 'homecare.order', 'home_care_request', r.id, { appointmentId: appt.id });
    return r;
  }

  /** Home visits for a patient, for the treating doctor's clinical view. */
  async visitsForPatient(patientId: number) {
    const rows = await this.requests.find({
      where: { patientId },
      relations: { nurse: true },
      order: { visitDate: 'DESC' },
      take: 10,
    });
    return rows.map((r) => ({
      id: r.id, service: r.service, visitDate: r.visitDate, status: r.status,
      nurse: r.nurse ? `${r.nurse.firstName} ${r.nurse.lastName}` : null,
      vitals: r.vitals, vitalAlerts: r.vitalAlerts ?? [], alertLevel: r.alertLevel, nurseNotes: r.nurseNotes,
    }));
  }

  // ---------- admin ----------

  async adminList(status = 'all', search = '', page = 1, limit = 20) {
    const qb = this.nurses.createQueryBuilder('n').leftJoin('n.user', 'u').addSelect(['u.email', 'u.isActive']);
    if (status !== 'all') qb.andWhere('n.verificationStatus = :s', { s: status });
    if (search) qb.andWhere('(n.firstName ILIKE :t OR n.lastName ILIKE :t OR n.pncNumber ILIKE :t OR n.city ILIKE :t OR u.email ILIKE :t)', { t: `%${search}%` });
    qb.addSelect(`CASE n.verification_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 2 ELSE 1 END`, 'queue_rank')
      .orderBy('queue_rank', 'ASC').addOrderBy('n.verifiedAt', 'DESC', 'NULLS LAST').addOrderBy('n.createdAt', 'DESC').offset((page - 1) * limit).limit(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async verify(actor: AuthUser, id: number, status: 'verified' | 'rejected' | 'pending', note?: string) {
    const n = await this.nurses.findOne({ where: { id } });
    if (!n) throw new NotFoundException('Nurse not found');
    if (status === 'rejected' && !note?.trim()) throw new BadRequestException('Please give a reason so the nurse can fix it');
    n.verificationStatus = status;
    n.verificationNote = note?.trim() || null;
    n.verifiedAt = status === 'verified' ? new Date() : null;
    await this.nurses.save(n);
    await this.audit.record(actor, `nurse.${status}`, 'nurse', id, { pncNumber: n.pncNumber, note: note ?? null });
    return n;
  }

  async adminStats() {
    const [row] = await this.requests.query(`
      SELECT (SELECT count(*) FROM nurses WHERE verification_status = 'verified')::int AS "nursesVerified",
             (SELECT count(*) FROM nurses WHERE verification_status = 'pending')::int  AS "nursesPending",
             (SELECT count(*) FROM home_care_requests)::int AS "homeVisits",
             (SELECT count(*) FROM home_care_requests WHERE status = 'requested')::int AS "homeVisitsOpen",
             (SELECT count(*) FROM home_care_requests WHERE alert_level = 'emergency')::int AS "homeVisitEmergencies"`);
    return row;
  }

  // ---------- helpers ----------

  /** Nurses see only what they need: no patient phone/history until they accept. */
  private forNurse(r: HomeCareRequest, accepted: boolean) {
    const p = r.patient;
    return {
      id: r.id, reference: r.reference, service: r.service, visitDate: r.visitDate, timeWindow: r.timeWindow,
      city: r.city, address: accepted ? r.address : r.address.split(',').slice(-2).join(',').trim(),
      preferredGender: r.preferredGender, notes: r.notes, status: r.status, vitals: r.vitals,
      vitalAlerts: r.vitalAlerts ?? [], alertLevel: r.alertLevel, nurseNotes: r.nurseNotes, completedAt: r.completedAt,
      directRequest: !!r.nurseId,
      // Exact location only after the nurse has accepted the visit.
      latitude: accepted ? r.latitude : null,
      longitude: accepted ? r.longitude : null,
      orderedBy: r.orderedByDoctor ? `${r.orderedByDoctor.title} ${r.orderedByDoctor.firstName} ${r.orderedByDoctor.lastName}` : null,
      patient: p
        ? {
            name: accepted ? `${p.firstName} ${p.lastName}` : `${p.firstName} ${p.lastName[0] ?? ''}.`,
            age: p.age, gender: p.gender,
            phone: accepted ? p.phone : null,
            conditions: accepted ? (p.medicalHistory ?? []).map((h) => h.condition) : undefined,
            currentMedication: accepted ? p.currentMedication : undefined,
          }
        : null,
    };
  }
}
