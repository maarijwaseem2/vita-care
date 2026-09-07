'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import { blogApi, getErrorMessage } from '@/lib/api';
import type { BlogPost } from '@/lib/types';
import styles from './blog.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    blogApi
      .list()
      .then(setPosts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className={styles.hero}>
        <div className="container">
          <span className="eyebrow">Vita Care Journal</span>
          <h1>Health tips, guides &amp; expert advice</h1>
          <p>
            Practical, doctor-reviewed articles to help you understand your
            health and make better decisions.
          </p>
        </div>
      </header>

      <section className="section-tight">
        <div className="container">
          {loading ? (
            <Loader label="Loading articles…" />
          ) : error ? (
            <EmptyState title="Couldn't load articles" message={error} />
          ) : posts.length === 0 ? (
            <EmptyState
              title="No articles yet"
              message="Check back soon for health tips and guides."
            />
          ) : (
            <div className="grid grid-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className={`card card-hover ${styles.card}`}
                >
                  <div className={styles.thumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl || '/images/blog/covid-19.png'}
                      alt={post.title}
                    />
                    {post.category && (
                      <span className={styles.tag}>{post.category}</span>
                    )}
                  </div>
                  <div className={styles.body}>
                    <div className={styles.meta}>
                      <CalendarDays size={14} />
                      {formatDate(post.publishedAt)}
                      {post.author && <span>· {post.author}</span>}
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <span className={styles.read}>
                      Read article <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
