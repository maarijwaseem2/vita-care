import { IsPkPhone } from '../../../common/validators/pk-phone';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Gender } from '../../../common/enums';

export class RegisterPatientDto {
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
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsPkPhone()
  phone: string;

  @IsString()
  @MinLength(2, { message: 'Choose your city' })
  @MaxLength(80)
  city: string;

  @IsOptional()
  @IsString()
  address?: string;
}
