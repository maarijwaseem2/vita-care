import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A health blog article shown on the landing page and the /blog route. */
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

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  author: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'published_at' })
  publishedAt: Date;
}
