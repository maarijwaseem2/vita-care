import Link from 'next/link';
import { Clock } from 'lucide-react';
import { mediaUrl } from '@/lib/media';
import type { BlogPost } from '@/lib/types';
import styles from './blog.module.css';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className={styles.card}>
      <Link href={`/blog/${post.slug}`} className={styles.cardImage} tabIndex={-1} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(post.imageUrl)} alt="" loading="lazy" />
        {post.category && <span className={styles.chip}>{post.category}</span>}
      </Link>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className={styles.cardExcerpt}>{post.excerpt}</p>
        <div className={styles.cardMeta}>
          <span>{formatDate(post.publishedAt)}</span>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.metaIcon}>
            <Clock size={13} /> {post.readingMinutes ?? 3} min read
          </span>
        </div>
      </div>
    </article>
  );
}
