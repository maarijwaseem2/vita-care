import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load .env when this file is executed directly by the TypeORM CLI.
loadEnv();

/**
 * Central TypeORM configuration.
 *
 * The same options object is reused by:
 *   1. The Nest application (see AppModule -> TypeOrmModule).
 *   2. The TypeORM CLI for running/reverting migrations.
 *
 * Entities and migrations are referenced by glob so new files are picked
 * up automatically without editing this file.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'vita_care',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  charset: 'utf8mb4',
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
