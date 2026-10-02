import { MigrationInterface, QueryRunner } from 'typeorm';

/** Per-user daily AI usage (messages, reports, voice) so tokens are not wasted. */
export class AiUsage1728200000000 implements MigrationInterface {
  name = 'AiUsage1728200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "ai_usage" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "day" DATE NOT NULL,
        "kind" VARCHAR(12) NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "uq_ai_usage_user_day_kind" UNIQUE ("user_id", "day", "kind")
      )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "ai_usage"`);
  }
}
