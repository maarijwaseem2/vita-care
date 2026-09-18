import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load .env when this file is executed directly by the TypeORM CLI.
loadEnv();

/**
 * Central TypeORM configuration (PostgreSQL).
 *
 * The same options object is reused by:
 *   1. The Nest application (see AppModule -> TypeOrmModule).
 *   2. The TypeORM CLI for running/reverting migrations.
 *
 * Two ways to configure the connection:
 *   - Set a single DATABASE_URL (recommended for Neon / Render). When present,
 *     it takes priority and SSL is switched on automatically.
 *   - Or set the individual DB_* variables (handy for local development).
 *
 * Entities and migrations are referenced by glob so new files are picked
 * up automatically without editing this file.
 */
const databaseUrl = process.env.DATABASE_URL;

// Neon (and most hosted Postgres) require SSL. Enable it whenever a
// DATABASE_URL is used, or explicitly via DB_SSL=true for local overrides.
const useSsl = !!databaseUrl || process.env.DB_SSL === 'true';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // When DATABASE_URL is set we use it directly; otherwise fall back to parts.
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'vita_care',
      }),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  // rejectUnauthorized:false works with Neon's managed certificates and avoids
  // deployment headaches; set DB_SSL=false locally to disable entirely.
  ssl: useSsl ? { rejectUnauthorized: false } : false,
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
