// ─────────────────────────────────────────────────────────────────────────────
//  modules/realtime-gateway/realtime-gateway.module.ts
//  Phase 2 — Feature: Multi-Node WebSocket Syncing
//
//  Uses @socket.io/redis-adapter to sync Socket.io events across
//  multiple NestJS container instances via Redis Pub/Sub.
//
//  Channel naming convention (tenant-scoped):
//    tenant:{tenantId}:account:{accountId}:messages
//    tenant:{tenantId}:account:{accountId}:status
//    tenant:{tenantId}:account:{accountId}:media
// ─────────────────────────────────────────────────────────────────────────────
import { Module, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { RealtimeEventService } from './services/realtime-event.service';
import { RedisAdapterFactory } from './factories/redis-adapter.factory';
import { PubSubListenerService } from './services/pubsub-listener.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [
    RealtimeGateway,          // Socket.io Gateway with Redis adapter
    RealtimeEventService,     // Publishes events to tenant-scoped channels
    RedisAdapterFactory,      // Builds createAdapter() with dual Redis connections
    PubSubListenerService,    // Subscribes to Redis Pub/Sub for cross-node events
  ],
  exports: [RealtimeEventService, RealtimeGateway],
})
export class RealtimeGatewayModule {}
