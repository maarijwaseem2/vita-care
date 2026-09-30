'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2, ExternalLink, Save, Send, RefreshCw } from 'lucide-react';
import { adminApi, BlogInput } from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { SITE_URL, mediaUrl } from '@/lib/media';
import type { BlogPost } from '@/lib/types';
import styles from './blogform.module.css';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

/** Same rules as the server's slugify, so the preview matches what is saved. */
function slugify(t: string) {
  return (
    t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '')
      .replace(/[^a-z0-9\u0621-\u064a\u0660-\u0669\u0671-\u06d3\u06f0-\u06f9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/g, '') || ''
  );
}

const CATEGORIES = ['Heart Care', 'Neurology', 'General Health', 'Public Health', 'Pediatrics', 'Lab Reports', 'Mental Health', 'Dermatology', 'Bone Health', 'Gynecology', 'ENT'];

function Counter({ n, ideal, max }: { n: number; ideal: [number, number]; max: number }) {
  const cls = n > max ? styles.countBad : n >= ideal[0] && n <= ideal[1] ? styles.countGood : styles.countOk;
  return <span className={`${styles.count} ${cls}`}>{n} / {ideal[1]}</span>;
}

export default function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [content, setContent] = useState(post?.content ?? '');
  const [words, setWords] = useState(0);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [category, setCategory] = useState(post?.category ?? '');
  const [author, setAuthor] = useState(post?.author ?? '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl ?? '');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft');
  const [saving, setSaving] = useState<'' | 'draft' | 'published'>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const bannerInput = useRef<HTMLInputElement>(null);

  // Slug follows the title until the editor types their own.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const uploadBanner = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    setError('');
    try {
      setImageUrl(await adminApi.upload(f));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
      if (bannerInput.current) bannerInput.current.value = '';
    }
  };

  const freshSlug = async () => {
    try {
      setSlug(await adminApi.slugFor(title, post?.id));
      setSlugTouched(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const save = async (next: 'draft' | 'published') => {
    setError('');
    setSaved('');
    if (title.trim().length < 5) return setError('Add a title of at least 5 characters.');
    if (words < 5 && !post) return setError('Write the article content first.');
    const body: BlogInput = {
      title,
      slug: slug || undefined,
      content,
      excerpt: excerpt || undefined,
      category: category || undefined,
      author: author || undefined,
      imageUrl: imageUrl || undefined,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      status: next,
    };
    setSaving(next);
    try {
      const res = post ? await adminApi.blogUpdate(post.id, body, post.slug) : await adminApi.blogCreate(body);
      setStatus(res.status ?? next);
      setSlug(res.slug);
      setSaved(next === 'published' ? 'Published. The article is live.' : 'Draft saved.');
      if (!post) router.replace(`/admin/blog/${res.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving('');
    }
  };

  const shownTitle = metaTitle || title || 'Article title';
  const shownDesc = metaDescription || excerpt || 'The meta description appears here in Google results. Write one or two sentences that make people want to click.';

  return (
    <div className={styles.layout}>
      <div className={styles.mainCol}>
        <label className={styles.field}>
          <span className={styles.label}>
            Title <Counter n={title.length} ideal={[30, 70]} max={150} />
          </span>
          <input id="blog-title" className={`input ${styles.titleInput}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dengue Fever: Warning Signs That Need Hospital Care" />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>URL slug</span>
          <div className={styles.slugRow}>
            <span className={styles.slugPrefix}>/blog/</span>
            <input
              className="input"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value.replace(/\s/g, '-')) || e.target.value.toLowerCase());
              }}
              aria-label="URL slug"
            />
            <button type="button" className={styles.smallBtn} onClick={freshSlug} title="Generate a unique slug from the title">
              <RefreshCw size={15} /> From title
            </button>
          </div>
          <span className={styles.hint}>Short, lowercase, words joined by hyphens. Changing it after publishing breaks old links.</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>
            Content <span className={styles.count}>{words} words · ~{Math.max(1, Math.round(words / 200))} min read</span>
          </span>
          <RichEditor
            value={content}
            onChange={(html, w) => {
              setContent(html);
              setWords(w);
            }}
            onError={setError}
          />
        </div>

        <label className={styles.field}>
          <span className={styles.label}>
            Excerpt <span className={styles.hint}>(shown on blog cards; auto-written from the content if empty)</span>
          </span>
          <textarea className="textarea" rows={3} maxLength={300} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </label>
      </div>

      <aside className={styles.sideCol}>
        <section className={styles.box}>
          <h2 className={styles.boxTitle}>Publish</h2>
          <p className={styles.hint}>
            Status: <strong>{status === 'published' ? 'Published' : 'Draft'}</strong>
          </p>
          {error && <div className="form-error">{error}</div>}
          {saved && <div className={styles.ok} role="status">{saved}</div>}
          <div className={styles.btnCol}>
            <button id="publishPost" className="btn" onClick={() => save('published')} disabled={!!saving}>
              {saving === 'published' ? <span className="spinner" /> : <><Send size={16} /> {status === 'published' ? 'Update article' : 'Publish'}</>}
            </button>
            <button className="btn btn-outline" onClick={() => save('draft')} disabled={!!saving}>
              {saving === 'draft' ? <span className="spinner" /> : <><Save size={16} /> {status === 'published' ? 'Unpublish (save as draft)' : 'Save draft'}</>}
            </button>
            {post && status === 'published' && (
              <Link className={styles.smallBtn} href={`/blog/${slug}`} target="_blank">
                <ExternalLink size={15} /> View on site
              </Link>
            )}
          </div>
        </section>

        <section className={styles.box}>
          <h2 className={styles.boxTitle}>Banner image</h2>
          {imageUrl ? (
            <div className={styles.banner}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(imageUrl)} alt="Banner preview" />
              <button type="button" className={styles.smallBtn} onClick={() => setImageUrl('')}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          ) : (
            <button type="button" className={styles.drop} onClick={() => bannerInput.current?.click()} disabled={uploading}>
              {uploading ? <span className="spinner" /> : <ImagePlus size={26} />}
              <span>{uploading ? 'Uploading…' : 'Upload banner (JPG, PNG or WEBP, up to 3 MB). 1600×900 works best.'}</span>
            </button>
          )}
          <input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadBanner(e.target.files?.[0])} />
        </section>

        <section className={styles.box}>
          <h2 className={styles.boxTitle}>Details</h2>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <input className="input" list="blog-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="blog-categories">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Author</span>
            <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Dr. Sana Malik" />
          </label>
        </section>

        <section className={styles.box}>
          <h2 className={styles.boxTitle}>SEO</h2>
          <label className={styles.field}>
            <span className={styles.label}>
              Meta title <Counter n={metaTitle.length} ideal={[30, 60]} max={70} />
            </span>
            <input className="input" maxLength={70} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Meta description <Counter n={metaDescription.length} ideal={[120, 160]} max={170} />
            </span>
            <textarea className="textarea" rows={4} maxLength={170} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </label>
          <div className={styles.serp} aria-label="Google search preview">
            <span className={styles.serpUrl}>{SITE_URL.replace(/^https?:\/\//, '')} › blog › {slug || 'your-slug'}</span>
            <span className={styles.serpTitle}>{shownTitle.length > 60 ? shownTitle.slice(0, 57) + '…' : shownTitle}</span>
            <span className={styles.serpDesc}>{shownDesc.length > 160 ? shownDesc.slice(0, 157) + '…' : shownDesc}</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
