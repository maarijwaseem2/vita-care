import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertBlogDto {
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters' })
  @MaxLength(150)
  title: string;

  /** Optional: generated from the title when empty. */
  @IsOptional()
  @IsString()
  @MaxLength(90)
  @Matches(/^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/, {
    message: 'Slug can only contain lowercase letters, numbers and single hyphens',
  })
  slug?: string;

  /** Rich-text HTML from the editor. Sanitised on the server. */
  @IsString()
  @MinLength(20, { message: 'Write some content first' })
  @MaxLength(200_000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(70, { message: 'Meta title should be 70 characters or fewer' })
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(170, { message: 'Meta description should be 170 characters or fewer' })
  metaDescription?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}

export class BlogListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['draft', 'published', 'all']) status?: 'draft' | 'published' | 'all';
}
