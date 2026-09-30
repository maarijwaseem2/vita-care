import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A health article, managed from the admin portal.
 * `content` is sanitised HTML from the rich-text editor.
 */
@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 500 })
  excerpt: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ type: 'varchar', nullable: true })
  author: string | null;

  /** Banner image (uploaded file URL or a /public path). */
  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** SEO: <title>. Falls back to the post title. Keep under ~60 characters. */
  @Column({ name: 'meta_title', type: 'varchar', length: 70, nullable: true })
  metaTitle: string | null;

  /** SEO: meta description. Falls back to the excerpt. ~150–160 characters. */
  @Column({ name: 'meta_description', type: 'varchar', length: 170, nullable: true })
  metaDescription: string | null;

  @Column({ type: 'varchar', length: 12, default: 'published' })
  status: 'draft' | 'published';

  @Column({ name: 'reading_minutes', type: 'int', default: 3 })
  readingMinutes: number;

  @CreateDateColumn({ name: 'published_at' })
  publishedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
