import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthResponse, AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { GoogleAuthService } from './google-auth.service';
import { ForgotPasswordDto, GoogleCompleteDto, GoogleSignInDto, ResetPasswordDto, VerifyEmailDto } from './dto/verification.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomBytes } from 'crypto';
import { PasswordResetService } from './password-reset.service';
import { RegisterNurseDto } from '../nurses/dto/nurse.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: EmailVerificationService,
    private readonly google: GoogleAuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  /** After any sign-up: email the confirmation link. Sign-up never fails because of email. */
  private async withVerificationEmail(res: AuthResponse): Promise<AuthResponse> {
    const r = await this.verification.sendFor(res.user.id, res.user.email, res.user.name).catch(() => ({ sent: false }));
    res.user.emailVerified = false;
    if ('devVerificationUrl' in r && r.devVerificationUrl) res.devVerificationUrl = r.devVerificationUrl;
    return res;
  }

  /** POST /auth/verify-email { token } — the link in the email lands here (via the website). */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.verification.verify(dto.token);
  }

  /** POST /auth/resend-verification — signed-in user asks for a new link (60 s cooldown). */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  resend(@CurrentUser() user: AuthUser) {
    return this.verification.resend(user.userId);
  }

  /** POST /auth/forgot-password { email } — emails a 6-digit code (same answer whether or not the email exists). */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordReset.request(dto.email);
  }

  /** POST /auth/reset-password { email, code, newPassword } */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordReset.reset(dto.email, dto.code, dto.newPassword);
  }

  /**
   * POST /auth/google { idToken } — "Continue with Google".
   * Returns a normal session for known people, or { needsOnboarding, signupToken } for new people.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google')
  async googleSignIn(@Body() dto: GoogleSignInDto) {
    const r = await this.google.resolve(dto.idToken);
    if ('userId' in r) return this.authService.issueFor(r.userId);
    return { needsOnboarding: true, signupToken: r.signup.token, email: r.signup.email, name: r.signup.name };
  }

  /**
   * POST /auth/google/complete { signupToken, role, details } — a new Google user picked their role
   * and filled in the same details as the normal sign-up forms (phone required).
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google/complete')
  async googleComplete(@Body() dto: GoogleCompleteDto) {
    const g = this.google.readSignupToken(dto.signupToken);
    // Same rules as email sign-up; the password is random and unused (they sign in with Google).
    const base = { ...(dto.details ?? {}), email: g.email, password: randomBytes(18).toString('hex') };
    const Dto = (dto.role === 'doctor' ? RegisterDoctorDto : dto.role === 'nurse' ? RegisterNurseDto : RegisterPatientDto) as new () => object;
    const instance: object = plainToInstance(Dto, base);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length) {
      throw new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})));
    }
    const res =
      dto.role === 'doctor'
        ? await this.authService.registerDoctor(instance as RegisterDoctorDto)
        : dto.role === 'nurse'
          ? await this.authService.registerNurse(instance as RegisterNurseDto)
          : await this.authService.registerPatient(instance as RegisterPatientDto);
    await this.google.linkNewAccount(res.user.id, g.uid, g.ev);
    return this.authService.issueFor(res.user.id);
  }


  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register/patient')
  async registerPatient(@Body() dto: RegisterPatientDto) {
    return this.withVerificationEmail(await this.authService.registerPatient(dto));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register/nurse')
  async registerNurse(@Body() dto: RegisterNurseDto) {
    return this.withVerificationEmail(await this.authService.registerNurse(dto));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register/doctor')
  async registerDoctor(@Body() dto: RegisterDoctorDto) {
    return this.withVerificationEmail(await this.authService.registerDoctor(dto));
  }

  // Login authenticates an existing account, so 200 OK is more correct than
  // the POST default of 201 Created.
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const res = await this.authService.login(dto);
    res.user.emailVerified = await this.verification.isVerified(res.user.id);
    return res;
  }


  /** Returns the identity encoded in the current token. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
