// ─────────────────────────────────────────────────────────────────────────────
//  modules/health/health.module.ts — Kubernetes/Docker liveness probe
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
