import { Logger } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Folder for uploaded images (blog banners, doctor photos). Served at /uploads/<file>.
 *
 * Prefer UPLOAD_DIR when set (e.g. a Render persistent disk at /var/data/uploads).
 * If that path is not writable (no disk attached), fall back so the API still starts.
 */
function resolveUploadDir(): string {
  const preferred = process.env.UPLOAD_DIR?.trim();
  const candidates = [
    ...(preferred ? [preferred] : []),
    join(process.cwd(), 'uploads'),
    join('/tmp', 'vita-care-uploads'),
  ];

  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true });
      if (preferred && dir !== preferred) {
        Logger.warn(
          `UPLOAD_DIR=${preferred} is not writable; using ${dir} instead. Attach a Render disk or unset UPLOAD_DIR.`,
          'Uploads',
        );
      }
      return dir;
    } catch {
      /* try next */
    }
  }

  throw new Error('No writable upload directory available');
}

export const UPLOAD_DIR = resolveUploadDir();
