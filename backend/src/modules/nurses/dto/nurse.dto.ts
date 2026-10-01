import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { NURSE_QUALIFICATIONS, SERVICE_IDS, TIME_WINDOWS } from '../services';

/** PNC registration numbers vary by cadre; accept 3–10 letters/digits with optional dashes or slashes. */
export const PNC_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]{2,19}$/;

export class RegisterNurseDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) password: string;
  @IsString() @MinLength(2) @MaxLength(80) firstName: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName: string;
  @IsIn(['male', 'female']) gender: 'male' | 'female';
  @IsOptional() @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'Enter a valid phone number' }) phone?: string;
  @IsString() @MinLength(2) @MaxLength(80) city: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) areas?: string[];
  @IsIn(NURSE_QUALIFICATIONS) qualification: string;
  @Matches(PNC_RE, { message: 'Enter your Pakistan Nursing Council registration number' }) pncNumber: string;
  @IsArray() @ArrayMinSize(1, { message: 'Choose at least one service you provide' }) @IsIn(SERVICE_IDS, { each: true }) skills: string[];
  @IsOptional() @IsInt() @Min(0) @Max(50) experienceYears?: number;
  @IsInt() @Min(0) @Max(50000) visitFee: number;
  @IsOptional() @IsString() @MaxLength(80) availableDays?: string;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
}

export class UpdateNurseDto {
  @IsOptional() @Matches(/^[0-9+\-\s()]{7,20}$/) phone?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) areas?: string[];
  @IsOptional() @IsArray() @IsIn(SERVICE_IDS, { each: true }) skills?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(50000) visitFee?: number;
  @IsOptional() @IsString() @MaxLength(80) availableDays?: string;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
}

export class CreateHomeCareDto {
  @IsIn(SERVICE_IDS, { message: 'Choose a service' }) service: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' }) visitDate: string;
  @IsIn(TIME_WINDOWS as unknown as string[]) timeWindow: string;
  @IsString() @MinLength(8, { message: 'Please give the full address so the nurse can find you' }) @MaxLength(500) address: string;
  @IsString() @MinLength(2) @MaxLength(80) city: string;
  @IsOptional() @IsIn(['any', 'female', 'male']) preferredGender?: 'any' | 'female' | 'male';
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  /** Optional GPS location shared from the patient's phone. */
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;

  /** Optional: request a specific verified nurse. */
  @IsOptional() @IsInt() nurseId?: number;
}

export class DoctorOrderDto {
  @IsInt() appointmentId: number;
  @IsIn(SERVICE_IDS) service: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) visitDate: string;
  @IsOptional() @IsIn(TIME_WINDOWS as unknown as string[]) timeWindow?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class VitalsDto {
  @IsOptional() @IsInt() @Min(40) @Max(300) bpSystolic?: number;
  @IsOptional() @IsInt() @Min(20) @Max(200) bpDiastolic?: number;
  @IsOptional() @IsInt() @Min(20) @Max(250) pulse?: number;
  @IsOptional() @IsNumber() @Min(30) @Max(45) temperatureC?: number;
  @IsOptional() @IsInt() @Min(50) @Max(100) spo2?: number;
  @IsOptional() @IsInt() @Min(10) @Max(900) bloodSugar?: number;
  @IsOptional() @IsInt() @Min(4) @Max(80) respiratoryRate?: number;
}

export class CompleteVisitDto {
  @ValidateNested() @Type(() => VitalsDto) vitals: VitalsDto;
  @IsString() @MinLength(5, { message: 'Write a short note about the visit' }) @MaxLength(3000) notes: string;
}

export class NurseQuery {
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsIn(['female', 'male']) gender?: string;
  @IsOptional() @IsIn(SERVICE_IDS) service?: string;
}
