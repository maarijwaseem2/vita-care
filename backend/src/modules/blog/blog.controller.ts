import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogListQuery } from './dto/blog.dto';

/** Public, read-only blog API. Editing lives under /admin/blog. */
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /** GET /blog?page=1&limit=9&category=&search= */
  @Get()
  list(@Query() q: BlogListQuery) {
    return this.blogService.listPublished(q);
  }

  @Get('categories')
  categories() {
    return this.blogService.categories();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findPublishedBySlug(slug);
  }
}
