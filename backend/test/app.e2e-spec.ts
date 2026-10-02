import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DoctorsService } from '../src/modules/doctors/doctors.service';
import { FirebaseVerifier } from '../src/modules/auth/google-auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsageService } from '../src/modules/chatbot/usage.service';

// Force the offline AI engine and disable rate limits for a deterministic run.
process.env.AI_API_KEY = '';
process.env.THROTTLE_DISABLED = 'true';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * End-to-end tests. These boot the real NestJS application with the exact
 * production configuration (configureApp) and exercise the HTTP API against
 * a live PostgreSQL database.
 *
 * Self-contained and repeatable: accounts use random emails and bookings use
 * whichever real OPD slots are still free, so the suite can be run again and
 * again without colliding with itself or the seed data.
 *
 * Prerequisites: PostgreSQL running, `npm run migration:run` and `npm run seed`.
 */
describe('Vita Care API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof app.getHttpServer>;

  const stamp = Date.now();
  const newPatientEmail = `e2e_${stamp}_${Math.floor(Math.random() * 1e5)}@vitacare.test`;
  const password = 'Password123';

  let newPatientToken = '';
  let newPatientVerifyUrl = '';
  let demoPatientToken = '';
  let doctorToken = '';
  let otherDoctorToken = '';
  let anyDoctorId = 0;
  let neurologyDoctorId = 0;

  // Filled in beforeAll from the live availability endpoint.
  let bookingDoctorId = 0;
  let bookingDate = '';
  let SLOT_A = '';
  let SLOT_B = '';
  let SLOT_C = '';

  const login = async (email: string) =>
    (await request(http).post('/api/auth/login').send({ email, password })).body.accessToken as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
    http = app.getHttpServer();

    // Find a real OPD day for dr.saif (Neurology) with 3 free slots.
    doctorToken = await login('dr.saif@vitacare.test');
    otherDoctorToken = await login('dr.ayesha@vitacare.test');
    const me = await request(http).get('/api/doctors/me/profile').set('Authorization', `Bearer ${doctorToken}`);
    bookingDoctorId = me.body.id;
    for (let i = 1; i <= 30 && !bookingDate; i++) {
      const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
      const res = await request(http).get('/api/appointments/availability').query({ doctorId: bookingDoctorId, date: d });
      const free = (res.body.slots ?? []).filter((s: any) => s.status === 'available').map((s: any) => s.time);
      if (free.length >= 3) {
        bookingDate = d;
        [SLOT_A, SLOT_B, SLOT_C] = free.slice(-3);
      }
    }
    if (!bookingDate) throw new Error('No free OPD slots left for dr.saif — re-seed the database.');
  });

  afterAll(async () => {
    // Remove everything this run created so the demo database stays clean.
    const ds = app.get(DataSource);
    const names = ['Guest Booker', 'Guest Booker Two', 'Second Person', 'E2E Tester', 'Rebooker'];
    await ds.query(`DELETE FROM appointments WHERE patient_name = ANY($1)`, [names]);
    await ds.query(`DELETE FROM appointments WHERE reason LIKE 'e2e%'`);
    await ds.query(
      `DELETE FROM triage_sessions WHERE patient_id IN
         (SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email LIKE 'e2e\\_%')
         OR (patient_id IS NULL AND created_at > now() - interval '1 hour'
             AND transcript::text LIKE '%e2e%')`,
    );
    await ds.query(`DELETE FROM home_care_requests WHERE notes LIKE 'e2e%'`);
    await ds.query(`DELETE FROM contact_messages WHERE email LIKE 'e2e%'`);
    await ds.query(`DELETE FROM users WHERE email LIKE 'e2e\\_%'`);
    await ds.query(`DELETE FROM users WHERE email LIKE 'e2e\\_google\\_%'`);
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------
  describe('Health', () => {
    it('GET /api/health → 200', async () => {
      const res = await request(http).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Doctors (public reads + filters)
  // ---------------------------------------------------------------------------
  describe('Doctors', () => {
    it('GET /api/doctors → returns the seeded doctors', async () => {
      const res = await request(http).get('/api/doctors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(8);
      anyDoctorId = res.body[0].id;
    });

    it('GET /api/doctors?specialty=Neurology → filters by specialty', async () => {
      const res = await request(http).get('/api/doctors').query({
        specialty: 'Neurology',
      });
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const doc of res.body) {
        expect(doc.specialty).toBe('Neurology');
      }
      neurologyDoctorId = res.body[0].id;
    });

    it('GET /api/doctors?search=Saif → matches by name', async () => {
      const res = await request(http).get('/api/doctors').query({ search: 'Saif' });
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      const names = res.body.map(
        (d: any) => `${d.firstName} ${d.lastName}`.toLowerCase(),
      );
      expect(names.some((n: string) => n.includes('saif'))).toBe(true);
    });

    it('GET /api/doctors?search=cardio-ish text → matches specialty (no 500)', async () => {
      const res = await request(http).get('/api/doctors').query({ search: 'heart' });
      expect(res.status).toBe(200);
      expect(res.body.every((d: any) => d.specialty === 'Heart Care')).toBe(true);
    });

    it('GET /api/doctors?city=karachi → city filter is case-insensitive', async () => {
      const res = await request(http).get('/api/doctors').query({ city: 'karachi' });
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/doctors?search=100% → special characters are matched literally', async () => {
      const res = await request(http).get('/api/doctors').query({ search: '100%' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('GET /api/doctors?city=Karachi → filters by city', async () => {
      const res = await request(http).get('/api/doctors').query({ city: 'Karachi' });
      expect(res.status).toBe(200);
      for (const doc of res.body) {
        expect(doc.city).toBe('Karachi');
      }
    });

    it('GET /api/doctors/cities → returns a list of cities', async () => {
      const res = await request(http).get('/api/doctors/cities');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/doctors/:id → returns a full profile', async () => {
      const res = await request(http).get(`/api/doctors/${anyDoctorId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(anyDoctorId);
      expect(res.body).toHaveProperty('qualifications');
      expect(res.body).toHaveProperty('specialty');
    });

    it('GET /api/doctors/999999 → 404 for a missing doctor', async () => {
      const res = await request(http).get('/api/doctors/999999');
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Blog (public reads)
  // ---------------------------------------------------------------------------
  describe('Blog', () => {
    let firstSlug = '';

    it('GET /api/blog → first page of 9 published posts with paging info', async () => {
      const res = await request(http).get('/api/blog');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(9);
      expect(res.body.total).toBeGreaterThanOrEqual(12);
      expect(res.body.pages).toBeGreaterThanOrEqual(2);
      firstSlug = res.body.items[0].slug;
    });

    it('GET /api/blog?page=2 → the next page', async () => {
      const res = await request(http).get('/api/blog').query({ page: 2 });
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('GET /api/blog/:slug → post with SEO fields and related posts', async () => {
      expect(firstSlug).toBeTruthy();
      // A seeded post, so the check does not depend on what was published last.
      const res = await request(http).get('/api/blog/understanding-cbc-report');
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('understanding-cbc-report');
      expect(res.body.metaTitle).toBeTruthy();
      expect(Array.isArray(res.body.related)).toBe(true);
    });

    it('GET /api/blog/does-not-exist → 404', async () => {
      const res = await request(http).get('/api/blog/this-slug-does-not-exist');
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  describe('Auth', () => {
    it('POST /api/auth/register/patient → creates an account + returns a token', async () => {
      const res = await request(http)
        .post('/api/auth/register/patient')
        .send({
          email: newPatientEmail,
          password,
          firstName: 'E2E',
          lastName: 'Tester',
          age: 30,
          gender: 'male',
          phone: '03001234567',
          city: 'Karachi',
        });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user.email).toBe(newPatientEmail);
      newPatientToken = res.body.accessToken;
      newPatientVerifyUrl = res.body.devVerificationUrl;
    });

    it('POST /api/auth/register/patient (same email) → 409 conflict', async () => {
      const res = await request(http)
        .post('/api/auth/register/patient')
        .send({ phone: '03001234567', city: 'Karachi',
          email: newPatientEmail,
          password,
          firstName: 'Dup',
          lastName: 'Licate',
        });
      expect(res.status).toBe(409);
    });

    it('POST /api/auth/register/patient (invalid body) → 400', async () => {
      const res = await request(http)
        .post('/api/auth/register/patient')
        .send({ phone: '03001234567', city: 'Karachi', email: 'not-an-email', password: '123' }); // bad email + short pw + missing names
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login → returns a token for valid credentials', async () => {
      const res = await request(http)
        .post('/api/auth/login')
        .send({ email: newPatientEmail, password });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it('POST /api/auth/login → 401 for a wrong password', async () => {
      const res = await request(http)
        .post('/api/auth/login')
        .send({ email: newPatientEmail, password: 'WrongPassword' });
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me (with token) → returns the current user', async () => {
      const res = await request(http)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newPatientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(newPatientEmail);
    });

    it('GET /api/auth/me (no token) → 401', async () => {
      const res = await request(http).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('POST /api/auth/login → the seeded demo patient can log in', async () => {
      const res = await request(http)
        .post('/api/auth/login')
        .send({ email: 'patient@vitacare.test', password: 'Password123' });
      demoPatientToken = res.body.accessToken; // capture first, assert after
      expect(res.status).toBe(200);
      expect(demoPatientToken).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Appointments (the core booking feature)
  // ---------------------------------------------------------------------------
  describe('Appointments', () => {
    let guestReference = '';
    let linkedAppointmentId = 0;
    let triageToken = '';

    const book = (body: Record<string, unknown>, token?: string) => {
      const r = request(http).post('/api/appointments');
      if (token) r.set('Authorization', `Bearer ${token}`);
      return r.send({ doctorId: bookingDoctorId, patientPhone: '03007654321', date: bookingDate, ...body });
    };

    it('GET /api/appointments/availability → real OPD slots with status', async () => {
      const res = await request(http)
        .get('/api/appointments/availability')
        .query({ doctorId: bookingDoctorId, date: bookingDate });
      expect(res.status).toBe(200);
      expect(res.body.opdDay).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);
    });

    it('POST /api/appointments → a guest can book a slot and gets a reference', async () => {
      const res = await book({ patientName: 'Guest Booker', timeSlot: SLOT_A, reason: 'e2e guest' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('booked');
      expect(res.body.reference).toMatch(/^VC-[A-Z0-9]{8}$/);
      guestReference = res.body.reference;
    });

    it('POST /api/appointments → double-booking the same slot is rejected with 409', async () => {
      const res = await book({ patientName: 'Second Person', timeSlot: SLOT_A });
      expect(res.status).toBe(409);
    });

    it('POST /api/appointments → a different slot on the same day is allowed', async () => {
      const res = await book({ patientName: 'Guest Booker Two', timeSlot: SLOT_B });
      expect(res.status).toBe(201);
    });

    it('POST /api/appointments → past dates are rejected', async () => {
      const res = await book({ patientName: 'Time Traveller', date: '2001-01-01', timeSlot: SLOT_A });
      expect(res.status).toBe(400);
    });

    it('POST /api/appointments → times outside OPD hours are rejected', async () => {
      const res = await book({ patientName: 'Early Bird', timeSlot: '03:00 AM' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/OPD hours/);
    });

    it('POST /api/appointments → junk time slot labels are rejected', async () => {
      const res = await book({ patientName: 'Junk', timeSlot: 'blahblah' });
      expect(res.status).toBe(400);
    });

    it('POST /api/appointments (invalid phone) → 400', async () => {
      const res = await book({ patientName: 'Bad Phone', patientPhone: 'nope', timeSlot: SLOT_C });
      expect(res.status).toBe(400);
    });

    it('GET /api/appointments/slots → lists the taken slots for that day', async () => {
      const res = await request(http)
        .get('/api/appointments/slots')
        .query({ doctorId: bookingDoctorId, date: bookingDate });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.arrayContaining([SLOT_A, SLOT_B]));
    });

    it('GET /api/appointments/receipt/:reference → receipt with doctor info', async () => {
      const res = await request(http).get(`/api/appointments/receipt/${guestReference}`);
      expect(res.status).toBe(200);
      expect(res.body.reference).toBe(guestReference);
      expect(res.body.doctor.firstName).toBeDefined();
    });

    it('GET /api/appointments/:id/receipt (old numeric route) → gone (no enumeration)', async () => {
      const res = await request(http).get('/api/appointments/1/receipt');
      expect(res.status).toBe(404);
    });

    it('GET /api/appointments/receipt/VC-WRONG → 404', async () => {
      const res = await request(http).get('/api/appointments/receipt/VC-ZZZZZZZZ');
      expect(res.status).toBe(404);
    });

    it('AI consult → booking with the AI summary attached (logged-in patient)', async () => {
      // New accounts confirm their email before using the AI.
      const token = new URL(newPatientVerifyUrl).searchParams.get('token');
      expect((await request(http).post('/api/auth/verify-email').send({ token })).status).toBe(200);
      const consult = await request(http)
        .post('/api/chatbot/consult')
        .set('Authorization', `Bearer ${newPatientToken}`)
        .send({ messages: [{ role: 'user', content: 'Headache for a week' }] });
      expect(consult.status).toBe(200);
      triageToken = consult.body.sessionToken;

      const res = await book(
        { patientName: 'E2E Tester', timeSlot: SLOT_C, reason: 'linked booking', triageSessionToken: triageToken },
        newPatientToken,
      );
      expect(res.status).toBe(201);
      expect(res.body.triageSessionId).toEqual(expect.any(Number));
      linkedAppointmentId = res.body.id;
    });

    it('GET /api/appointments/me/patient → the patient sees their bookings', async () => {
      const res = await request(http)
        .get('/api/appointments/me/patient')
        .set('Authorization', `Bearer ${newPatientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.map((a: any) => a.id)).toContain(linkedAppointmentId);
    });

    it('GET /api/appointments/me/patient (no token) → 401', async () => {
      const res = await request(http).get('/api/appointments/me/patient');
      expect(res.status).toBe(401);
    });

    it('GET /api/appointments/:id/clinical → treating doctor sees record + AI summary', async () => {
      const res = await request(http)
        .get(`/api/appointments/${linkedAppointmentId}/clinical`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.patient.name).toBe('E2E Tester');
      expect(res.body.aiSummary.token).toBe(triageToken);
    });

    it('GET /api/appointments/:id/clinical → another doctor is refused (403)', async () => {
      const res = await request(http)
        .get(`/api/appointments/${linkedAppointmentId}/clinical`)
        .set('Authorization', `Bearer ${otherDoctorToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/appointments/:id/clinical → a patient is refused (403)', async () => {
      const res = await request(http)
        .get(`/api/appointments/${linkedAppointmentId}/clinical`)
        .set('Authorization', `Bearer ${newPatientToken}`);
      expect(res.status).toBe(403);
    });

    it('PATCH /api/appointments/:id/status → a patient cannot mark it completed', async () => {
      const res = await request(http)
        .patch(`/api/appointments/${linkedAppointmentId}/status`)
        .set('Authorization', `Bearer ${newPatientToken}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(403);
    });

    it('PATCH /api/appointments/:id/status → the patient can cancel, and the slot reopens', async () => {
      const cancel = await request(http)
        .patch(`/api/appointments/${linkedAppointmentId}/status`)
        .set('Authorization', `Bearer ${newPatientToken}`)
        .send({ status: 'cancelled' });
      expect(cancel.status).toBe(200);
      expect(cancel.body.status).toBe('cancelled');

      const rebook = await book({ patientName: 'Rebooker', timeSlot: SLOT_C });
      expect(rebook.status).toBe(201);

      // Doctor completes the rebooked visit with notes.
      const done = await request(http)
        .patch(`/api/appointments/${rebook.body.id}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'completed', doctorNotes: 'Reviewed. Follow up in 2 weeks.' });
      expect(done.status).toBe(200);
      expect(done.body.status).toBe('completed');
    });
  });

  // ---------------------------------------------------------------------------
  // Patients + medical history
  // ---------------------------------------------------------------------------
  describe('Patients & medical history', () => {
    let demoPatientId = 0;
    let createdHistoryId = 0;
    const condition = `E2E Condition ${stamp}`;

    it('GET /api/patients/me → returns the demo patient profile', async () => {
      const res = await request(http)
        .get('/api/patients/me')
        .set('Authorization', `Bearer ${demoPatientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      demoPatientId = res.body.id;
    });

    it('POST /api/patients/:id/medical-history → adds an entry', async () => {
      const res = await request(http)
        .post(`/api/patients/${demoPatientId}/medical-history`)
        .set('Authorization', `Bearer ${demoPatientToken}`)
        .send({ condition, notes: 'added by e2e test' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.condition).toBe(condition);
      createdHistoryId = res.body.id;
    });

    it('GET /api/patients/me → the new entry is present', async () => {
      const res = await request(http)
        .get('/api/patients/me')
        .set('Authorization', `Bearer ${demoPatientToken}`);
      expect(res.status).toBe(200);
      const conditions = (res.body.medicalHistory ?? []).map(
        (h: any) => h.condition,
      );
      expect(conditions).toContain(condition);
    });

    it('DELETE /api/patients/:id/medical-history/:historyId → removes it', async () => {
      const res = await request(http)
        .delete(
          `/api/patients/${demoPatientId}/medical-history/${createdHistoryId}`,
        )
        .set('Authorization', `Bearer ${demoPatientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("another patient cannot touch someone else's history → 403", async () => {
      const res = await request(http)
        .post(`/api/patients/${demoPatientId}/medical-history`)
        .set('Authorization', `Bearer ${newPatientToken}`)
        .send({ condition: 'malicious' });
      expect(res.status).toBe(403);
    });

    it('GET /api/patients/me (no token) → 401', async () => {
      const res = await request(http).get('/api/patients/me');
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // AI Doctor (runs on the offline engine here, so it is deterministic)
  // ---------------------------------------------------------------------------
  describe('AI Doctor', () => {
    let aiToken = '';
    beforeAll(async () => {
      aiToken = await login('patient@vitacare.test');
    });
    const consult = (content: string) =>
      request(http)
        .post('/api/chatbot/consult')
        .set('Authorization', `Bearer ${aiToken}`)
        .send({ messages: [{ role: 'user', content }] });

    it('AI chat, reports and voice need a login (401 for guests)', async () => {
      const body = { messages: [{ role: 'user', content: 'I have a headache' }] };
      expect((await request(http).post('/api/chatbot/consult').send(body)).status).toBe(401);
      expect((await request(http).post('/api/chatbot/report').send({ imageBase64: 'A'.repeat(200), mimeType: 'image/png' })).status).toBe(401);
      expect((await request(http).post('/api/voice/speak').send({ text: 'hello' })).status).toBe(401);
    });

    it('GET /api/chatbot/usage → today\'s allowance for the signed-in user', async () => {
      const res = await request(http).get('/api/chatbot/usage').set('Authorization', `Bearer ${aiToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message.limit).toBe(40);
      expect(res.body.report.limit).toBe(5);
    });

    it('the daily limit is enforced atomically; admins are unlimited', async () => {
      const usage = app.get(UsageService);
      const reg = await request(http).post('/api/auth/register/patient').send({ phone: '03001234567', city: 'Karachi',
        email: `e2e_quota_${stamp}@vitacare.test`, password, firstName: 'Quota', lastName: 'Test',
      });
      const user = { userId: reg.body.user.id, email: reg.body.user.email, role: 'patient' } as any;
      // 5 reports allowed: fire 7 at once, exactly 5 must succeed.
      const results = await Promise.allSettled(Array.from({ length: 7 }, () => usage.consume(user, 'report')));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason.getStatus()).toBe(429);
      expect(rejected.reason.message).toMatch(/today's 5/);
      const admin = await usage.consume({ userId: 1, email: 'a', role: 'admin' } as any, 'report');
      expect(admin.limit).toBeNull();
    });

    it('GET /api/chatbot/status → reports which engine is live', async () => {
      const res = await request(http).get('/api/chatbot/status');
      expect(res.status).toBe(200);
      expect(res.body.aiEnabled).toBe(false);
    });

    it('POST /api/chatbot/consult → offline mode interviews instead of failing', async () => {
      const res = await consult('I have a headache');
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('offline');
      expect(res.body.stage).toBe('interviewing');
      expect(res.body.quickReplies.length).toBeGreaterThan(0);
      expect(res.body.sessionToken).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('POST /api/chatbot/consult → red-flag guard escalates chest pain to emergency', async () => {
      const res = await consult('mere seene mein dard hai aur pasina aa raha hai');
      expect(res.status).toBe(200);
      expect(res.body.urgency).toBe('emergency');
      expect(res.body.language).toBe('roman-ur');
      expect(res.body.emergency.contacts.map((c: any) => c.number)).toContain('1122');
    });

    it('POST /api/chatbot/consult → replies in Urdu script to Urdu input', async () => {
      const res = await consult('میرے سر میں درد ہے');
      expect(res.body.language).toBe('ur');
      expect(res.body.reply).toMatch(/[\u0600-\u06FF]/);
    });

    it('POST /api/chatbot/consult → oversized messages are rejected with 400, not 500', async () => {
      const res = await consult('x'.repeat(5000));
      expect(res.status).toBe(400);
    });

    it('POST /api/chatbot/report → clear 503 when the vision model is not configured', async () => {
      const res = await request(http)
        .post('/api/chatbot/report')
        .set('Authorization', `Bearer ${aiToken}`)
        .send({ imageBase64: 'A'.repeat(200), mimeType: 'image/png' });
      expect(res.status).toBe(503);
    });

    it('GET /api/chatbot/sessions/:token → 404 for an unknown session', async () => {
      const res = await request(http).get('/api/chatbot/sessions/00000000-0000-4000-8000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Admin portal
  // ---------------------------------------------------------------------------
  describe('Admin portal', () => {
    let adminToken = '';
    let patientToken = '';
    let pendingDoctorId = 0;
    let postId = 0;
    let postSlug = '';

    beforeAll(async () => {
      adminToken = await login('admin@vitacare.test');
      patientToken = await login('patient@vitacare.test');
    });
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });

    it('admin routes need an admin (401 without token, 403 for a patient)', async () => {
      expect((await request(http).get('/api/admin/stats')).status).toBe(401);
      expect((await request(http).get('/api/admin/stats').set(as(patientToken))).status).toBe(403);
    });

    it('GET /api/admin/stats → dashboard numbers', async () => {
      const res = await request(http).get('/api/admin/stats').set(as(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.doctorsVerified).toBeGreaterThan(50);
      expect(res.body.doctorsPending).toBeGreaterThanOrEqual(2);
      expect(res.body.daily).toHaveLength(14);
    });

    it('pending doctors are hidden from the public directory', async () => {
      const res = await request(http).get('/api/doctors').query({ search: 'Mahnoor' });
      expect(res.body).toHaveLength(0);
    });

    it('GET /api/admin/doctors?status=pending → the review queue', async () => {
      const res = await request(http).get('/api/admin/doctors').query({ status: 'pending' }).set(as(adminToken));
      expect(res.status).toBe(200);
      const hassan = res.body.items.find((d: any) => d.firstName === 'Hassan');
      expect(hassan.pmdcNumber).toBe('52611-P');
      pendingDoctorId = hassan.id;
    });

    it('rejecting without a reason → 400', async () => {
      const res = await request(http)
        .patch(`/api/admin/doctors/${pendingDoctorId}/verification`)
        .set(as(adminToken))
        .send({ status: 'rejected' });
      expect(res.status).toBe(400);
    });

    it('verifying makes the doctor public; the action is audited', async () => {
      const ok = await request(http)
        .patch(`/api/admin/doctors/${pendingDoctorId}/verification`)
        .set(as(adminToken))
        .send({ status: 'verified' });
      expect(ok.status).toBe(200);
      const pub = await request(http).get('/api/doctors').query({ search: 'Hassan Raza' });
      expect(pub.body.some((d: any) => d.id === pendingDoctorId)).toBe(true);
      const audit = await request(http).get('/api/admin/audit').set(as(adminToken));
      expect(audit.body.items[0].action).toBe('doctor.verified');
      // Put it back in the queue for the next run.
      await request(http)
        .patch(`/api/admin/doctors/${pendingDoctorId}/verification`)
        .set(as(adminToken))
        .send({ status: 'pending' });
    });

    it('doctor registration requires a PMDC number and starts as pending', async () => {
      const base = {
        email: `e2e_doc_${stamp}@vitacare.test`, password, firstName: 'Test', lastName: 'Doctor',
        specialty: 'ENT', city: 'Karachi',
      };
      expect((await request(http).post('/api/auth/register/doctor').send(base)).status).toBe(400);
      const res = await request(http).post('/api/auth/register/doctor').send({ phone: '03001234567', ...base, pmdcNumber: '12345-p' });
      expect(res.status).toBe(201);
      const pub = await request(http).get('/api/doctors').query({ search: 'Test Doctor' });
      expect(pub.body).toHaveLength(0);
    });

    it('blog: create a draft with an auto slug and sanitised HTML', async () => {
      const res = await request(http)
        .post('/api/admin/blog')
        .set(as(adminToken))
        .send({
          title: `E2E Post: Dil ki Sehat ${stamp}`,
          content: '<h2>Hello</h2><p>Safe text for the e2e test.</p><script>alert(1)</script><img src="x" onerror="alert(1)">',
          metaTitle: 'E2E meta title',
          metaDescription: 'E2E meta description',
          status: 'draft',
        });
      expect(res.status).toBe(201);
      postId = res.body.id;
      postSlug = res.body.slug;
      expect(postSlug).toBe(`e2e-post-dil-ki-sehat-${stamp}`);
      expect(res.body.content).not.toContain('<script');
      expect(res.body.content).not.toContain('onerror');
      expect((await request(http).get(`/api/blog/${postSlug}`)).status).toBe(404); // drafts are private
    });

    it('blog: publishing makes it public; delete removes it', async () => {
      const upd = await request(http)
        .patch(`/api/admin/blog/${postId}`)
        .set(as(adminToken))
        .send({ title: `E2E Post: Dil ki Sehat ${stamp}`, content: '<p>Published body for the e2e test.</p>', status: 'published' });
      expect(upd.status).toBe(200);
      expect((await request(http).get(`/api/blog/${postSlug}`)).status).toBe(200);
      expect((await request(http).delete(`/api/admin/blog/${postId}`).set(as(adminToken))).status).toBe(200);
    });

    it('upload: accepts an image and serves it', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      );
      const res = await request(http)
        .post('/api/admin/uploads')
        .set(as(adminToken))
        .attach('file', png, { filename: 'dot.png', contentType: 'image/png' });
      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^\/uploads\/.+\.png$/);
      expect((await request(http).get(res.body.url)).status).toBe(200);
      const bad = await request(http)
        .post('/api/admin/uploads')
        .set(as(adminToken))
        .attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
      expect(bad.status).toBe(400);
    });

    it('suspending a user blocks sign-in; reactivating restores it', async () => {
      const users = await request(http).get('/api/admin/users').query({ search: newPatientEmail }).set(as(adminToken));
      const id = users.body.items[0].id;
      await request(http).patch(`/api/admin/users/${id}/active`).set(as(adminToken)).send({ isActive: false });
      const blocked = await request(http).post('/api/auth/login').send({ email: newPatientEmail, password });
      expect(blocked.status).toBe(401);
      await request(http).patch(`/api/admin/users/${id}/active`).set(as(adminToken)).send({ isActive: true });
      const ok = await request(http).post('/api/auth/login').send({ email: newPatientEmail, password });
      expect(ok.status).toBe(200);
    });

    it('GET /api/admin/triage → consultations, newest first, without transcripts', async () => {
      const res = await request(http).get('/api/admin/triage').set(as(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items[0].transcript).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // RBAC and home nursing
  // ---------------------------------------------------------------------------
  describe('RBAC and home nursing', () => {
    const tok: Record<string, string> = {};
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });
    const karachiToday = () =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    let requestId = 0;
    let pendingNurseToken = '';

    beforeAll(async () => {
      tok.patient = await login('patient@vitacare.test');
      tok.doctor = await login('dr.saif@vitacare.test');
      tok.otherDoctor = await login('dr.ayesha@vitacare.test');
      tok.nurse = await login('nurse@vitacare.test');
      tok.admin = await login('admin@vitacare.test');
    });

    it.each([
      ['patient', 'get', '/api/admin/stats'],
      ['patient', 'get', '/api/home-care/nurse/open'],
      ['patient', 'get', '/api/appointments/me/doctor'],
      ['patient', 'post', '/api/home-care/order'],
      ['doctor', 'get', '/api/home-care/nurse/open'],
      ['doctor', 'get', '/api/patients/me'],
      ['doctor', 'get', '/api/admin/users'],
      ['nurse', 'post', '/api/home-care'],
      ['nurse', 'get', '/api/admin/stats'],
      ['nurse', 'get', '/api/patients/me'],
      ['nurse', 'get', '/api/appointments/me/doctor'],
      ['admin', 'get', '/api/appointments/me/patient'],
      ['admin', 'get', '/api/nurses/me'],
    ])('%s cannot %s %s (403)', async (role, method, url) => {
      const res = await (request(http) as any)[method](url).set(as(tok[role])).send({});
      expect(res.status).toBe(403);
    });

    it('nurse registration needs a PNC number and starts pending; pending nurses cannot take visits', async () => {
      const base = {
        email: `e2e_nurse_${stamp}@vitacare.test`, password, firstName: 'Test', lastName: 'Nurse', gender: 'female',
        city: 'Karachi', qualification: 'Diploma RN', skills: ['injection'], visitFee: 1500,
      };
      expect((await request(http).post('/api/auth/register/nurse').send(base)).status).toBe(400);
      const res = await request(http).post('/api/auth/register/nurse').send({ phone: '03001234567', ...base, pncNumber: 'PNC-99881' });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('nurse');
      pendingNurseToken = res.body.accessToken;
      expect((await request(http).get('/api/home-care/nurse/open').set(as(pendingNurseToken))).status).toBe(403);
      const pub = await request(http).get('/api/nurses').query({ city: 'Karachi' });
      expect(pub.body.some((n: any) => n.lastName === 'Nurse' && n.firstName === 'Test')).toBe(false);
      expect(pub.body[0].phone).toBeUndefined(); // public list never shows phones
    });

    it('patient requests a home visit; past dates are rejected', async () => {
      const bad = await request(http).post('/api/home-care').set(as(tok.patient)).send({
        service: 'injection', visitDate: '2020-01-01', timeWindow: 'morning', address: 'House 1, Street 2, Clifton, Karachi', city: 'Karachi',
      });
      expect(bad.status).toBe(400);
      const res = await request(http).post('/api/home-care').set(as(tok.patient)).send({
        service: 'injection', visitDate: karachiToday(), timeWindow: 'evening',
        address: 'House 1, Street 2, Clifton, Karachi', city: 'Karachi', preferredGender: 'female', notes: 'e2e visit',
      });
      expect(res.status).toBe(201);
      expect(res.body.reference).toMatch(/^HN-/);
      requestId = res.body.id;
    });

    it('a matching verified nurse sees it with a partial address and no phone', async () => {
      const res = await request(http).get('/api/home-care/nurse/open').set(as(tok.nurse));
      expect(res.status).toBe(200);
      const r = res.body.find((x: any) => x.id === requestId);
      expect(r).toBeDefined();
      expect(r.address).not.toContain('House 1');
      expect(r.patient.phone).toBeNull();
    });

    it('nurse accepts; a second accept fails; patient now sees the nurse phone', async () => {
      expect((await request(http).patch(`/api/home-care/${requestId}/accept`).set(as(tok.nurse))).status).toBe(200);
      expect((await request(http).patch(`/api/home-care/${requestId}/accept`).set(as(tok.nurse))).status).toBe(400);
      const mine = await request(http).get('/api/home-care/me/patient').set(as(tok.patient));
      const r = mine.body.find((x: any) => x.id === requestId);
      expect(r.status).toBe('accepted');
      expect(r.nurse.phone).toBeTruthy();
    });

    it('another patient cannot cancel it', async () => {
      const other = await request(http).post('/api/auth/register/patient').send({ phone: '03001234567', city: 'Karachi',
        email: `e2e_other_${stamp}@vitacare.test`, password, firstName: 'Other', lastName: 'Patient',
      });
      const res = await request(http).patch(`/api/home-care/${requestId}/cancel`).set(as(other.body.accessToken));
      expect(res.status).toBe(404);
    });

    it('nurse completes with vitals; a low SpO2 raises an emergency alert', async () => {
      const res = await request(http).patch(`/api/home-care/${requestId}/complete`).set(as(tok.nurse)).send({
        vitals: { bpSystolic: 130, bpDiastolic: 85, pulse: 104, temperatureC: 37.9, spo2: 89 },
        notes: 'Injection given. Breathless on walking, SpO2 89%.',
      });
      expect(res.status).toBe(200);
      expect(res.body.alertLevel).toBe('emergency');
      expect(res.body.vitalAlerts.some((a: any) => a.vital === 'spo2')).toBe(true);
    });

    it("the treating doctor sees the patient's home visits and vitals in the clinical view", async () => {
      const list = await request(http).get('/api/appointments/me/doctor').set(as(tok.doctor));
      const appt = list.body.find((a: any) => a.patientId);
      const res = await request(http).get(`/api/appointments/${appt.id}/clinical`).set(as(tok.doctor));
      expect(res.status).toBe(200);
      expect(res.body.homeVisits.some((v: any) => v.id === requestId && v.alertLevel === 'emergency')).toBe(true);
    });

    it('a doctor can order home nursing only for their own patient', async () => {
      const list = await request(http).get('/api/appointments/me/doctor').set(as(tok.doctor));
      const appt = list.body.find((a: any) => a.patientId);
      const body = { appointmentId: appt.id, service: 'wound_care', visitDate: karachiToday(), notes: 'e2e order' };
      const mine = await request(http).post('/api/home-care/order').set(as(tok.doctor)).send(body);
      expect(mine.status).toBe(201);
      expect(mine.body.orderedByDoctorId).toBeTruthy();
      const other = await request(http).post('/api/home-care/order').set(as(tok.otherDoctor)).send(body);
      expect(other.status).toBe(403);
      await request(http).patch(`/api/home-care/${mine.body.id}/cancel`).set(as(tok.patient));
    });

    it('admin verifies a pending nurse, who then appears publicly', async () => {
      const q = await request(http).get('/api/admin/nurses').query({ status: 'pending', search: 'Test' }).set(as(tok.admin));
      const n = q.body.items.find((x: any) => x.pncNumber === 'PNC-99881');
      expect(n).toBeDefined();
      const v = await request(http).patch(`/api/admin/nurses/${n.id}/verification`).set(as(tok.admin)).send({ status: 'verified' });
      expect(v.status).toBe(200);
      expect((await request(http).get('/api/home-care/nurse/open').set(as(pendingNurseToken))).status).toBe(200);
      const stats = await request(http).get('/api/admin/stats').set(as(tok.admin));
      expect(stats.body.nursesVerified).toBeGreaterThan(20);
    });

    it("a signed-in patient's AI consultation cannot be read by others via its token", async () => {
      const c = await request(http).post('/api/chatbot/consult').set(as(tok.patient)).send({ messages: [{ role: 'user', content: 'e2e mild cough' }] });
      const token = c.body.sessionToken;
      expect((await request(http).get(`/api/chatbot/sessions/${token}`)).status).toBe(404);
      expect((await request(http).get(`/api/chatbot/sessions/${token}`).set(as(tok.patient))).status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Physiotherapy (AHPC), home visits with location, radiology department
  // ---------------------------------------------------------------------------
  describe('Physiotherapy, AHPC and home-visit location', () => {
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });
    let patientToken = '';
    let nurseToken = '';
    const firstFreeSlot = async (doctorId: number) => {
      const today = new Date();
      for (let i = 1; i <= 21; i++) {
        const d = new Date(today.getTime() + i * 86_400_000).toISOString().slice(0, 10);
        const res = await request(http).get('/api/appointments/availability').query({ doctorId, date: d });
        const slot = res.body.slots?.find((s: any) => s.status === 'available');
        if (res.body.opdDay && slot) return { date: d, timeSlot: slot.time };
      }
      throw new Error('no free slot');
    };

    beforeAll(async () => {
      patientToken = await login('patient@vitacare.test');
      nurseToken = await login('nurse@vitacare.test');
    });

    it('physiotherapists are listed with AHPC and home visits; radiologists exist', async () => {
      const pt = await request(http).get('/api/doctors').query({ specialty: 'Physiotherapy' });
      expect(pt.body.length).toBeGreaterThanOrEqual(12);
      expect(pt.body.every((d: any) => d.council === 'AHPC' && d.homeVisits === true)).toBe(true);
      const rad = await request(http).get('/api/doctors').query({ specialty: 'Radiology' });
      expect(rad.body.length).toBeGreaterThanOrEqual(8);
      expect(rad.body[0].council).toBe('PMDC');
    });

    it('registration checks PMDC for doctors and AHPC for physiotherapists', async () => {
      const base = { password, firstName: 'Reg', lastName: 'Check', city: 'Karachi' };
      const wrongPmdc = await request(http).post('/api/auth/register/doctor')
        .send({ phone: '03001234567', ...base, email: `e2e_pm_${stamp}@vitacare.test`, specialty: 'ENT', pmdcNumber: 'AHPC-PT-1234' });
      expect(wrongPmdc.status).toBe(400);
      expect(wrongPmdc.body.message).toMatch(/PMDC/);
      const pt = await request(http).post('/api/auth/register/doctor')
        .send({ phone: '03001234567', ...base, email: `e2e_pt_${stamp}@vitacare.test`, specialty: 'Physiotherapy', pmdcNumber: 'AHPC-PT-55555' });
      expect(pt.status).toBe(201);
      const me = await request(http).get('/api/doctors/me/profile').set(as(pt.body.accessToken));
      expect(me.body.council).toBe('AHPC');
      expect(me.body.homeVisits).toBe(true);
    });

    it('home visit: refused for a clinic-only doctor, needs an address, and the receipt hides it', async () => {
      const saif = (await request(http).get('/api/doctors').query({ search: 'Saif' })).body[0];
      const s1 = await firstFreeSlot(saif.id);
      const clinicOnly = await request(http).post('/api/appointments').set(as(patientToken)).send({
        doctorId: saif.id, patientName: 'Ali Hassan', patientPhone: '03001234567', ...s1,
        visitType: 'home', homeAddress: 'House 14, Street 7, PECHS, Karachi',
      });
      expect(clinicOnly.status).toBe(400);

      const physio = (await request(http).get('/api/doctors').query({ specialty: 'Physiotherapy', city: 'Karachi' })).body[0];
      const s2 = await firstFreeSlot(physio.id);
      const noAddress = await request(http).post('/api/appointments').set(as(patientToken)).send({
        doctorId: physio.id, patientName: 'Ali Hassan', patientPhone: '03001234567', ...s2, visitType: 'home',
      });
      expect(noAddress.status).toBe(400);

      const ok = await request(http).post('/api/appointments').set(as(patientToken)).send({
        doctorId: physio.id, patientName: 'Ali Hassan', patientPhone: '03001234567', ...s2, reason: 'e2e physio home visit',
        visitType: 'home', homeAddress: 'House 14, Street 7, PECHS, Karachi', latitude: 24.8697, longitude: 67.0611,
      });
      expect(ok.status).toBe(201);
      expect(ok.body.visitType).toBe('home');
      const receipt = await request(http).get(`/api/appointments/receipt/${ok.body.reference}`);
      expect(receipt.body.visitType).toBe('home');
      expect(receipt.body.homeAddress).toBeUndefined();
      expect(receipt.body.latitude).toBeUndefined();
      await request(http).patch(`/api/appointments/${ok.body.id}/status`).set(as(patientToken)).send({ status: 'cancelled' });
    });

    it('a nurse sees the exact location only after accepting the visit', async () => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const created = await request(http).post('/api/home-care').set(as(patientToken)).send({
        service: 'vitals', visitDate: today, timeWindow: 'evening', address: 'House 14, Street 7, PECHS, Karachi', city: 'Karachi',
        notes: 'e2e location visit', latitude: 24.8697, longitude: 67.0611,
      });
      expect(created.status).toBe(201);
      const open = await request(http).get('/api/home-care/nurse/open').set(as(nurseToken));
      const before = open.body.find((x: any) => x.id === created.body.id);
      expect(before.latitude).toBeNull();
      await request(http).patch(`/api/home-care/${created.body.id}/accept`).set(as(nurseToken));
      const mine = await request(http).get('/api/home-care/nurse/mine').set(as(nurseToken));
      const after = mine.body.find((x: any) => x.id === created.body.id);
      expect(after.latitude).toBeCloseTo(24.8697, 4);
      expect(after.longitude).toBeCloseTo(67.0611, 4);
    });

    it('AI status no longer reveals the provider or model', async () => {
      const res = await request(http).get('/api/chatbot/status');
      expect(Object.keys(res.body)).toEqual(['aiEnabled']);
    });
  });

  // ---------------------------------------------------------------------------
  // Security hardening
  // ---------------------------------------------------------------------------
  describe('Security hardening', () => {
    const decode = (t: string) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());

    it('locks one account after 5 wrong passwords, even for the right password', async () => {
      const email = `e2e_lock_${stamp}@vitacare.test`;
      await request(http).post('/api/auth/register/patient').send({ phone: '03001234567', city: 'Karachi', email, password, firstName: 'Lock', lastName: 'Test' });
      for (let i = 0; i < 5; i++) {
        const r = await request(http).post('/api/auth/login').send({ email, password: 'wrong-password' });
        expect(r.status).toBe(401);
      }
      const locked = await request(http).post('/api/auth/login').send({ email, password });
      expect(locked.status).toBe(429);
      expect(locked.body.message).toMatch(/failed sign-in attempts/);
    });

    it('admin tokens last 12 hours; other tokens 7 days', async () => {
      const admin = await request(http).post('/api/auth/login').send({ email: 'admin@vitacare.test', password });
      const a = decode(admin.body.accessToken);
      expect(a.exp - a.iat).toBe(12 * 3600);
      const patient = decode(await login('patient@vitacare.test'));
      expect(patient.exp - patient.iat).toBe(7 * 24 * 3600);
    });

    it('a token whose payload claims "admin" is not trusted: the role comes from the database', async () => {
      const real = decode(await login('patient@vitacare.test'));
      const forged = app.get(JwtService).sign({ sub: real.sub, email: real.email, role: 'admin' });
      const res = await request(http).get('/api/admin/stats').set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(403);
    });

    it('rejects unsigned ("alg: none") and tampered tokens', async () => {
      const real = await login('patient@vitacare.test');
      const [h, p] = real.split('.');
      const none = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${p}.`;
      expect((await request(http).get('/api/auth/me').set('Authorization', `Bearer ${none}`)).status).toBe(401);
      const tamperedPayload = Buffer.from(JSON.stringify({ ...decode(real), role: 'admin' })).toString('base64url');
      const tampered = `${h}.${tamperedPayload}.${real.split('.')[2]}`;
      expect((await request(http).get('/api/admin/stats').set('Authorization', `Bearer ${tampered}`)).status).toBe(401);
    });

    it('error responses do not leak stack traces', async () => {
      const res = await request(http).post('/api/auth/login').send({ email: 'not-an-email', password: 1 });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts:\d+|node_modules/);
    });
  });

  // ---------------------------------------------------------------------------
  // Email verification (Brevo) and Google sign-in (Firebase)
  // ---------------------------------------------------------------------------
  describe('Email verification and Google sign-in', () => {
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });
    const chat = (t: string) =>
      request(http).post('/api/chatbot/consult').set(as(t)).send({ messages: [{ role: 'user', content: 'mild cough' }] });
    let token = '';
    let verifyUrl = '';
    const email = `e2e_verify_${stamp}@vitacare.test`;

    it('sign-up is not verified yet and the AI is closed until it is', async () => {
      const res = await request(http).post('/api/auth/register/patient').send({ phone: '03001234567', city: 'Karachi', email, password, firstName: 'Verify', lastName: 'Me' });
      expect(res.status).toBe(201);
      expect(res.body.user.emailVerified).toBe(false);
      expect(res.body.devVerificationUrl).toMatch(/\/verify-email\?token=[a-f0-9]{64}$/); // no Brevo key in tests
      token = res.body.accessToken;
      verifyUrl = res.body.devVerificationUrl;
      const blocked = await chat(token);
      expect(blocked.status).toBe(403);
      expect(blocked.body.message).toMatch(/confirm your email/);
      expect((await request(http).get('/api/auth/me').set(as(token))).body.emailVerified).toBe(false);
    });

    it('asking for a new email straight away hits the 60-second cooldown', async () => {
      const res = await request(http).post('/api/auth/resend-verification').set(as(token));
      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/ask for a new link in about \d+ hours?/);
    });

    it('a wrong link is refused; the right link verifies once and then the AI opens', async () => {
      expect((await request(http).post('/api/auth/verify-email').send({ token: 'a'.repeat(64) })).status).toBe(400);
      const t = new URL(verifyUrl).searchParams.get('token');
      const ok = await request(http).post('/api/auth/verify-email').send({ token: t });
      expect(ok.status).toBe(200);
      expect(ok.body.email).toBe(email);
      expect((await request(http).post('/api/auth/verify-email').send({ token: t })).status).toBe(400); // single use
      expect((await chat(token)).status).toBe(200); // same token now works: verification is read from the database
      const login = await request(http).post('/api/auth/login').send({ email, password });
      expect(login.body.user.emailVerified).toBe(true);
      expect((await request(http).post('/api/auth/resend-verification').set(as(token))).body.alreadyVerified).toBe(true);
    });

    it('existing (seeded) accounts are already verified', async () => {
      const res = await request(http).post('/api/auth/login').send({ email: 'patient@vitacare.test', password });
      expect(res.body.user.emailVerified).toBe(true);
    });

    it('Google sign-in: clear 503 when Firebase is not set up', async () => {
      const res = await request(http).post('/api/auth/google').send({ idToken: 'x'.repeat(200) });
      expect(res.status).toBe(503);
    });

    it('Google sign-in: a new person first chooses a role and fills in details; then signs in directly', async () => {
      const verifier = app.get(FirebaseVerifier);
      const gEmail = `e2e_google_${stamp}@gmail.com`;
      const spy = jest.spyOn(verifier, 'verify').mockResolvedValue({ uid: `uid-${stamp}`, email: gEmail, emailVerified: true, name: 'Sara Google Khan' });
      const first = await request(http).post('/api/auth/google').send({ idToken: 'x'.repeat(200) });
      expect(first.status).toBe(200);
      expect(first.body.needsOnboarding).toBe(true);
      expect(first.body.accessToken).toBeUndefined(); // no account until the role form is done
      expect(first.body.email).toBe(gEmail);
      const missing = await request(http).post('/api/auth/google/complete').send({ signupToken: first.body.signupToken, role: 'patient', details: { firstName: 'Sara', lastName: 'Khan', city: 'Karachi' } });
      expect(missing.status).toBe(400);
      expect(JSON.stringify(missing.body.message)).toMatch(/Pakistani phone number/);
      const done = await request(http).post('/api/auth/google/complete').send({ signupToken: first.body.signupToken, role: 'patient', details: { firstName: 'Sara', lastName: 'Khan', phone: '03240236991', city: 'Karachi' } });
      expect(done.status).toBe(200);
      expect(done.body.user.role).toBe('patient');
      expect(done.body.user.emailVerified).toBe(true);
      expect((await chat(done.body.accessToken)).status).toBe(200); // Google users can use the AI at once
      const again = await request(http).post('/api/auth/google').send({ idToken: 'x'.repeat(200) });
      expect(again.body.user.id).toBe(done.body.user.id); // second time: straight in
      expect((await request(http).post('/api/auth/google/complete').send({ signupToken: 'not-a-real-token-xxxxxxxx', role: 'patient', details: {} })).status).toBe(401);

      // A new Google doctor gets the same PMDC checks and starts pending.
      spy.mockResolvedValue({ uid: `uid-doc-${stamp}`, email: `e2e_gdoc_${stamp}@gmail.com`, emailVerified: true, name: 'Ahmed Doc' });
      const d1 = await request(http).post('/api/auth/google').send({ idToken: 'x'.repeat(200) });
      const d2 = await request(http).post('/api/auth/google/complete').send({ signupToken: d1.body.signupToken, role: 'doctor', details: { firstName: 'Ahmed', lastName: 'Doc', specialty: 'ENT', pmdcNumber: '12345-P', phone: '03001234567', city: 'Karachi' } });
      expect(d2.status).toBe(200);
      expect(d2.body.user.role).toBe('doctor');
      const prof = await request(http).get('/api/doctors/me/profile').set(as(d2.body.accessToken));
      expect(prof.body.verificationStatus).toBe('pending');

      // An existing password account with the same email is linked, not duplicated.
      const existing = await request(http).post('/api/auth/login').send({ email, password });
      spy.mockResolvedValue({ uid: `uid2-${stamp}`, email, emailVerified: true, name: 'Verify Me' });
      const linked = await request(http).post('/api/auth/google').send({ idToken: 'x'.repeat(200) });
      expect(linked.body.user.id).toBe(existing.body.user.id);
      spy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Feedback round (1 Oct): phone validation, area-wise doctors, referral line
  // ---------------------------------------------------------------------------
  describe('Phone validation, area-wise doctors and referral line', () => {
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });

    it('booking rejects a junk phone number with a clear message', async () => {
      const saif = (await request(http).get('/api/doctors').query({ search: 'Saif' })).body[0];
      const res = await request(http).post('/api/appointments').send({
        doctorId: saif.id, patientName: 'Phone Test', patientPhone: 'oi43uuuuuuuu0u984u8j', date: '2030-01-01', timeSlot: '10:00 AM',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/Pakistani phone number/);
    });

    it('sign-up requires a valid Pakistani phone (empty or letters are refused)', async () => {
      const empty = await request(http).post('/api/auth/register/patient').send({ phone: '', city: 'Karachi', email: `e2e_ph1_${stamp}@vitacare.test`, password, firstName: 'Ph', lastName: 'One' });
      expect(empty.status).toBe(400);
      expect(JSON.stringify(empty.body.message)).toMatch(/Pakistani phone number/);
      const bad = await request(http).post('/api/auth/register/patient').send({ phone: 'abc123', city: 'Karachi', email: `e2e_ph2_${stamp}@vitacare.test`, password, firstName: 'Ph', lastName: 'Two' });
      expect(bad.status).toBe(400);
      const ok = await request(http).post('/api/auth/register/patient').send({ phone: '0324-0236991', city: 'Karachi', email: `e2e_ph3_${stamp}@vitacare.test`, password, firstName: 'Ph', lastName: 'Three' });
      expect(ok.status).toBe(201);
      const noCity = await request(http).post('/api/auth/register/patient').send({ phone: '03240236991', email: `e2e_ph4_${stamp}@vitacare.test`, password, firstName: 'Ph', lastName: 'Four' });
      expect(noCity.status).toBe(400);
    });


    it('recommends doctors in the patient\'s own area first, then the same city', async () => {
      const svc = app.get(DoctorsService);
      const all = (await request(http).get('/api/doctors').query({ specialty: 'General Physician' })).body as any[];
      const target = all.find((d) => d.address && d.address.split(',').length > 1 && all.filter((x) => x.city === d.city).length > 1);
      const area = target.address.split(',')[0].trim();
      const recs = await svc.recommend(target.specialty, { city: target.city, address: `House 1, Street 2, ${area}, ${target.city}` }, 3);
      expect(recs[0].proximity).toBe('area');
      expect(recs[0].address.startsWith(area)).toBe(true);
      // order is always: same area → same city → elsewhere
      const rank = (r: any) => (r.proximity === 'area' ? 0 : r.proximity === 'city' ? 1 : 2);
      expect(recs.map(rank)).toEqual([...recs.map(rank)].sort());
    });

    it('uses a city named in the chat when the profile has none', async () => {
      const svc = app.get(DoctorsService);
      const recs = await svc.recommend('ENT' as any, { text: 'main lahore mein rehta hoon, gala kharab hai' }, 2);
      expect(recs[0].city).toBe('Lahore');
      expect(recs[0].proximity).toBe('city');
    });

    it('the assessment names the department and nearby doctors in the patient\'s language', async () => {
      const tok = await login('patient@vitacare.test');
      const msgs: any[] = [];
      let res: any;
      for (const m of ['mjhe sir m bht drd hrha he', '2 din se', 'halka', 'kuch nahi']) {
        msgs.push({ role: 'user', content: m });
        res = await request(http).post('/api/chatbot/consult').set(as(tok)).send({ messages: msgs });
        msgs.push({ role: 'assistant', content: res.body.reply });
      }
      expect(res.body.language).toBe('roman-ur');
      expect(res.body.urgency).not.toBe('emergency'); // strong pain alone is not an emergency
      expect(res.body.stage).toBe('assessment');
      expect(res.body.reply).toMatch(/ke doctor ko dikhayein\. Aap ke qareeb: Dr /);
      expect(res.body.recommendedDoctors[0].city).toBe('Karachi'); // the demo patient lives in Karachi
    });
  });

  // ---------------------------------------------------------------------------
  // Report round 2 (1 Oct): forgot password, contact, doctor photo, home charge, shifts, roles
  // ---------------------------------------------------------------------------
  describe('Forgot password, contact page, doctor photo, home-visit charge, shifts', () => {
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });
    const email = `e2e_reset_${stamp}@vitacare.test`;

    it('forgot password: same answer for unknown emails; code resets the password once', async () => {
      await request(http).post('/api/auth/register/patient').send({ phone: '03001234567', city: 'Karachi', email, password, firstName: 'Reset', lastName: 'Me' });
      const unknown = await request(http).post('/api/auth/forgot-password').send({ email: `nobody_${stamp}@example.com` });
      expect(unknown.status).toBe(200);
      expect(unknown.body.devCode).toBeUndefined();
      const res = await request(http).post('/api/auth/forgot-password').send({ email });
      expect(res.body.message).toBe(unknown.body.message);
      expect(res.body.devCode).toMatch(/^\d{6}$/);
      const again = await request(http).post('/api/auth/forgot-password').send({ email });
      expect(again.body.devCode).toBeUndefined(); // one code per 10 minutes
      expect(again.body.message).toMatch(/already sent you a code/);
      const wrong = await request(http).post('/api/auth/reset-password').send({ email, code: '000000', newPassword: 'NewPassword1' });
      expect(wrong.status).toBe(400);
      const ok = await request(http).post('/api/auth/reset-password').send({ email, code: res.body.devCode, newPassword: 'NewPassword1' });
      expect(ok.status).toBe(200);
      expect((await request(http).post('/api/auth/login').send({ email, password: 'NewPassword1' })).status).toBe(200);
      expect((await request(http).post('/api/auth/login').send({ email, password })).status).toBe(401);
      expect((await request(http).post('/api/auth/reset-password').send({ email, code: res.body.devCode, newPassword: 'Another123' })).status).toBe(400); // single use
    });

    it('forgot password: 5 wrong codes block the code', async () => {
      const e2 = `e2e_reset2_${stamp}@vitacare.test`;
      await request(http).post('/api/auth/register/patient').send({ phone: '03001234567', city: 'Karachi', email: e2, password, firstName: 'Reset', lastName: 'Two' });
      const { body } = await request(http).post('/api/auth/forgot-password').send({ email: e2 });
      for (let i = 0; i < 5; i++) await request(http).post('/api/auth/reset-password').send({ email: e2, code: '111111', newPassword: 'NewPassword1' });
      const blocked = await request(http).post('/api/auth/reset-password').send({ email: e2, code: body.devCode, newPassword: 'NewPassword1' });
      expect(blocked.status).toBe(400);
      expect(blocked.body.message).toMatch(/Too many wrong codes/);
    });

    it('contact form: validated, stored, and visible only to admins', async () => {
      expect((await request(http).post('/api/contact').send({ name: 'A', email: 'bad', topic: 'x', message: 'hi' })).status).toBe(400);
      const ok = await request(http).post('/api/contact').send({
        name: 'e2e Contact', email: 'e2e_contact@example.com', phone: '03240236991', topic: 'Technical problem', message: 'e2e: the blog page does not load on my phone.',
      });
      expect(ok.status).toBe(201);
      const patient = await login('patient@vitacare.test');
      expect((await request(http).get('/api/admin/contact-messages').set(as(patient))).status).toBe(403);
      const admin = await login('admin@vitacare.test');
      const list = await request(http).get('/api/admin/contact-messages').set(as(admin));
      expect(list.body.items.some((m: any) => m.id === ok.body.id)).toBe(true);
      expect((await request(http).patch(`/api/admin/contact-messages/${ok.body.id}`).set(as(admin)).send({ status: 'done' })).status).toBe(200);
    });

    it('a doctor can upload a profile photo (images only)', async () => {
      const doc = await login('dr.saif@vitacare.test');
      const before = (await request(http).get('/api/doctors/me/profile').set(as(doc))).body.imageUrl ?? null;
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const ok = await request(http).post('/api/doctors/me/photo').set(as(doc)).attach('file', png, { filename: 'me.png', contentType: 'image/png' });
      expect(ok.status).toBe(201);
      expect(ok.body.imageUrl).toMatch(/^\/uploads\/doctor-.*\.png$/);
      const txt = await request(http).post('/api/doctors/me/photo').set(as(doc)).attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
      expect(txt.status).toBe(400);
      const patient = await login('patient@vitacare.test');
      expect((await request(http).post('/api/doctors/me/photo').set(as(patient)).attach('file', png, { filename: 'me.png', contentType: 'image/png' })).status).toBe(403);
      await app.get(DataSource).query(`UPDATE doctors SET image_url = $1 WHERE id = $2`, [before, ok.body.id]); // keep demo data as it was
    });

    it('signed-in doctors cannot book (portal is for patients); guests still can', async () => {
      const doc = await login('dr.saif@vitacare.test');
      const res = await request(http).post('/api/appointments').set(as(doc)).send({
        doctorId: 1, patientName: 'Dr Booking', patientPhone: '03001234567', date: '2030-01-07', timeSlot: '10:00 AM',
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/patient account/);
    });

    it('home visits carry the doctor\'s home-visit charge', async () => {
      const tok = await login('patient@vitacare.test');
      const physio = (await request(http).get('/api/doctors').query({ specialty: 'Physiotherapy', city: 'Karachi' })).body[0];
      expect(physio.homeVisitCharge).toBe(1000);
      let slot: any = null;
      for (let i = 2; i <= 21 && !slot; i++) {
        const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
        const a = await request(http).get('/api/appointments/availability').query({ doctorId: physio.id, date: d });
        const s = a.body.slots?.find((x: any) => x.status === 'available');
        if (a.body.opdDay && s) slot = { date: d, timeSlot: s.time };
      }
      const ok = await request(http).post('/api/appointments').set(as(tok)).send({
        doctorId: physio.id, patientName: 'Ali Hassan', patientPhone: '03001234567', ...slot, reason: 'e2e home charge',
        visitType: 'home', homeAddress: 'House 14, Street 7, PECHS, Karachi',
      });
      expect(ok.status).toBe(201);
      expect(ok.body.homeVisitCharge).toBe(1000);
      await request(http).patch(`/api/appointments/${ok.body.id}/status`).set(as(tok)).send({ status: 'cancelled' });
    });

    it('nurses can be booked for a 12-hour day or night shift', async () => {
      const tok = await login('patient@vitacare.test');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const res = await request(http).post('/api/home-care').set(as(tok)).send({
        service: 'elderly_care', visitDate: today, timeWindow: 'night_shift', address: 'House 14, Street 7, PECHS, Karachi', city: 'Karachi', notes: 'e2e night shift',
      });
      expect(res.status).toBe(201);
      expect(res.body.timeWindow).toBe('night_shift');
    });
  });
});
