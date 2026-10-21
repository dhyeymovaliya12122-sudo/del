// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/services/session-hydration.service.ts
//  Feature 2: Orchestrates full session lifecycle
//
//  Called at:
//    - Container boot (OnApplicationBootstrap hook)
//    - Manual reconnect requests
//    - QR code pairing flow
// ─────────────────────────────────────────────────────────────────────────────
import {
  Injectable, Logger, OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SessionSyncManager } from './session-sync.manager';
import { BaileysClientFactory } from '../factories/baileys-client.factory';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';

@Injectable()
export class SessionHydrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionHydrationService.name);

  constructor(
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    private readonly sessionSyncManager: SessionSyncManager,
    private readonly baileysClientFactory: BaileysClientFactory,
    private readonly config: ConfigService,
  ) {}

  /**
   * On container boot: auto-hydrate all accounts with saved sessions.
   * This is the core of the stateless session persistence strategy.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('🔄 Container boot: starting stateless session hydration…');

    const accounts = await this.accountRepo.find();
    const accountsToHydrate: WhatsappAccountEntity[] = [];

    for (const acc of accounts) {
      // Never attempt to reconnect banned accounts or fresh accounts awaiting first QR scan
      if (acc.status === 'banned') continue;
      if (acc.status === 'pending' && acc.phoneNumber?.startsWith('pending_')) continue;

      // Only auto-hydrate accounts that actually have a saved active session in DB.
      // Unpaired or logged-out accounts must NOT start Baileys sockets in the background on container boot;
      // they will initiate connection only when the user explicitly triggers QR pairing or connect in UI.
      const hasSession = await this.sessionSyncManager.hasSession(acc.id);
      if (hasSession) {
        accountsToHydrate.push(acc);
      }
    }

    if (accountsToHydrate.length === 0) {
      this.logger.log('No saved sessions found for hydration.');
      return;
    }

    this.logger.log(`Hydrating ${accountsToHydrate.length} account(s) from database…`);

    const results = await Promise.allSettled(
      accountsToHydrate.map((account) => this.hydrateAccount(account.id)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `✅ Hydration complete: ${succeeded} succeeded, ${failed} failed`,
    );
  }

  /** Hydrate a single account: fetch from DB, decrypt, write to /tmp, start Baileys */
  async hydrateAccount(accountId: string): Promise<void> {
    try {
      // Try to fetch existing session from DB
      let hydrationResult;
      try {
        hydrationResult = await this.sessionSyncManager.hydrateSession(accountId);
      } catch (error) {
        // If no session exists, create empty auth directory for QR flow
        if (error.message?.includes('No active session found')) {
          this.logger.log(`No existing session for [${accountId}]. Starting QR flow...`);
          hydrationResult = await this.sessionSyncManager.createEmptySession(accountId);
        } else {
          throw error;
        }
      }
      
      await this.baileysClientFactory.createClient(accountId, hydrationResult.authDir);
      this.logger.log(`✅ Account [${accountId}] connected via ${hydrationResult.fromCache ? 'CACHE' : 'DB'}`);
    } catch (error) {
      this.logger.error(`❌ Failed to hydrate account [${accountId}]: ${error.message}`);
      throw error;
    }
  }

  /** Gracefully disconnect and clean up ephemeral session files */
  async terminateAccount(accountId: string, logout = false): Promise<void> {
    if (logout) {
      await this.baileysClientFactory.logoutClient(accountId);
    } else {
      await this.baileysClientFactory.destroyClient(accountId);
    }
    await this.sessionSyncManager.cleanupEphemeralSession(accountId);
    this.logger.log(`Account [${accountId}] terminated and ephemeral session cleaned (logout: ${logout})`);
  }
}
