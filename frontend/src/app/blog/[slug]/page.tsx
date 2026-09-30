import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock, UserRound } from 'lucide-react';
import BlogCard, { formatDate } from '@/components/blog/BlogCard';
import { serverBlog } from '@/lib/server-api';
import { SITE_URL, mediaUrl } from '@/lib/media';
import styles from '@/components/blog/blog.module.css';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await serverBlog.get(params.slug);
  if (!post) return { title: 'Article not found | Vita Care', robots: { index: false } };
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = mediaUrl(post.imageUrl);
  return {
    title: `${title} | Vita Care`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      images: [{ url: image.startsWith('http') ? image : `${SITE_URL}${image}` }],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = await serverBlog.get(params.slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'Vita Care' },
    publisher: { '@type': 'Organization', name: 'Vita Care' },
    image: mediaUrl(post.imageUrl),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className={styles.articleHead}>
        <Link href="/blog" className={styles.back}>
          <ArrowLeft size={16} /> All articles
        </Link>
        <div>
          {post.category && (
            <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className={styles.articleCategory}>
              {post.category}
            </Link>
          )}
        </div>
        <h1 className={styles.articleTitle}>{post.title}</h1>
        <div className={styles.articleMeta}>
          {post.author && (
            <span className={styles.metaIcon}>
              <UserRound size={15} /> {post.author}
            </span>
          )}
          <span className={styles.metaIcon}>
            <CalendarDays size={15} /> <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </span>
          <span className={styles.metaIcon}>
            <Clock size={15} /> {post.readingMinutes ?? 3} min read
          </span>
        </div>
      </header>

      <figure className={styles.banner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(post.imageUrl)} alt="" />
      </figure>

      {/* Content is sanitised on the server when it is saved. */}
      <div className={styles.prose} dangerouslySetInnerHTML={{ __html: post.content }} />

      <aside className={styles.cta}>
        <div>
          <strong>Not sure what your symptoms mean?</strong>
          <p>Tell the Vita Care AI Doctor in Urdu or English. It finds the right specialist for you.</p>
        </div>
        <Link href="/ai-doctor" className={styles.ctaBtn}>
          Talk to the AI Doctor
        </Link>
      </aside>
      <p className={styles.disclaimer}>
        This article is general health information and does not replace advice from your own doctor. In an emergency call 1122.
      </p>

      {!!post.related?.length && (
        <section className={styles.related} aria-labelledby="related-heading">
          <div className="container">
            <h2 id="related-heading">Related articles</h2>
            <div className={styles.grid}>
              {post.related.map((r) => (
                <BlogCard key={r.id} post={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
