import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Home nursing: "nurse" role, verified nurse profiles (PNC licence), and
 * home-visit requests that carry recorded vitals and red-flag alerts back
 * into the patient's record and the treating doctor's view.
 */
export class HomeNursing1727900000000 implements MigrationInterface {
  name = 'HomeNursing1727900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'nurse'`);
    await q.query(`
      CREATE TABLE "nurses" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "first_name" VARCHAR(80) NOT NULL,
        "last_name" VARCHAR(80) NOT NULL,
        "gender" VARCHAR(10),
        "phone" VARCHAR(30),
        "city" VARCHAR(80) NOT NULL,
        "areas" JSON,
        "qualification" VARCHAR(40) NOT NULL,
        "pnc_number" VARCHAR(30) NOT NULL,
        "skills" JSON,
        "experience_years" INTEGER,
        "visit_fee" INTEGER NOT NULL DEFAULT 0,
        "available_days" VARCHAR(80),
        "bio" TEXT,
        "rating" NUMERIC(2,1) NOT NULL DEFAULT 0,
        "verification_status" VARCHAR(12) NOT NULL DEFAULT 'pending',
        "verification_note" TEXT,
        "verified_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "idx_nurses_city_status" ON "nurses" ("city", "verification_status")`);
    await q.query(`
      CREATE TABLE "home_care_requests" (
        "id" SERIAL PRIMARY KEY,
        "reference" VARCHAR(16) NOT NULL UNIQUE,
        "patient_id" INTEGER NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "nurse_id" INTEGER REFERENCES "nurses"("id") ON DELETE SET NULL,
        "ordered_by_doctor_id" INTEGER REFERENCES "doctors"("id") ON DELETE SET NULL,
        "appointment_id" INTEGER REFERENCES "appointments"("id") ON DELETE SET NULL,
        "service" VARCHAR(40) NOT NULL,
        "visit_date" DATE NOT NULL,
        "time_window" VARCHAR(12) NOT NULL,
        "address" VARCHAR(500) NOT NULL,
        "city" VARCHAR(80) NOT NULL,
        "preferred_gender" VARCHAR(8) NOT NULL DEFAULT 'any',
        "notes" TEXT,
        "status" VARCHAR(12) NOT NULL DEFAULT 'requested',
        "vitals" JSONB,
        "vital_alerts" JSONB,
        "alert_level" VARCHAR(12),
        "nurse_notes" TEXT,
        "accepted_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "idx_hcr_city_status" ON "home_care_requests" ("city", "status")`);
    await q.query(`CREATE INDEX "idx_hcr_patient" ON "home_care_requests" ("patient_id")`);
    await q.query(`CREATE INDEX "idx_hcr_nurse" ON "home_care_requests" ("nurse_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "home_care_requests"`);
    await q.query(`DROP TABLE "nurses"`);
  }
}
