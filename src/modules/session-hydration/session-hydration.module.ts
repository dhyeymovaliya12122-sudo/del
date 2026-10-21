// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/session-hydration.module.ts
//  Feature 2: Stateless Auth Hydration
//
//  On container startup:
//    1. Fetch encrypted auth payload from PostgreSQL
//    2. Decrypt with AES-256-CBC key from env
//    3. Unzip into ephemeral /tmp/wa-sessions/<accountId>/
//    4. Register Baileys client with that auth
//
//  No data is ever written to a persistent volume (no EBS dependency).
// ─────────────────────────────────────────────────────────────────────────────
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthEntity } from './entities/session-auth.entity';
import { WhatsappAccountEntity } from './entities/whatsapp-account.entity';
import { WhatsappChatEntity } from './entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from './entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from './entities/whatsapp-message.entity';
import { UserAccountAccessEntity } from '../auth/entities/user-account-access.entity';
import { AppUserEntity } from '../auth/entities/app-user.entity';
import { SessionCryptoService } from './services/session-crypto.service';
import { SessionSyncManager } from './services/session-sync.manager';
import { SessionHydrationService } from './services/session-hydration.service';
import { BaileysMediaPipelineService } from './services/baileys-media-pipeline.service';
import { BaileysSyncService } from './services/baileys-sync.service';
import { BaileysClientFactory } from './factories/baileys-client.factory';
import { BehavioralTypingService } from './services/behavioral-typing.service';
import { AccountWarmupService } from './services/account-warmup.service';
import { DistributedSocketManagerService } from './services/distributed-socket-manager.service';
import { SessionHydrationController } from './controllers/session-hydration.controller';
import { ProxyBindingModule } from '../proxy-binding/proxy-binding.module';
import { RealtimeGatewayModule } from '../realtime-gateway/realtime-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionAuthEntity,
      WhatsappAccountEntity,
      WhatsappChatEntity,
      WhatsappContactEntity,
      WhatsappMessageEntity,
      UserAccountAccessEntity,
      AppUserEntity,
    ]),
    ProxyBindingModule,  // Needed to inject proxy agents into Baileys
    RealtimeGatewayModule,  // Needed to broadcast QR codes via Socket.io
    forwardRef(() => AuthModule),
  ],
  controllers: [SessionHydrationController],
  providers: [
    SessionCryptoService,            // AES-256-CBC encrypt/decrypt for auth payloads
    SessionSyncManager,              // Reads from DB → decrypts → writes to /tmp
    SessionHydrationService,         // Orchestrates full hydration lifecycle
    BaileysMediaPipelineService,     // Media downloads, disk persistence, and URL repairs
    BaileysSyncService,              // Groups, contacts, and message history synchronization
    BaileysClientFactory,            // Creates and coordinates Baileys WhatsApp client instances
    BehavioralTypingService,         // Pillar 1: AI Anti-Ban Gaussian Typing Cadence Simulator
    AccountWarmupService,            // Pillar 1: Logarithmic Account Warm-Up Progression Engine
    DistributedSocketManagerService, // Pillar 2: Active-Active Distributed Socket Clustering
  ],
  exports: [
    TypeOrmModule,
    SessionHydrationService,
    SessionSyncManager,
    BaileysMediaPipelineService,
    BaileysSyncService,
    BaileysClientFactory,
    BehavioralTypingService,
    AccountWarmupService,
    DistributedSocketManagerService,
  ],
})
export class SessionHydrationModule {}
