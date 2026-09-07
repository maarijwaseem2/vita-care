'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { blogApi } from '@/lib/api';
import type { BlogPost } from '@/lib/types';
import styles from './home.module.css';

const FALLBACK_IMG = '/images/blog/artical_cardiology.jpg';

export default function LatestBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogApi
      .list()
      .then((data) => setPosts(data.slice(0, 3)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section className="section" style={{ background: 'var(--surface-2)' }}>
      <div className="container">
        <div className={styles.previewHead}>
          <div>
            <span className="eyebrow">From our blog</span>
            <h2>Recent health articles</h2>
            <p>Advice and insights written by Vita Care doctors.</p>
          </div>
          <Link href="/blog" className="btn btn-outline">
            Read the blog <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid grid-3">
          {(loading ? [] : posts).map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className={`card card-hover ${styles.blogCard}`}
            >
              <div className={styles.blogMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl || FALLBACK_IMG} alt={post.title} />
              </div>
              <div className={styles.blogBody}>
                {post.category && (
                  <span className="badge">{post.category}</span>
                )}
                <h3>{post.title}</h3>
                <p className={styles.blogExcerpt}>{post.excerpt}</p>
                <div className={styles.blogMeta}>
                  {post.author} ·{' '}
                  {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
