import { IsEmail, IsIn, IsObject, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @Matches(/^[a-f0-9]{64}$/, { message: 'This verification link is not valid.' })
  token: string;
}

export class GoogleSignInDto {
  @IsString()
  @MinLength(100)
  @MaxLength(5000)
  idToken: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'The code has 6 digits' })
  code: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100)
  newPassword: string;
}

export class GoogleCompleteDto {
  @IsString()
  @MinLength(20)
  signupToken: string;

  @IsIn(['patient', 'doctor', 'nurse'], { message: 'Choose patient, doctor or nurse' })
  role: 'patient' | 'doctor' | 'nurse';

  /** The same fields as the matching sign-up form (without email and password). */
  @IsObject()
  details: Record<string, unknown>;
}
