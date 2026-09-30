import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { BlogService } from '../blog/blog.service';
import { BlogListQuery, UpsertBlogDto } from '../blog/dto/blog.dto';
import {
  DoctorQuery,
  PageQuery,
  ReviewTriageDto,
  SetActiveDto,
  TriageQuery,
  UserQuery,
  VerifyDoctorDto,
} from './dto/admin.dto';
import { UPLOAD_DIR } from '../../config/uploads';
import { NursesService } from '../nurses/nurses.service';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Everything under /api/admin requires a signed-in admin. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly blog: BlogService,
    private readonly nurses: NursesService,
  ) {}

  @Get('stats')
  async stats() {
    const [base, homeCare] = await Promise.all([this.admin.stats(), this.nurses.adminStats()]);
    return { ...base, ...homeCare };
  }

  // --- nurses ---
  @Get('nurses')
  nurseList(@Query() q: DoctorQuery) {
    return this.nurses.adminList(q.status ?? 'all', q.search ?? '', q.page ?? 1, q.limit ?? 20);
  }

  @Patch('nurses/:id/verification')
  nurseVerify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyDoctorDto, @CurrentUser() me: AuthUser) {
    return this.nurses.verify(me, id, dto.status, dto.note);
  }

  // --- doctors ---
  @Get('doctors')
  doctors(@Query() q: DoctorQuery) {
    return this.admin.listDoctors(q);
  }

  @Patch('doctors/:id/verification')
  verify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyDoctorDto, @CurrentUser() me: AuthUser) {
    return this.admin.verifyDoctor(id, dto, me);
  }

  // --- AI safety monitor ---
  @Get('triage')
  triage(@Query() q: TriageQuery) {
    return this.admin.listTriage(q);
  }

  @Get('triage/:id')
  triageOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.admin.getTriage(id, me);
  }

  @Patch('triage/:id/review')
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewTriageDto, @CurrentUser() me: AuthUser) {
    return this.admin.reviewTriage(id, dto.note, me);
  }

  // --- users ---
  @Get('users')
  users(@Query() q: UserQuery) {
    return this.admin.listUsers(q);
  }

  @Patch('users/:id/active')
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @CurrentUser() me: AuthUser) {
    return this.admin.setActive(id, dto.isActive, me);
  }

  // --- audit ---
  @Get('audit')
  auditLog(@Query() q: PageQuery) {
    return this.audit.list(q.page ?? 1, q.limit ?? 50);
  }

  // --- blog CMS ---
  @Get('blog')
  blogList(@Query() q: BlogListQuery) {
    return this.blog.listAll({ ...q, status: q.status ?? 'all' });
  }

  @Get('blog/slug-suggestion')
  slug(@Query('title') title = '', @Query('excludeId') excludeId?: string) {
    return this.blog.suggestSlug(title, excludeId ? Number(excludeId) : undefined).then((slug) => ({ slug }));
  }

  @Get('blog/:id')
  blogOne(@Param('id', ParseIntPipe) id: number) {
    return this.blog.findById(id);
  }

  @Post('blog')
  async blogCreate(@Body() dto: UpsertBlogDto, @CurrentUser() me: AuthUser) {
    const post = await this.blog.create(dto);
    await this.audit.record(me, 'blog.create', 'blog_post', post.id, { title: post.title, status: post.status });
    return post;
  }

  @Patch('blog/:id')
  async blogUpdate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertBlogDto, @CurrentUser() me: AuthUser) {
    const post = await this.blog.update(id, dto);
    await this.audit.record(me, 'blog.update', 'blog_post', id, { title: post.title, status: post.status });
    return post;
  }

  @Delete('blog/:id')
  async blogDelete(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    const res = await this.blog.remove(id);
    await this.audit.record(me, 'blog.delete', 'blog_post', id);
    return res;
  }

  /** POST /admin/uploads — one image (banner or inline), max 3 MB. Returns its public URL path. */
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase() || '.jpg'}`),
      }),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        IMAGE_TYPES.includes(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Only JPG, PNG or WEBP images are allowed'), false),
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() me: AuthUser) {
    if (!file) throw new BadRequestException('Choose an image to upload');
    await this.audit.record(me, 'upload.image', 'upload', file.filename, { size: file.size });
    return { url: `/uploads/${file.filename}` };
  }
}
