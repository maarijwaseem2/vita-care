import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { API_URL } from '@/lib/media';

/**
 * POST /api/revalidate  { slug?: string, oldSlug?: string }
 *
 * Called by the admin blog editor after save/publish/delete so the public
 * blog pages update immediately instead of after the 60-second cache.
 * Only works with a valid ADMIN token (checked against the backend).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const me = await fetch(`${API_URL}/auth/me`, { headers: { authorization: auth }, cache: 'no-store' }).catch(() => null);
  const user = me && me.ok ? await me.json().catch(() => null) : null;
  if (user?.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string; oldSlug?: string };
  revalidatePath('/blog');
  revalidatePath('/');
  for (const s of [body.slug, body.oldSlug]) {
    if (s && /^[a-z0-9\u0600-\u06ff-]{1,90}$/.test(s)) revalidatePath(`/blog/${s}`);
  }
  return NextResponse.json({ revalidated: true });
}
