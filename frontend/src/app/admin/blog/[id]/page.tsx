'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BlogForm from '@/components/admin/BlogForm';
import Loader from '@/components/ui/Loader';
import { adminApi } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import type { BlogPost } from '@/lib/types';
import styles from '@/components/admin/admin.module.css';

export default function EditPost() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.blogGet(Number(id)).then(setPost).catch((e) => setError(getErrorMessage(e)));
  }, [id]);

  if (error) return <div className="form-error">{error}</div>;
  if (!post) return <Loader label="Loading article…" />;
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Edit article</h1>
          <p>Changes go live when you press Update on a published article.</p>
        </div>
      </div>
      <BlogForm key={post.id} post={post} />
    </>
  );
}
