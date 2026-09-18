import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

/**
 * End-to-end tests. These boot the real NestJS application (same pipes,
 * prefix and filters as production) and exercise the HTTP API against the
 * live MySQL database.
 *
 * The tests are self-contained and idempotent: every account uses a random
 * email and every booking uses a unique far-future date, so the suite can be
 * run repeatedly without colliding with itself or with the seed data.
 *
 * Prerequisites: MySQL running, migrations applied, and `npm run seed` done
 * once (the read tests assert against the seeded doctors, blog posts and the
 * demo patient `patient@vitacare.test`).
 */
describe('Vita Care API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof app.getHttpServer>;

  // Unique-per-run test data.
  const stamp = Date.now();
  const newPatientEmail = `e2e_${stamp}_${Math.floor(Math.random() * 1e5)}@vitacare.test`;
  const password = 'Password123';

  // A unique far-future day so slot bookings never clash across runs.
  const baseOffset = 300 + (stamp % 5000);
  const bookingDate = dayFromNow(baseOffset);
  const SLOT_A = '09:00 AM';
  const SLOT_B = '10:00 AM';
  const SLOT_C = '11:00 AM';

  let newPatientToken = '';
  let demoPatientToken = '';
  let anyDoctorId = 0;
  let neurologyDoctorId = 0;

  function dayFromNow(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
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

    it('GET /api/blog → returns the seeded posts', async () => {
      const res = await request(http).get('/api/blog');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(6);
      firstSlug = res.body[0].slug;
      expect(typeof firstSlug).toBe('string');
    });

    it('GET /api/blog/:slug → returns a single post', async () => {
      const res = await request(http).get(`/api/blog/${firstSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe(firstSlug);
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
    let guestAppointmentId = 0;

    it('POST /api/appointments → a guest can book a slot', async () => {
      const res = await request(http).post('/api/appointments').send({
        doctorId: anyDoctorId,
        patientName: 'Guest Booker',
        patientPhone: '03007654321',
        date: bookingDate,
        timeSlot: SLOT_A,
        reason: 'e2e guest booking',
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('booked');
      guestAppointmentId = res.body.id;
    });

    it('POST /api/appointments → double-booking the same slot is rejected with 409', async () => {
      const res = await request(http).post('/api/appointments').send({
        doctorId: anyDoctorId,
        patientName: 'Second Person',
        patientPhone: '03009999999',
        date: bookingDate,
        timeSlot: SLOT_A, // same doctor + date + slot as above
      });
      expect(res.status).toBe(409);
    });

    it('POST /api/appointments → a different slot on the same day is allowed', async () => {
      const res = await request(http).post('/api/appointments').send({
        doctorId: anyDoctorId,
        patientName: 'Guest Booker Two',
        patientPhone: '03001112222',
        date: bookingDate,
        timeSlot: SLOT_B,
      });
      expect(res.status).toBe(201);
    });

    it('POST /api/appointments (invalid phone) → 400', async () => {
      const res = await request(http).post('/api/appointments').send({
        doctorId: anyDoctorId,
        patientName: 'Bad Phone',
        patientPhone: 'nope',
        date: bookingDate,
        timeSlot: '02:00 PM',
      });
      expect(res.status).toBe(400);
    });

    it('GET /api/appointments/slots → lists the taken slots for that day', async () => {
      const res = await request(http)
        .get('/api/appointments/slots')
        .query({ doctorId: anyDoctorId, date: bookingDate });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.arrayContaining([SLOT_A, SLOT_B]));
    });

    it('GET /api/appointments/:id/receipt → returns the receipt with doctor info', async () => {
      const res = await request(http).get(
        `/api/appointments/${guestAppointmentId}/receipt`,
      );
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(guestAppointmentId);
      expect(res.body.doctor).toBeDefined();
      expect(res.body.doctor.firstName).toBeDefined();
    });

    it('POST /api/appointments (logged-in patient) → booking is linked to them', async () => {
      const res = await request(http)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${newPatientToken}`)
        .send({
          doctorId: anyDoctorId,
          patientName: 'E2E Tester',
          patientPhone: '03001234567',
          date: bookingDate,
          timeSlot: SLOT_C,
          reason: 'linked booking',
        });
      expect(res.status).toBe(201);
    });

    it('GET /api/appointments/me/patient → the patient sees their bookings', async () => {
      const res = await request(http)
        .get('/api/appointments/me/patient')
        .set('Authorization', `Bearer ${newPatientToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/appointments/me/patient (no token) → 401', async () => {
      const res = await request(http).get('/api/appointments/me/patient');
      expect(res.status).toBe(401);
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
  // Chatbot (AI Doctor) — graceful failure without a key
  // ---------------------------------------------------------------------------
  describe('Chatbot', () => {
    it('POST /api/chatbot/consult → 503 with a helpful message when no AI key is set', async () => {
      const res = await request(http)
        .post('/api/chatbot/consult')
        .send({ messages: [{ role: 'user', content: 'I have a headache' }] });
      expect(res.status).toBe(503);
      const message = JSON.stringify(res.body.message);
      expect(message).toMatch(/AI_API_KEY|not configured/i);
    });
  });
});
