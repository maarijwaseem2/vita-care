'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, User } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { blogApi, getErrorMessage } from '@/lib/api';
import type { BlogPost } from '@/lib/types';
import styles from './article.module.css';

/**
 * Render plain-text article content into readable blocks.
 * Supports blank-line paragraph breaks, "## " subheadings and "- " bullets.
 */
function renderContent(content: string) {
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim());
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) {
      return <h2 key={i}>{trimmed.slice(3)}</h2>;
    }
    const lines = trimmed.split('\n');
    if (lines.every((l) => l.trim().startsWith('- '))) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{l.trim().slice(2)}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{trimmed}</p>;
  });
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    blogApi
      .get(slug)
      .then(setPost)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader label="Loading article…" />;
  if (error || !post) {
    return (
      <div className="container" style={{ padding: '60px 20px' }}>
        <EmptyState
          title="Article not found"
          message={error}
          action={<Link href="/blog" className="btn">Back to journal</Link>}
        />
      </div>
    );
  }

  const date = new Date(post.publishedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className={styles.wrap}>
      <div className={styles.inner}>
        <Link href="/blog" className={styles.back}>
          <ArrowLeft size={16} /> All articles
        </Link>

        {post.category && <span className="badge badge-cyan">{post.category}</span>}
        <h1 className={styles.title}>{post.title}</h1>

        <div className={styles.meta}>
          <span>
            <CalendarDays size={15} /> {date}
          </span>
          {post.author && (
            <span>
              <User size={15} /> {post.author}
            </span>
          )}
        </div>

        <div className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl || '/images/blog/covid-19.png'}
            alt={post.title}
          />
        </div>

        <div className={styles.content}>{renderContent(post.content)}</div>

        <div className={styles.cta}>
          <div>
            <h3>Have a health concern?</h3>
            <p>Book an appointment with a specialist near you.</p>
          </div>
          <Link href="/doctors" className="btn">
            Find a doctor
          </Link>
        </div>
      </div>
    </article>
  );
}
