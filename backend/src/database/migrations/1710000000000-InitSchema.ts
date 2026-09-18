import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the full Vita Care schema (PostgreSQL):
 *   users -> (doctors | patients) -> medical_history / appointments, blog_posts
 *
 * Foreign keys and the unique appointment-slot index are created here so the
 * database enforces the same rules the application relies on.
 *
 * Enum types follow TypeORM's default naming ("<table>_<column>_enum") so the
 * entities and the database stay consistent.
 */
export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- enum types ----
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('patient', 'doctor')`,
    );
    await queryRunner.query(
      `CREATE TYPE "doctors_specialty_enum" AS ENUM ('Neurology', 'Heart Care', 'Osteoporosis', 'ENT', 'General Physician')`,
    );
    await queryRunner.query(
      `CREATE TYPE "doctors_gender_enum" AS ENUM ('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "patients_gender_enum" AS ENUM ('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "appointments_status_enum" AS ENUM ('booked', 'completed', 'cancelled')`,
    );

    // ---- users ----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "role" "users_role_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    // ---- doctors ----
    await queryRunner.query(`
      CREATE TABLE "doctors" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "first_name" VARCHAR(255) NOT NULL,
        "last_name" VARCHAR(255) NOT NULL,
        "title" VARCHAR(255) NOT NULL DEFAULT 'Dr',
        "specialty" "doctors_specialty_enum" NOT NULL DEFAULT 'General Physician',
        "age" INTEGER,
        "gender" "doctors_gender_enum",
        "phone" VARCHAR(255),
        "city" VARCHAR(255),
        "address" VARCHAR(500),
        "qualifications" JSON,
        "certificates" JSON,
        "experiences" JSON,
        "bio" TEXT,
        "opd_schedule" VARCHAR(255),
        "available_time" VARCHAR(255),
        "fees" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "image_url" VARCHAR(255),
        "rating" NUMERIC(2,1) NOT NULL DEFAULT 4.5,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_doctors_user" UNIQUE ("user_id"),
        CONSTRAINT "fk_doctors_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ---- patients ----
    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "first_name" VARCHAR(255) NOT NULL,
        "last_name" VARCHAR(255) NOT NULL,
        "age" INTEGER,
        "gender" "patients_gender_enum",
        "phone" VARCHAR(255),
        "city" VARCHAR(255),
        "address" VARCHAR(500),
        "current_medication" TEXT,
        "image_url" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_patients_user" UNIQUE ("user_id"),
        CONSTRAINT "fk_patients_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ---- medical_history ----
    await queryRunner.query(`
      CREATE TABLE "medical_history" (
        "id" SERIAL PRIMARY KEY,
        "patient_id" INTEGER NOT NULL,
        "condition" VARCHAR(255) NOT NULL,
        "notes" TEXT,
        "diagnosed_at" DATE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_history_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `);

    // ---- appointments ----
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" SERIAL PRIMARY KEY,
        "doctor_id" INTEGER NOT NULL,
        "patient_id" INTEGER,
        "patient_name" VARCHAR(255) NOT NULL,
        "patient_phone" VARCHAR(255) NOT NULL,
        "date" DATE NOT NULL,
        "time_slot" VARCHAR(255) NOT NULL,
        "reason" TEXT,
        "status" "appointments_status_enum" NOT NULL DEFAULT 'booked',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_appt_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_appt_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL
      )
    `);

    // One booking per (doctor, date, slot) — enforced at the database level.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_doctor_slot"
        ON "appointments" ("doctor_id", "date", "time_slot")
    `);

    // ---- blog_posts ----
    await queryRunner.query(`
      CREATE TABLE "blog_posts" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(255) NOT NULL,
        "excerpt" VARCHAR(500) NOT NULL,
        "content" TEXT NOT NULL,
        "category" VARCHAR(255),
        "author" VARCHAR(255),
        "image_url" VARCHAR(255),
        "published_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_blog_slug" UNIQUE ("slug")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order to respect foreign keys, dropping enum types after their tables.
    await queryRunner.query(`DROP TABLE "blog_posts"`);
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "appointments_status_enum"`);
    await queryRunner.query(`DROP TABLE "medical_history"`);
    await queryRunner.query(`DROP TABLE "patients"`);
    await queryRunner.query(`DROP TYPE "patients_gender_enum"`);
    await queryRunner.query(`DROP TABLE "doctors"`);
    await queryRunner.query(`DROP TYPE "doctors_gender_enum"`);
    await queryRunner.query(`DROP TYPE "doctors_specialty_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
