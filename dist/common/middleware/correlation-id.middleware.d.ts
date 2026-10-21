import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
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
export declare class CorrelationIdMiddleware implements NestMiddleware {
    private readonly traceContextService?;
    constructor(traceContextService?: TraceContextService);
    use(req: Request, res: Response, next: NextFunction): void;
}
