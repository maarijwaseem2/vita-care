import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - Radiology department (radiologists read X-ray / CT / MRI).
 * - doctors.council: PMDC (MBBS doctors) or AHPC (physiotherapists, under the
 *   Allied Health Professionals Council Act 2022). Existing physiotherapists → AHPC.
 * - Home visits carry the patient's shared GPS location (nurse requests and
 *   physiotherapy home-visit appointments), so the visitor can navigate directly.
 */
export class CouncilImagingLocation1728100000000 implements MigrationInterface {
  name = 'CouncilImagingLocation1728100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "doctors_specialty_enum" ADD VALUE IF NOT EXISTS 'Radiology'`);
    await q.query(`ALTER TABLE "doctors" ADD "council" VARCHAR(10) NOT NULL DEFAULT 'PMDC'`);
    await q.query(`UPDATE "doctors" SET "council" = 'AHPC' WHERE "specialty"::text = 'Physiotherapy'`);
    await q.query(`
      UPDATE "doctors" SET "pmdc_number" = 'AHPC-PT-' || split_part("pmdc_number", '-', 1)
       WHERE "specialty"::text = 'Physiotherapy' AND "pmdc_number" IS NOT NULL AND "pmdc_number" NOT LIKE 'AHPC%'
    `);
    await q.query(`ALTER TABLE "doctors" ADD "home_visits" BOOLEAN NOT NULL DEFAULT false`);
    await q.query(`UPDATE "doctors" SET "home_visits" = true WHERE "specialty"::text = 'Physiotherapy'`);

    await q.query(`ALTER TABLE "home_care_requests" ADD "latitude" NUMERIC(9,6)`);
    await q.query(`ALTER TABLE "home_care_requests" ADD "longitude" NUMERIC(9,6)`);

    await q.query(`ALTER TABLE "appointments" ADD "visit_type" VARCHAR(8) NOT NULL DEFAULT 'clinic'`);
    await q.query(`ALTER TABLE "appointments" ADD "home_address" VARCHAR(500)`);
    await q.query(`ALTER TABLE "appointments" ADD "latitude" NUMERIC(9,6)`);
    await q.query(`ALTER TABLE "appointments" ADD "longitude" NUMERIC(9,6)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const c of ['visit_type', 'home_address', 'latitude', 'longitude']) await q.query(`ALTER TABLE "appointments" DROP COLUMN "${c}"`);
    for (const c of ['latitude', 'longitude']) await q.query(`ALTER TABLE "home_care_requests" DROP COLUMN "${c}"`);
    await q.query(`ALTER TABLE "doctors" DROP COLUMN "home_visits"`);
    await q.query(`ALTER TABLE "doctors" DROP COLUMN "council"`);
  }
}
