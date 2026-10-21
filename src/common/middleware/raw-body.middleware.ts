// ─────────────────────────────────────────────────────────────────────────────
//  common/middleware/raw-body.middleware.ts
//  CRITICAL: Must run before JSON body parser on webhook routes.
//  Preserves the raw Buffer on req.rawBody so the HMAC guard can compute
//  the signature over the EXACT bytes Meta signed — not the re-serialized JSON.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });

    req.on('error', (err) => {
      next(err);
    });
  }
}
