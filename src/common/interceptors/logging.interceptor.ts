// ─────────────────────────────────────────────────────────────────────────────
//  common/interceptors/logging.interceptor.ts
//  Request/response logging interceptor with timing information.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startTime;
        this.logger.log(
          `${method} ${url} ${response.statusCode} — ${duration}ms [${ip}]`,
        );
      }),
    );
  }
}
