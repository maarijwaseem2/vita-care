import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsInt({ message: 'A doctor must be selected' })
  doctorId: number;

  @IsString()
  @MinLength(2, { message: 'Patient name is required' })
  patientName: string;

  @IsString()
  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'A valid phone number is required' })
  patientPhone: string;

  @IsDateString({}, { message: 'Date must be valid (YYYY-MM-DD)' })
  date: string;

  // e.g. "10:00 AM" — validated as a non-empty slot label.
  @IsString()
  @MinLength(3, { message: 'A time slot is required' })
  timeSlot: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
