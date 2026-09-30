import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class DoctorQuery extends PageQuery {
  @IsOptional() @IsIn(['pending', 'verified', 'rejected', 'all']) status?: string;
}

export class VerifyDoctorDto {
  @IsIn(['verified', 'rejected', 'pending'])
  status: 'verified' | 'rejected' | 'pending';

  /** Required when rejecting: shown to the doctor. */
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class TriageQuery extends PageQuery {
  @IsOptional() @IsIn(['routine', 'soon', 'emergency', 'all']) urgency?: string;
  @IsOptional() @IsIn(['yes', 'no', 'all']) reviewed?: string;
}

export class ReviewTriageDto {
  @IsString() @MaxLength(2000) note: string;
}

export class UserQuery extends PageQuery {
  @IsOptional() @IsIn(['patient', 'doctor', 'nurse', 'admin', 'all']) role?: string;
}

export class SetActiveDto {
  @IsBoolean() isActive: boolean;
}
