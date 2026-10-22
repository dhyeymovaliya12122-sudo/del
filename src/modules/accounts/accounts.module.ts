// ─────────────────────────────────────────────────────────────────────────────
//  modules/accounts/accounts.module.ts
//  Phase 3 Completion: Accounts REST API consumed by the React dashboard.
//
//  Exposes account list, per-account detail, create, and status endpoints.
//  The frontend Sidebar and HealthDashboard hit these routes to populate UI.
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappAccountEntity } from '../session-hydration/entities/whatsapp-account.entity';
import { WhatsappChatEntity } from '../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../session-hydration/entities/whatsapp-message.entity';
import { WhatsappCallEntity } from '../session-hydration/entities/whatsapp-call.entity';
import { ProxyPoolEntity } from '../proxy-binding/entities/proxy-pool.entity';
import { ProxyCircuitBreakerEntity } from '../proxy-circuit-breaker/entities/proxy-circuit-breaker.entity';
import { SessionAuthEntity } from '../session-hydration/entities/session-auth.entity';
import { ExportLogEntity } from './entities/export-log.entity';
import { UserAccountAccessEntity } from '../auth/entities/user-account-access.entity';
import { AccountsController } from './controllers/accounts.controller';
import { AccountsService } from './services/accounts.service';
import { WhatsappApiService } from './services/whatsapp-api.service';
import { WhatsappWebController } from './controllers/whatsapp-web.controller';
import { WhatsappWebService } from './services/whatsapp-web.service';
import { ExportBackupController } from './controllers/export-backup.controller';
import { ExportBackupService } from './services/export-backup.service';
import { BackupSchedulerService } from './services/backup-scheduler.service';
import { DataLifecycleEvictionService } from './services/data-lifecycle-eviction.service';
import { ProxyCircuitBreakerModule } from '../proxy-circuit-breaker/proxy-circuit-breaker.module';
import { SessionHydrationModule } from '../session-hydration/session-hydration.module';
import { AuthModule } from '../auth/auth.module';
import { AccountIsolationGuard } from '../../common/guards/account-isolation.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappAccountEntity,
      WhatsappChatEntity,
      WhatsappContactEntity,
      WhatsappMessageEntity,
      WhatsappCallEntity,
      SessionAuthEntity,
      ProxyPoolEntity,
      ProxyCircuitBreakerEntity,
      ExportLogEntity,
      UserAccountAccessEntity,
    ]),
    ProxyCircuitBreakerModule,
    SessionHydrationModule,
    AuthModule,
  ],
  controllers: [AccountsController, WhatsappWebController, ExportBackupController],
  providers: [
    AccountsService, WhatsappApiService, WhatsappWebService,
    ExportBackupService, BackupSchedulerService, DataLifecycleEvictionService,
    AccountIsolationGuard, // ← Account isolation enforcer for all data endpoints
  ],
  exports: [AccountsService, WhatsappApiService, WhatsappWebService, ExportBackupService, BackupSchedulerService, DataLifecycleEvictionService],
})
export class AccountsModule {}


