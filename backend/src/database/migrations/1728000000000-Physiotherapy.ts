import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the Physiotherapy department. */
export class Physiotherapy1728000000000 implements MigrationInterface {
  name = 'Physiotherapy1728000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "doctors_specialty_enum" ADD VALUE IF NOT EXISTS 'Physiotherapy'`);
  }

  public async down(): Promise<void> {
    // Postgres cannot drop an enum value; the department simply stays unused.
  }
}
