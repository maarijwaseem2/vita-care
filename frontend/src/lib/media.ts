/** Base URL of the API (…/api) and its origin (for /uploads/… images). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/**
 * Turn a stored image path into a usable src:
 *  - "/uploads/…"  → same-origin path, proxied to the backend (next.config rewrites)
 *  - "/images/…"   → served by this Next.js app
 *  - absolute URLs → unchanged
 */
export function mediaUrl(src?: string | null): string {
  if (!src) return '/images/about/about-us.png';
  // Older rows may hold an absolute link to the API; keep only the path.
  const m = src.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/);
  if (m) return m[1];
  if (/^https?:\/\//.test(src)) return src;
  return src;
}

/** Site URL used for canonical links and Open Graph. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Absolute URL for metadata (Open Graph, JSON-LD). */
export function absoluteUrl(src?: string | null): string {
  const u = mediaUrl(src);
  return /^https?:\/\//.test(u) ? u : `${SITE_URL}${u}`;
}
