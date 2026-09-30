'use client';

import BlogForm from '@/components/admin/BlogForm';
import styles from '@/components/admin/admin.module.css';

export default function NewPost() {
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>New article</h1>
          <p>Write, add a banner, fill the SEO fields, then publish. Drafts are never shown on the site.</p>
        </div>
      </div>
      <BlogForm />
    </>
  );
}
