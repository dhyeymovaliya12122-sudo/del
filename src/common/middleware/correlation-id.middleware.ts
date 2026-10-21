import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { TraceContextService } from '../../modules/telemetry/services/trace-context.service';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      traceId?: string;
      spanId?: string;
    }
  }
}

/**
  * Enterprise Correlation ID & OpenTelemetry Distributed Tracing Middleware.
  * Automatically extracts or propagates incoming x-correlation-id and
  * W3C traceparent (00-traceId-spanId-01) headers, attaching them to both
  * request and response.
  */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(@Optional() private readonly traceContextService?: TraceContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // OpenTelemetry W3C Traceparent Header Parsing / Propagation
    const incomingTraceParent = req.headers['traceparent'] as string;
    let traceId: string;
    let parentSpanId: string | undefined;

    if (incomingTraceParent && incomingTraceParent.startsWith('00-')) {
      const parts = incomingTraceParent.split('-');
      traceId = parts[1] || crypto.randomBytes(16).toString('hex');
      parentSpanId = parts[2];
    } else {
      traceId = crypto.randomBytes(16).toString('hex');
    }

    let rootSpan: any = null;
    if (this.traceContextService) {
      const started = this.traceContextService.startTrace('http_ingest', traceId, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        parentSpanId,
      });
      rootSpan = started.rootSpan;
    }

    const currentSpanId = rootSpan?.spanId || crypto.randomBytes(8).toString('hex');
    const outboundTraceParent = `00-${traceId}-${currentSpanId}-01`;

    req.traceId = traceId;
    req.spanId = currentSpanId;
    res.setHeader('traceparent', outboundTraceParent);
    res.setHeader('x-trace-id', traceId);

    res.on('finish', () => {
      if (this.traceContextService && rootSpan) {
        this.traceContextService.endSpan(
          traceId,
          rootSpan.spanId,
          { statusCode: res.statusCode },
          res.statusCode >= 400 ? 'error' : 'completed',
        );
      }
    });

    next();
  }
}
