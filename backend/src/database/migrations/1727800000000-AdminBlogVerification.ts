import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin portal, doctor verification, blog CMS and audit trail.
 *
 *  - users: new "admin" role, is_active flag (admin can suspend accounts)
 *  - doctors: PMDC number, verification status, clinic, experience, languages.
 *    Existing doctors are marked verified so the live directory is unchanged.
 *  - blog_posts: SEO fields (meta title / description), draft/published,
 *    reading time, updated_at. Old plain-text content is wrapped in <p>.
 *  - triage_sessions: source (chat / report) and safety-review fields.
 *  - audit_logs: who looked at or changed what, and when.
 */
export class AdminBlogVerification1727800000000 implements MigrationInterface {
  name = 'AdminBlogVerification1727800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'admin'`);
    await q.query(`ALTER TABLE "users" ADD "is_active" BOOLEAN NOT NULL DEFAULT true`);

    await q.query(`ALTER TABLE "doctors" ADD "pmdc_number" VARCHAR(30)`);
    await q.query(`ALTER TABLE "doctors" ADD "verification_status" VARCHAR(12) NOT NULL DEFAULT 'pending'`);
    await q.query(`ALTER TABLE "doctors" ADD "verification_note" TEXT`);
    await q.query(`ALTER TABLE "doctors" ADD "verified_at" TIMESTAMP`);
    await q.query(`ALTER TABLE "doctors" ADD "clinic_name" VARCHAR(200)`);
    await q.query(`ALTER TABLE "doctors" ADD "experience_years" INTEGER`);
    await q.query(`ALTER TABLE "doctors" ADD "languages" JSON`);
    await q.query(`UPDATE "doctors" SET "verification_status" = 'verified', "verified_at" = now()`);
    await q.query(`CREATE INDEX "idx_doctors_verification" ON "doctors" ("verification_status")`);

    await q.query(`ALTER TABLE "blog_posts" ADD "meta_title" VARCHAR(70)`);
    await q.query(`ALTER TABLE "blog_posts" ADD "meta_description" VARCHAR(170)`);
    await q.query(`ALTER TABLE "blog_posts" ADD "status" VARCHAR(12) NOT NULL DEFAULT 'published'`);
    await q.query(`ALTER TABLE "blog_posts" ADD "reading_minutes" INTEGER NOT NULL DEFAULT 3`);
    await q.query(`ALTER TABLE "blog_posts" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
    await q.query(`UPDATE "blog_posts" SET "content" = '<p>' || "content" || '</p>' WHERE "content" NOT LIKE '<%'`);
    await q.query(`CREATE INDEX "idx_blog_status_published" ON "blog_posts" ("status", "published_at")`);

    await q.query(`ALTER TABLE "triage_sessions" ADD "source" VARCHAR(12) NOT NULL DEFAULT 'chat'`);
    await q.query(`ALTER TABLE "triage_sessions" ADD "reviewed_at" TIMESTAMP`);
    await q.query(`ALTER TABLE "triage_sessions" ADD "review_note" TEXT`);
    await q.query(`CREATE INDEX "idx_triage_urgency" ON "triage_sessions" ("urgency", "created_at")`);

    await q.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "actor_user_id" INTEGER,
        "actor_role" VARCHAR(12),
        "action" VARCHAR(60) NOT NULL,
        "entity" VARCHAR(40) NOT NULL,
        "entity_id" VARCHAR(40),
        "meta" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "idx_audit_created" ON "audit_logs" ("created_at")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "audit_logs"`);
    await q.query(`DROP INDEX IF EXISTS "idx_triage_urgency"`);
    for (const c of ['source', 'reviewed_at', 'review_note']) {
      await q.query(`ALTER TABLE "triage_sessions" DROP COLUMN "${c}"`);
    }
    await q.query(`DROP INDEX IF EXISTS "idx_blog_status_published"`);
    for (const c of ['meta_title', 'meta_description', 'status', 'reading_minutes', 'updated_at']) {
      await q.query(`ALTER TABLE "blog_posts" DROP COLUMN "${c}"`);
    }
    await q.query(`DROP INDEX IF EXISTS "idx_doctors_verification"`);
    for (const c of ['pmdc_number', 'verification_status', 'verification_note', 'verified_at', 'clinic_name', 'experience_years', 'languages']) {
      await q.query(`ALTER TABLE "doctors" DROP COLUMN "${c}"`);
    }
    await q.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
    // Postgres cannot drop an enum value; "admin" stays in users_role_enum.
  }
}
