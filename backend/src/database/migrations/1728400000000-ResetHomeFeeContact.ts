import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - Forgot password: 6-digit email code (hash, expiry, attempts, last sent).
 * - Home visits: a doctor's extra charge for visiting the patient's home (default Rs 1,000),
 *   copied onto each home-visit appointment.
 * - Contact page messages, shown in the admin portal.
 */
export class ResetHomeFeeContact1728400000000 implements MigrationInterface {
  name = 'ResetHomeFeeContact1728400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD "reset_code_hash" VARCHAR(64)`);
    await q.query(`ALTER TABLE "users" ADD "reset_code_expires_at" TIMESTAMP`);
    await q.query(`ALTER TABLE "users" ADD "reset_attempts" INTEGER NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE "users" ADD "reset_sent_at" TIMESTAMP`);
    await q.query(`ALTER TABLE "doctors" ADD "home_visit_charge" INTEGER NOT NULL DEFAULT 1000`);
    await q.query(`ALTER TABLE "appointments" ADD "home_visit_charge" INTEGER`);
    await q.query(`
      CREATE TABLE "contact_messages" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(120) NOT NULL,
        "email" VARCHAR(160) NOT NULL,
        "phone" VARCHAR(30),
        "topic" VARCHAR(30) NOT NULL,
        "message" TEXT NOT NULL,
        "status" VARCHAR(12) NOT NULL DEFAULT 'new',
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "contact_messages"`);
    await q.query(`ALTER TABLE "appointments" DROP COLUMN "home_visit_charge"`);
    await q.query(`ALTER TABLE "doctors" DROP COLUMN "home_visit_charge"`);
    for (const c of ['reset_sent_at', 'reset_attempts', 'reset_code_expires_at', 'reset_code_hash']) {
      await q.query(`ALTER TABLE "users" DROP COLUMN "${c}"`);
    }
  }
}
