import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but never blocks the request.
 * - Valid token  -> request.user is populated.
 * - No / bad token -> request.user stays undefined and the route still runs.
 *
 * Used for endpoints that are public but behave better when they know who
 * you are (e.g. booking an appointment as a guest vs. a logged-in patient).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(_err: any, user: any) {
    // Swallow errors and simply return whatever user we resolved (or null).
    return user ?? null;
  }
}
