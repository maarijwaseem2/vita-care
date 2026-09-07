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
} from 'class-validator';
import { Gender, Specialty } from '../../../common/enums';

export class RegisterDoctorDto {
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
