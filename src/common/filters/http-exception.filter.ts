// ─────────────────────────────────────────────────────────────────────────────
//  common/filters/http-exception.filter.ts
//  Global exception filter — normalizes all error responses.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage: string;
    let errorName: string | undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        if (typeof resObj.message === 'string') {
          errorMessage = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          errorMessage = resObj.message.join(', ');
        } else if (typeof resObj.error === 'string') {
          errorMessage = resObj.error;
        } else {
          errorMessage = 'Request failed';
        }
        errorName = typeof resObj.error === 'string' ? resObj.error : undefined;
      } else {
        errorMessage = String(res);
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorName = exception.name;
    } else {
      errorMessage = 'Internal server error';
    }

    const isProd = process.env.NODE_ENV === 'production';

    this.logger.error(
      `${request.method} ${request.url} → ${status}: ${errorMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // In production, suppress sensitive internal details for 500 errors.
    // In dev/test environments, sanitize direct OS file paths to prevent filesystem disclosure.
    let clientMessage =
      isProd && status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'An internal server error occurred.'
        : errorMessage;

    if (!isProd && typeof clientMessage === 'string') {
      // Strip out local absolute file paths (Windows / Unix)
      clientMessage = clientMessage.replace(/[A-Za-z]:\\[\w\\\.-]+/g, '[redacted_path]');
      clientMessage = clientMessage.replace(/(?:\/[a-zA-Z0-9_\.-]+){2,}/g, '[redacted_path]');
    }

    response.status(status).json({
      statusCode: status,
      error: errorName || (status >= 500 ? 'Internal Server Error' : 'Error'),
      message: clientMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
