import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hackathon upgrade:
 *  - four new departments (Pediatrics, Gynecology, Dermatology, Psychiatry)
 *  - triage_sessions: stored AI consultations + clinical summary
 *  - appointments: random public reference, link to triage session,
 *    doctor notes, updated_at
 *  - slot uniqueness only for ACTIVE bookings, so cancelled slots reopen
 */
export class HackathonUpgrade1727700000000 implements MigrationInterface {
  name = 'HackathonUpgrade1727700000000';

  public async up(q: QueryRunner): Promise<void> {
    for (const v of ['Pediatrics', 'Gynecology', 'Dermatology', 'Psychiatry']) {
      await q.query(`ALTER TYPE "doctors_specialty_enum" ADD VALUE IF NOT EXISTS '${v}'`);
    }

    await q.query(`
      CREATE TABLE "triage_sessions" (
        "id" SERIAL PRIMARY KEY,
        "token" UUID NOT NULL,
        "patient_id" INTEGER,
        "language" VARCHAR(12) NOT NULL DEFAULT 'en',
        "mode" VARCHAR(12) NOT NULL DEFAULT 'ai',
        "urgency" VARCHAR(12) NOT NULL DEFAULT 'routine',
        "specialty" VARCHAR(40),
        "summary" JSONB,
        "possible_conditions" JSONB,
        "red_flags" JSONB,
        "transcript" JSONB NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_triage_token" UNIQUE ("token"),
        CONSTRAINT "fk_triage_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL
      )
    `);

    await q.query(`ALTER TABLE "appointments" ADD "reference" VARCHAR(16)`);
    await q.query(`
      UPDATE "appointments"
         SET "reference" = 'VC-' || upper(substr(md5(random()::text || id::text), 1, 8))
       WHERE "reference" IS NULL
    `);
    await q.query(`ALTER TABLE "appointments" ALTER COLUMN "reference" SET NOT NULL`);
    await q.query(`CREATE UNIQUE INDEX "uq_appointments_reference" ON "appointments" ("reference")`);

    await q.query(`ALTER TABLE "appointments" ADD "triage_session_id" INTEGER`);
    await q.query(`
      ALTER TABLE "appointments" ADD CONSTRAINT "fk_appt_triage"
        FOREIGN KEY ("triage_session_id") REFERENCES "triage_sessions"("id") ON DELETE SET NULL
    `);
    await q.query(`ALTER TABLE "appointments" ADD "doctor_notes" TEXT`);
    await q.query(`ALTER TABLE "appointments" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);

    await q.query(`DROP INDEX IF EXISTS "uq_doctor_slot"`);
    await q.query(`
      CREATE UNIQUE INDEX "uq_doctor_active_slot"
        ON "appointments" ("doctor_id", "date", "time_slot")
        WHERE "status" = 'booked'
    `);
    await q.query(`CREATE INDEX "idx_appointments_patient" ON "appointments" ("patient_id")`);
    await q.query(`CREATE INDEX "idx_doctors_specialty_city" ON "doctors" ("specialty", "city")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "idx_doctors_specialty_city"`);
    await q.query(`DROP INDEX IF EXISTS "idx_appointments_patient"`);
    await q.query(`DROP INDEX IF EXISTS "uq_doctor_active_slot"`);
    await q.query(`CREATE UNIQUE INDEX "uq_doctor_slot" ON "appointments" ("doctor_id", "date", "time_slot")`);
    await q.query(`ALTER TABLE "appointments" DROP COLUMN "updated_at"`);
    await q.query(`ALTER TABLE "appointments" DROP COLUMN "doctor_notes"`);
    await q.query(`ALTER TABLE "appointments" DROP CONSTRAINT "fk_appt_triage"`);
    await q.query(`ALTER TABLE "appointments" DROP COLUMN "triage_session_id"`);
    await q.query(`DROP INDEX IF EXISTS "uq_appointments_reference"`);
    await q.query(`ALTER TABLE "appointments" DROP COLUMN "reference"`);
    await q.query(`DROP TABLE "triage_sessions"`);
    // Postgres cannot drop enum values; the four departments stay in the type.
  }
}
