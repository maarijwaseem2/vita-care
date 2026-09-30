import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Catches every error thrown anywhere in the request pipeline and turns it into
 * a single, predictable JSON shape:
 *
 *   {
 *     "statusCode": 409,
 *     "message": "That time slot is already booked. Please choose another.",
 *     "error": "Conflict",
 *     "path": "/api/appointments",
 *     "timestamp": "2026-01-01T00:00:00.000Z"
 *   }
 *
 * - Known HttpExceptions keep their status code and message (so validation
 *   errors, 401s, 404s, 409s etc. behave exactly as before).
 * - Anything unexpected becomes a safe 500 and is logged in full server-side,
 *   so we never leak stack traces to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // body-parser errors (e.g. 413 payload too large, 400 bad JSON) are not
    // HttpExceptions but carry a client-error status we should keep.
    const rawStatus = (exception as { status?: unknown })?.status;
    const clientError =
      !(exception instanceof HttpException) &&
      typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : clientError
          ? (rawStatus as number)
          : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      message = 'Too many requests. Please wait a minute and try again.';
      error = 'Too Many Requests';
    } else if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? exception.message;
        error = (obj.error as string) ?? error;
      }
    } else if (clientError) {
      message =
        status === 413
          ? 'The request is too large.'
          : (exception as Error).message || 'Bad request';
      error = status === 413 ? 'Payload Too Large' : 'Bad Request';
    } else if (exception instanceof Error) {
      // Log the real error for debugging, but don't expose it to the client.
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
