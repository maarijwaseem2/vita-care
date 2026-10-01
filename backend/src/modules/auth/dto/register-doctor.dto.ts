import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  Matches,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Gender, Specialty } from '../../../common/enums';

/** PMDC registration numbers look like 12345-P, 1234-N, 67890-D (digits, dash, letter). */
export const PMDC_RE = /^\d{3,7}-?[A-Za-z]{1,2}$/;
export const PMDC_MSG = 'Enter your PMDC registration number, e.g. 12345-P';
/** AHPC (physiotherapists) numbers vary in format: letters, digits, dashes or slashes. */
export const AHPC_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]{3,29}$/;
export const AHPC_MSG = 'Enter your AHPC registration number (Allied Health Professionals Council)';
/** Either format; the service then checks the right one for the chosen department. */
export const REG_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]{2,29}$/;

export class RegisterDoctorDto {
  /** Required: an admin checks it on pmdc.pk before the profile goes live. */
  @IsString()
  @Matches(REG_RE, { message: 'Enter your PMDC (doctors) or AHPC (physiotherapists) registration number' })
  pmdcNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clinicName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  bio?: string;

  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsEnum(Specialty, { message: 'Please choose a valid specialty' })
  specialty: Specialty;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experiences?: string[];

  @IsOptional()
  @IsString()
  opdSchedule?: string;

  @IsOptional()
  @IsString()
  availableTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fees?: number;
}
