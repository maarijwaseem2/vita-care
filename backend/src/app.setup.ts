import { INestApplication, ValidationPipe } from '@nestjs/common';
import express, { json, urlencoded } from 'express';
import { UPLOAD_DIR } from './config/uploads';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

/**
 * Shared HTTP setup, used by main.ts AND the e2e tests so both run the
 * exact same pipeline (prefix, validation, error shape, limits, headers).
 */
export function configureApp(app: INestApplication, corsOrigins?: string[]): void {
  app.setGlobalPrefix('api');
  // Uploaded blog images. Long cache: file names are random UUIDs, never reused.
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', index: false }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // 6 MB covers a ~4 MB report photo in base64; chat DTOs cap text separately.
  app.use(json({ limit: '6mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  if (corsOrigins) app.enableCors({ origin: corsOrigins, credentials: true });
}
