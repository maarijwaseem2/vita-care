import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

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
    await ds.query(
      `DELETE FROM triage_sessions WHERE patient_id IN
         (SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email LIKE 'e2e\\_%')
         OR (patient_id IS NULL AND created_at > now() - interval '1 hour'
             AND transcript::text LIKE '%e2e%')`,
    );
    await ds.query(`DELETE FROM home_care_requests WHERE notes LIKE 'e2e%'`);
    await ds.query(`DELETE FROM users WHERE email LIKE 'e2e\\_%'`);
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
    });

    it('POST /api/auth/register/patient (same email) → 409 conflict', async () => {
      const res = await request(http)
        .post('/api/auth/register/patient')
        .send({
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
        .send({ email: 'not-an-email', password: '123' }); // bad email + short pw + missing names
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
    const consult = (content: string) =>
      request(http).post('/api/chatbot/consult').send({ messages: [{ role: 'user', content }] });

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
      const res = await request(http).post('/api/auth/register/doctor').send({ ...base, pmdcNumber: '12345-p' });
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
      const res = await request(http).post('/api/auth/register/nurse').send({ ...base, pncNumber: 'PNC-99881' });
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
      const other = await request(http).post('/api/auth/register/patient').send({
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
});
