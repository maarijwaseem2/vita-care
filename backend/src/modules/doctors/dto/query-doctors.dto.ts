import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Specialty } from '../../../common/enums';

/** Filters for the public doctor-search endpoint (city / specialty / keyword). */
export class QueryDoctorsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(Specialty)
  specialty?: Specialty;

  // Free-text search across name and specialty.
  @IsOptional()
  @IsString()
  search?: string;
}
