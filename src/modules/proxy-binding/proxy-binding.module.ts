// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/proxy-binding.module.ts
//  Feature 1: Proxy Binding Layer
//  Routes all outbound WhatsApp HTTP/WebSocket traffic through
//  per-account isolated SOCKS5 or HTTP proxies.
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyPoolEntity } from './entities/proxy-pool.entity';
import { ProxyBindingService } from './services/proxy-binding.service';
import { ProxyHealthService } from './services/proxy-health.service';
import { ProxyRotationService } from './services/proxy-rotation.service';
import { ProxyBindingController } from './controllers/proxy-binding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProxyPoolEntity])],
  controllers: [ProxyBindingController],
  providers: [
    ProxyBindingService,    // Core: binds account ↔ proxy, creates agents
    ProxyHealthService,     // Monitors proxy liveness via HTTPS check
    ProxyRotationService,   // Rotates proxies on failure or schedule
  ],
  exports: [ProxyBindingService],
})
export class ProxyBindingModule {}
