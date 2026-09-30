import type { Metadata } from 'next';
import Link from 'next/link';
import BlogCard from '@/components/blog/BlogCard';
import Pagination from '@/components/blog/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { serverBlog } from '@/lib/server-api';
import { SITE_URL } from '@/lib/media';
import styles from '@/components/blog/blog.module.css';

type Props = { searchParams: { page?: string; category?: string } };

const pageNum = (v?: string) => Math.max(1, Number.parseInt(v ?? '1', 10) || 1);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = pageNum(searchParams.page);
  const cat = searchParams.category;
  const title = `${cat ? `${cat} articles` : 'Health blog'}${page > 1 ? ` – page ${page}` : ''} | Vita Care`;
  const qs = new URLSearchParams({ ...(cat ? { category: cat } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
  return {
    title,
    description:
      'Doctor-written health articles for Pakistan: heart health, diabetes, dengue, child fever, mental health and understanding your lab reports.',
    alternates: { canonical: `${SITE_URL}/blog${qs ? `?${qs}` : ''}` },
    openGraph: { title, type: 'website', url: `${SITE_URL}/blog` },
  };
}

export default async function BlogPage({ searchParams }: Props) {
  const page = pageNum(searchParams.page);
  const category = searchParams.category;
  const [data, categories] = await Promise.all([serverBlog.list(page, category), serverBlog.categories()]);

  const hrefFor = (p: number) => {
    const q = new URLSearchParams({ ...(category ? { category } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString();
    return `/blog${q ? `?${q}` : ''}`;
  };

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <h1>Health blog</h1>
          <p>Clear, practical articles from doctors on the questions patients ask most often.</p>
          {!!categories?.length && (
            <nav className={styles.filters} aria-label="Categories">
              <Link href="/blog" className={`${styles.filter} ${!category ? styles.filterActive : ''}`}>
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/blog?category=${encodeURIComponent(c)}`}
                  className={`${styles.filter} ${category === c ? styles.filterActive : ''}`}
                  aria-current={category === c ? 'page' : undefined}
                >
                  {c}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <section className={styles.listSection}>
        <div className="container">
          {!data ? (
            <EmptyState title="Articles could not be loaded" message="The server did not respond. Please refresh in a moment." />
          ) : data.items.length === 0 ? (
            <EmptyState
              title="No articles here yet"
              message="Try another category."
              action={<Link href="/blog" className="btn">Show all articles</Link>}
            />
          ) : (
            <>
              <p className={styles.count}>
                Showing {(data.page - 1) * data.limit + 1}–{(data.page - 1) * data.limit + data.items.length} of {data.total} articles
              </p>
              <div className={styles.grid}>
                {data.items.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
              <Pagination page={data.page} pages={data.pages} hrefFor={hrefFor} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
