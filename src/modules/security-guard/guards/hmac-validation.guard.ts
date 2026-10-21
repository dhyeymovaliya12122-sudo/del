// ─────────────────────────────────────────────────────────────────────────────
//  modules/security-guard/guards/hmac-validation.guard.ts
//  Feature 3: HMAC X-Hub-Signature-256 Validation Guard
//
//  Validates the X-Hub-Signature-256 header on every webhook request.
//  Unauthorized requests (missing or invalid signature) are rejected
//  with HTTP 401 before any business logic is executed.
//
//  Algorithm:
//    1. Read raw request body as Buffer (body must NOT be JSON-parsed yet)
//    2. Compute HMAC-SHA256 of body using WEBHOOK_HMAC_SECRET
//    3. Compare computed digest with header value using timingSafeEqual
//    4. Throw UnauthorizedException on mismatch
// ─────────────────────────────────────────────────────────────────────────────
import {
  CanActivate, ExecutionContext, Injectable,
  Logger, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class HmacValidationGuard implements CanActivate {
  private readonly logger = new Logger(HmacValidationGuard.name);
  private readonly secret: string;
  private readonly signatureHeader: string;

  constructor(private readonly config: ConfigService) {
    this.secret = config.get<string>('WEBHOOK_HMAC_SECRET') || process.env.WEBHOOK_HMAC_SECRET || 'change_me';
    const isProd = (config.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production';
    const weakPlaceholders = ['change_me', 'supersecretkey', 'secret', 'default', '123456'];

    if (isProd && weakPlaceholders.some((w) => this.secret.toLowerCase().includes(w))) {
      throw new Error(
        '🚨 [SECURITY FATAL] WEBHOOK_HMAC_SECRET must be set to your real Meta App Secret in production (cannot use placeholders like supersecretkey or change_me).',
      );
    }
    this.signatureHeader = config.get<string>(
      'security.webhookSignatureHeader',
      'x-hub-signature-256',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const incomingSignature = request.headers[this.signatureHeader] as string;

    if (!incomingSignature) {
      this.logger.warn(
        `[HMAC] Missing signature header [${this.signatureHeader}] from ${request.ip}`,
      );
      throw new UnauthorizedException(
        `Missing required signature header: ${this.signatureHeader}`,
      );
    }

    // Raw body must be available as Buffer on request (set by rawBodyMiddleware)
    const rawBody: Buffer = (request as any).rawBody;
    if (!rawBody) {
      this.logger.error('[HMAC] rawBody not set on request. Ensure raw body middleware is active.');
      throw new UnauthorizedException('Cannot validate signature: raw body unavailable');
    }

    // Compute expected signature
    const expectedSignature = `sha256=${this.computeHmac(rawBody)}`;

    // Timing-safe comparison (prevents timing attacks)
    const isValid = this.timingSafeEqual(incomingSignature, expectedSignature);

    if (!isValid) {
      this.logger.warn(
        `[HMAC] ❌ INVALID signature from ${request.ip} on ${request.path}`,
      );
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    this.logger.debug(`[HMAC] ✅ Signature verified for ${request.path}`);
    return true;
  }

  private computeHmac(body: Buffer): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('hex');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    // Hash both strings with SHA-256 to produce fixed 32-byte buffers
    // This prevents timing leaks while avoiding Node crypto.timingSafeEqual RangeError when lengths differ
    const bufA = crypto.createHash('sha256').update(a).digest();
    const bufB = crypto.createHash('sha256').update(b).digest();
    const digestsMatch = crypto.timingSafeEqual(bufA, bufB);
    return digestsMatch && a.length === b.length;
  }
}
