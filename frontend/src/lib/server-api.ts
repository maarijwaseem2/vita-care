import type { BlogPost, Paged } from './types';

/**
 * Server-side fetches for SEO pages (rendered on the server so search engines
 * see full content). API_INTERNAL_URL lets the server reach the API over a
 * private network in production; it falls back to the public URL.
 */
const BASE = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const serverBlog = {
  list: (page: number, category?: string) =>
    getJson<Paged<BlogPost>>(
      `/blog?page=${page}&limit=9${category ? `&category=${encodeURIComponent(category)}` : ''}`,
    ),
  categories: () => getJson<string[]>('/blog/categories'),
  get: (slug: string) => getJson<BlogPost>(`/blog/${encodeURIComponent(slug)}`),
};
