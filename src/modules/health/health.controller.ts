// ─────────────────────────────────────────────────────────────────────────────
//  modules/health/health.controller.ts
//  GET /health — Docker & Kubernetes liveness probe endpoint
// ─────────────────────────────────────────────────────────────────────────────
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'whatsapp-core-engine',
      phase: 'Phase 1 — Core Engine & Anti-Ban Foundation',
      features: {
        proxyBinding: 'active',
        sessionHydration: 'active',
        securityGuard: 'active',
      },
    };
  }
}
