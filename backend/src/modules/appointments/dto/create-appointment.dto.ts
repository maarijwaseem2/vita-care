import { IsPkPhone } from '../../../common/validators/pk-phone';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsInt({ message: 'A doctor must be selected' })
  doctorId: number;

  @IsString()
  @MinLength(2, { message: 'Patient name is required' })
  @MaxLength(120)
  patientName: string;

  @IsString()
  @IsPkPhone()
  patientPhone: string;

  @IsDateString({ strict: true }, { message: 'Date must be valid (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;

  // e.g. "05:30 PM" — must also fall inside the doctor's OPD hours (checked in the service).
  @Matches(/^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/, { message: 'Please choose a valid time slot' })
  timeSlot: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  /** "home" only for doctors who offer home visits (physiotherapists). */
  @IsOptional()
  @IsIn(['clinic', 'home'])
  visitType?: 'clinic' | 'home';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  homeAddress?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;

  /** Attach an AI Doctor consultation so the doctor sees the summary. */
  @IsOptional()
  @IsUUID()
  triageSessionToken?: string;
}

export class UpdateStatusDto {
  @Matches(/^(completed|cancelled)$/, { message: 'Status must be "completed" or "cancelled"' })
  status: 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  doctorNotes?: string;
}
