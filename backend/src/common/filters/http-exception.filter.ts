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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? exception.message;
        error = (obj.error as string) ?? error;
      }
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
