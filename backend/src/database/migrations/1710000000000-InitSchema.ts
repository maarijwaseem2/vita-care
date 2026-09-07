import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the full Vita Care schema:
 *   users -> (doctors | patients) -> medical_history / appointments, blog_posts
 *
 * Foreign keys and the unique appointment-slot index are created here so the
 * database enforces the same rules the application relies on.
 */
export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- users ----
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`email\` VARCHAR(255) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('patient','doctor') NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ---- doctors ----
    await queryRunner.query(`
      CREATE TABLE \`doctors\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`first_name\` VARCHAR(255) NOT NULL,
        \`last_name\` VARCHAR(255) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL DEFAULT 'Dr',
        \`specialty\` ENUM('Neurology','Heart Care','Osteoporosis','ENT','General Physician') NOT NULL DEFAULT 'General Physician',
        \`age\` INT NULL,
        \`gender\` ENUM('male','female','other') NULL,
        \`phone\` VARCHAR(255) NULL,
        \`city\` VARCHAR(255) NULL,
        \`address\` VARCHAR(500) NULL,
        \`qualifications\` JSON NULL,
        \`certificates\` JSON NULL,
        \`experiences\` JSON NULL,
        \`bio\` TEXT NULL,
        \`opd_schedule\` VARCHAR(255) NULL,
        \`available_time\` VARCHAR(255) NULL,
        \`fees\` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
        \`image_url\` VARCHAR(255) NULL,
        \`rating\` DECIMAL(2,1) NOT NULL DEFAULT '4.5',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_doctors_user\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_doctors_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ---- patients ----
    await queryRunner.query(`
      CREATE TABLE \`patients\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`first_name\` VARCHAR(255) NOT NULL,
        \`last_name\` VARCHAR(255) NOT NULL,
        \`age\` INT NULL,
        \`gender\` ENUM('male','female','other') NULL,
        \`phone\` VARCHAR(255) NULL,
        \`city\` VARCHAR(255) NULL,
        \`address\` VARCHAR(500) NULL,
        \`current_medication\` TEXT NULL,
        \`image_url\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_patients_user\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_patients_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ---- medical_history ----
    await queryRunner.query(`
      CREATE TABLE \`medical_history\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`patient_id\` INT NOT NULL,
        \`condition\` VARCHAR(255) NOT NULL,
        \`notes\` TEXT NULL,
        \`diagnosed_at\` DATE NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_history_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ---- appointments ----
    await queryRunner.query(`
      CREATE TABLE \`appointments\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`doctor_id\` INT NOT NULL,
        \`patient_id\` INT NULL,
        \`patient_name\` VARCHAR(255) NOT NULL,
        \`patient_phone\` VARCHAR(255) NOT NULL,
        \`date\` DATE NOT NULL,
        \`time_slot\` VARCHAR(255) NOT NULL,
        \`reason\` TEXT NULL,
        \`status\` ENUM('booked','completed','cancelled') NOT NULL DEFAULT 'booked',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_doctor_slot\` (\`doctor_id\`, \`date\`, \`time_slot\`),
        CONSTRAINT \`fk_appt_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctors\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_appt_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ---- blog_posts ----
    await queryRunner.query(`
      CREATE TABLE \`blog_posts\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`title\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NOT NULL,
        \`excerpt\` VARCHAR(500) NOT NULL,
        \`content\` LONGTEXT NOT NULL,
        \`category\` VARCHAR(255) NULL,
        \`author\` VARCHAR(255) NULL,
        \`image_url\` VARCHAR(255) NULL,
        \`published_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_blog_slug\` (\`slug\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order to respect foreign keys.
    await queryRunner.query(`DROP TABLE \`blog_posts\``);
    await queryRunner.query(`DROP TABLE \`appointments\``);
    await queryRunner.query(`DROP TABLE \`medical_history\``);
    await queryRunner.query(`DROP TABLE \`patients\``);
    await queryRunner.query(`DROP TABLE \`doctors\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
