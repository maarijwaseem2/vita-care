import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Email verification (Brevo) and Google sign-in (Firebase).
 * Every account that already exists is marked verified, so nothing changes for them.
 */
export class EmailVerificationGoogle1728300000000 implements MigrationInterface {
  name = 'EmailVerificationGoogle1728300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD "email_verified" BOOLEAN NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE "users" ADD "email_verify_token_hash" VARCHAR(64)`);
    await q.query(`ALTER TABLE "users" ADD "email_verify_sent_at" TIMESTAMP`);
    await q.query(`ALTER TABLE "users" ADD "auth_provider" VARCHAR(12) NOT NULL DEFAULT 'password'`);
    await q.query(`ALTER TABLE "users" ADD "google_uid" VARCHAR(128)`);
    await q.query(`CREATE UNIQUE INDEX "uq_users_google_uid" ON "users" ("google_uid") WHERE "google_uid" IS NOT NULL`);
    await q.query(`CREATE INDEX "idx_users_verify_token" ON "users" ("email_verify_token_hash")`);
    await q.query(`UPDATE "users" SET "email_verified" = true`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "idx_users_verify_token"`);
    await q.query(`DROP INDEX IF EXISTS "uq_users_google_uid"`);
    for (const c of ['google_uid', 'auth_provider', 'email_verify_sent_at', 'email_verify_token_hash', 'email_verified']) {
      await q.query(`ALTER TABLE "users" DROP COLUMN "${c}"`);
    }
  }
}
