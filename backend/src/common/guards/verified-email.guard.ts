import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../enums';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Use after JwtAuthGuard. AI features (chat, reports, voice) need a confirmed
 * email address, by link or by Google sign-in. Admins are exempt.
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user?.role === UserRole.ADMIN || user?.emailVerified) return true;
    throw new ForbiddenException('Please confirm your email first. We sent you a link when you signed up.');
  }
}
