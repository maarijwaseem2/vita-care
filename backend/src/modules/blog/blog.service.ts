import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import sanitizeHtml from 'sanitize-html';
import { BlogPost } from './entities/blog-post.entity';
import { BlogListQuery, UpsertBlogDto } from './dto/blog.dto';
import { htmlToText, readingMinutes, slugify, truncateWords } from '../../common/utils/slug';

/** Tags the editor can produce. Anything else (scripts, iframes, styles) is stripped. */
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'mark',
    'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['style', 'dir'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly repo: Repository<BlogPost>,
  ) {}

  // ---------- public ----------

  /** Published posts, newest first. 9 per page by default (3 × 3 grid). */
  async listPublished(q: BlogListQuery): Promise<Paged<BlogPost>> {
    return this.page({ ...q, status: 'published' }, 9);
  }

  async categories(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where("p.status = 'published' AND p.category IS NOT NULL")
      .orderBy('category')
      .getRawMany<{ category: string }>();
    return rows.map((r) => r.category);
  }

  async findPublishedBySlug(slug: string) {
    const post = await this.repo.findOne({ where: { slug, status: 'published' } });
    if (!post) throw new NotFoundException('Blog post not found');
    const related = await this.repo.find({
      where: { status: 'published', id: Not(post.id), ...(post.category ? { category: post.category } : {}) },
      order: { publishedAt: 'DESC' },
      take: 3,
    });
    return { ...post, related };
  }

  // ---------- admin ----------

  listAll(q: BlogListQuery): Promise<Paged<BlogPost>> {
    return this.page(q, 20);
  }

  async findById(id: number): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async create(dto: UpsertBlogDto): Promise<BlogPost> {
    const post = this.repo.create();
    await this.apply(post, dto);
    return this.repo.save(post);
  }

  async update(id: number, dto: UpsertBlogDto): Promise<BlogPost> {
    const post = await this.findById(id);
    await this.apply(post, dto);
    return this.repo.save(post);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const post = await this.findById(id);
    await this.repo.remove(post);
    return { deleted: true };
  }

  /** Suggest a free slug for a title (used live by the editor). */
  async suggestSlug(title: string, excludeId?: number): Promise<string> {
    return this.uniqueSlug(slugify(title), excludeId);
  }

  // ---------- helpers ----------

  private async page(q: BlogListQuery, defaultLimit: number): Promise<Paged<BlogPost>> {
    const limit = q.limit ?? defaultLimit;
    const page = q.page ?? 1;
    const where: Record<string, unknown> = {};
    if (q.status && q.status !== 'all') where.status = q.status;
    if (q.category) where.category = q.category;
    const [items, total] = await this.repo.findAndCount({
      where: q.search ? [{ ...where, title: ILike(`%${q.search}%`) }, { ...where, excerpt: ILike(`%${q.search}%`) }] : where,
      order: { publishedAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
  }

  private async apply(post: BlogPost, dto: UpsertBlogDto): Promise<void> {
    // Keep uploaded image links relative ("/uploads/…") so they survive a domain change.
    const content = sanitizeHtml(dto.content, SANITIZE).replace(/(src=")https?:\/\/[^"/]+(\/uploads\/)/g, '$1$2');
    const text = htmlToText(content);
    if (text.length < 20) throw new BadRequestException('Write some content first');

    const wanted = dto.slug?.trim() || slugify(dto.title);
    if (dto.slug && dto.slug !== post.slug) {
      const taken = await this.repo.findOne({ where: { slug: dto.slug } });
      if (taken && taken.id !== post.id) throw new ConflictException('That slug is already used by another post');
    }

    post.title = dto.title.trim();
    post.slug = dto.slug ? wanted : await this.uniqueSlug(wanted, post.id);
    post.content = content;
    post.excerpt = (dto.excerpt?.trim() || truncateWords(text, 220)).slice(0, 500);
    post.category = dto.category?.trim() || null;
    post.author = dto.author?.trim() || null;
    post.imageUrl = dto.imageUrl?.trim().replace(/^https?:\/\/[^/]+(\/uploads\/)/, '$1') || null;
    post.metaTitle = dto.metaTitle?.trim() || null;
    post.metaDescription = dto.metaDescription?.trim() || null;
    post.status = dto.status ?? post.status ?? 'draft';
    post.readingMinutes = readingMinutes(text);
  }

  private async uniqueSlug(base: string, excludeId?: number): Promise<string> {
    let slug = base;
    for (let n = 2; ; n++) {
      const found = await this.repo.findOne({ where: { slug } });
      if (!found || found.id === excludeId) return slug;
      slug = `${base}-${n}`.slice(0, 90);
    }
  }
}
