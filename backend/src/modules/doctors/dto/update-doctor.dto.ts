import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Gender, Specialty } from '../../../common/enums';

/** Fields a doctor may edit on their own profile. All optional (partial update). */
export class UpdateDoctorDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(Specialty) specialty?: Specialty;
  @IsOptional() @IsInt() @Min(20) @Max(100) age?: number;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) qualifications?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) certificates?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) experiences?: string[];
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() opdSchedule?: string;
  @IsOptional() @IsString() availableTime?: string;
  @IsOptional() @IsNumber() @Min(0) fees?: number;
  @IsOptional() @IsString() imageUrl?: string;
}
