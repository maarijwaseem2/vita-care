import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMedicalHistoryDto {
  @IsString()
  @MinLength(2, { message: 'Condition name is required' })
  condition: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString({}, { message: 'diagnosedAt must be a valid date (YYYY-MM-DD)' })
  diagnosedAt?: string;
}
