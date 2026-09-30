import { mkdirSync } from 'fs';
import { join } from 'path';

/** Uploaded images (blog banners, inline images). Served at /uploads/<file>. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });
