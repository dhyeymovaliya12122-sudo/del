// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-circuit-breaker/proxy-circuit-breaker.module.ts
//  Phase 2 — Feature: Proxy Circuit Breaker & Health Monitoring
//
//  Pattern: Classic 3-state circuit breaker (CLOSED → OPEN → HALF_OPEN)
//  Backed by Redis atomic counters + BullMQ queue pause integration.
//
//  On OPEN state:
//    - The BullMQ outbound-message queue for the affected account is PAUSED
//    - Prevents WhatsApp from falling back to the datacenter IP
//    - CloudflareWAF optionally blocks the failing proxy IP
//    - A reset timer fires after PROXY_CIRCUIT_BREAKER_RESET_MS
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ProxyCircuitBreakerEntity } from './entities/proxy-circuit-breaker.entity';
import { ProxyCircuitBreakerService } from './services/proxy-circuit-breaker.service';
import { SmartProxyRotatorService } from './services/smart-proxy-rotator.service';
import { CircuitBreakerWorker } from './workers/circuit-breaker.worker';
import { CircuitBreakerHealthWorker } from './workers/circuit-breaker-health.worker';
import { ProxyCircuitBreakerController } from './controllers/proxy-circuit-breaker.controller';
import { ProxyBindingModule } from '../proxy-binding/proxy-binding.module';
import { ProxyPoolEntity } from '../proxy-binding/entities/proxy-pool.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProxyCircuitBreakerEntity, ProxyPoolEntity]),
    BullModule.registerQueue({
      name: 'proxy-health-check',            // Dedicated BullMQ queue for health jobs
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 1,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    ProxyBindingModule,
  ],
  controllers: [ProxyCircuitBreakerController],
  providers: [
    ProxyCircuitBreakerService,    // Core: state machine, Redis counter management
    SmartProxyRotatorService,      // Pillar 4: Subnet-isolated proxy rotation
    CircuitBreakerWorker,          // BullMQ worker: processes health-check jobs
    CircuitBreakerHealthWorker,    // Scheduler: enqueues periodic health-check jobs
  ],
  exports: [ProxyCircuitBreakerService, SmartProxyRotatorService],
})
export class ProxyCircuitBreakerModule {}
