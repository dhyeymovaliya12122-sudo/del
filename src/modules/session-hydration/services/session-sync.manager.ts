// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/services/session-sync.manager.ts
//  Feature 2: Session Sync Manager — DB → /tmp RAM hydration
//
//  Workflow:
//    1. Query PostgreSQL for encrypted auth payload
//    2. Decrypt with AES-256-CBC via SessionCryptoService
//    3. Write decrypted JSON files to /tmp/wa-sessions/<accountId>/
//    4. Update hydrated_at timestamp in DB
//    5. Optionally cache decrypted payload in Redis with TTL
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { SessionAuthEntity } from '../entities/session-auth.entity';
import { SessionCryptoService } from './session-crypto.service';

export interface HydrationResult {
  accountId: string;
  authDir: string;         // e.g. /tmp/wa-sessions/<accountId>
  hydratedAt: Date;
  fromCache: boolean;
}

@Injectable()
export class SessionSyncManager {
  private readonly logger = new Logger(SessionSyncManager.name);

  constructor(
    @InjectRepository(SessionAuthEntity)
    private readonly sessionRepo: Repository<SessionAuthEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly cryptoService: SessionCryptoService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Hydrates session for the given accountId into ephemeral /tmp memory.
   * Called at container boot or on reconnection.
   */
  async hydrateSession(accountId: string): Promise<HydrationResult> {
    const authDir = this.getAuthDir(accountId);
    const cacheKey = `hydrated:${accountId}`;
    const ttl = this.config.get<number>('redis.ttlSeconds', 3600);

    // ── 1. Check Redis cache first (avoids repeated DB + decrypt round trips)
    const cachedStr = await this.redis.get(cacheKey);
    if (cachedStr) {
      try {
        const cachedEncrypted = JSON.parse(cachedStr);
        // [D-2 FIX] Decrypt from Redis as well (no plaintext in RAM cache)
        const decryptedCache = this.cryptoService.decrypt(cachedEncrypted);
        await fs.mkdir(authDir, { recursive: true });
        await this.writeAuthFiles(authDir, JSON.parse(decryptedCache));
        this.logger.log(`Session [${accountId}] hydrated from REDIS cache`);
        return { accountId, authDir, hydratedAt: new Date(), fromCache: true };
      } catch (err) {
        this.logger.warn(`Redis cache decryption failed for ${accountId}, falling back to Postgres`);
      }
    }

    // ── 2. Fetch encrypted payload from PostgreSQL
    const sessionRecord = await this.sessionRepo.findOne({
      where: { accountId, isActive: true },
    });

    if (!sessionRecord) {
      throw new NotFoundException(
        `No active session found in DB for account ${accountId}`,
      );
    }

    // ── 3. Decrypt AES-256-CBC payload
    const decryptedCreds = this.cryptoService.decrypt({
      ciphertext: sessionRecord.encryptedCreds,
      iv: sessionRecord.iv,
      checksum: sessionRecord.checksum,
    });

    let decryptedKeys: string | null = null;
    if (sessionRecord.encryptedKeys) {
      decryptedKeys = this.cryptoService.decrypt({
        ciphertext: sessionRecord.encryptedKeys,
        iv: sessionRecord.iv,
        checksum: sessionRecord.checksum,
      });
    }

    const parsed = JSON.parse(decryptedCreds);
    let authData: any;
    if (parsed && (parsed.__isArchive || parsed.files)) {
      authData = parsed;
    } else {
      authData = {
        creds: parsed,
        keys: decryptedKeys ? JSON.parse(decryptedKeys) : null,
      };
    }

    // ── 4. Write decrypted files to ephemeral /tmp
    await fs.mkdir(authDir, { recursive: true });
    await this.writeAuthFiles(authDir, authData);

    // ── 5. Cache decrypted data in Redis with TTL
    // [D-2 FIX] Encrypt before caching in Redis to prevent session stealing from in-memory DB
    const cacheEncrypted = this.cryptoService.encrypt(JSON.stringify(authData));
    await this.redis.set(cacheKey, JSON.stringify(cacheEncrypted), 'EX', ttl);

    // ── 6. Update hydrated_at in DB
    await this.sessionRepo.update(sessionRecord.id, { hydratedAt: new Date() });

    this.logger.log(`Session [${accountId}] hydrated from POSTGRESQL → /tmp`);
    return { accountId, authDir, hydratedAt: new Date(), fromCache: false };
  }

  /** Save (persist) session state back to database after auth update */
  async persistSession(accountId: string, authData?: object): Promise<void> {
    const authDir = this.getAuthDir(accountId);
    let payloadToSave: any = authData;

    try {
      const files = await fs.readdir(authDir);
      const fileMap: Record<string, string> = {};
      for (const file of files) {
        if (file.endsWith('.json')) {
          fileMap[file] = await fs.readFile(path.join(authDir, file), 'utf8');
        }
      }
      if (Object.keys(fileMap).length > 0) {
        payloadToSave = { __isArchive: true, files: fileMap };
      }
    } catch {
      // fallback to provided authData
    }

    // Determine if this session is genuinely registered and verified on WhatsApp
    let isRegistered = false;
    try {
      const credsRaw = payloadToSave?.files?.['creds.json'] || (payloadToSave?.creds ? JSON.stringify(payloadToSave.creds) : null);
      if (credsRaw) {
        const parsed = JSON.parse(credsRaw);
        if (parsed?.registered === true && parsed?.me?.id) {
          isRegistered = true;
        }
      }
    } catch {}

    const plaintext = JSON.stringify(payloadToSave || authData || {});
    const encrypted = this.cryptoService.encrypt(plaintext);

    const existing = await this.sessionRepo.findOne({
      where: { accountId },
    });

    if (existing) {
      await this.sessionRepo.update(existing.id, {
        encryptedCreds: encrypted.ciphertext,
        iv: encrypted.iv,
        checksum: encrypted.checksum,
        version: existing.version + 1,
        isActive: isRegistered,
      });
    } else {
      await this.sessionRepo.save(
        this.sessionRepo.create({
          accountId,
          encryptedCreds: encrypted.ciphertext,
          iv: encrypted.iv,
          checksum: encrypted.checksum,
          isActive: isRegistered,
        }),
      );
    }

    // Invalidate Redis cache so next hydration fetches fresh data
    await this.redis.del(`hydrated:${accountId}`).catch(() => null);
    this.logger.log(`Session [${accountId}] persisted with all keys to database`);
  }

  /** Delete ephemeral session files from authDir */
  async cleanupEphemeralSession(accountId: string): Promise<void> {
    const authDir = this.getAuthDir(accountId);
    try {
      await fs.rm(authDir, { recursive: true, force: true });
      this.logger.debug(`Cleaned up session dir for ${accountId}`);
    } catch {
      // Ignore if directory doesn't exist
    }
  }

  /** Check whether an active session exists in DB for an account */
  async hasSession(accountId: string): Promise<boolean> {
    const record = await this.sessionRepo.findOne({
      where: { accountId, isActive: true },
    });
    return !!record;
  }

  /**
   * Mark the session record as inactive (isActive = false) so it is not
   * replayed on the next server restart after a deliberate logout/unlink.
   * Also purges the Redis cache for this account.
   */
  async invalidateSession(accountId: string): Promise<void> {
    try {
      await this.sessionRepo.update(
        { accountId },
        { isActive: false },
      );
      await this.redis.del(`hydrated:${accountId}`).catch(() => null);
      this.logger.log(`Session [${accountId}] invalidated (device logged out)`);
    } catch (err: any) {
      this.logger.warn(`Could not invalidate session for [${accountId}]: ${err.message}`);
    }
  }

  /**
   * Create an empty session directory for new accounts (QR flow).
   * Called when no existing session exists in DB.
   */
  async createEmptySession(accountId: string): Promise<HydrationResult> {
    const authDir = this.getAuthDir(accountId);
    
    // Ensure any stale/unlinked session directory is completely removed
    await fs.rm(authDir, { recursive: true, force: true }).catch(() => null);
    await fs.mkdir(authDir, { recursive: true });
    
    this.logger.log(`Created empty session directory for [${accountId}] - QR flow initiated`);
    
    return {
      accountId,
      authDir,
      hydratedAt: new Date(),
      fromCache: false,
    };
  }

  getAuthDir(accountId: string): string {
    const rawDir = this.config.get<string>('app.authTempDir', './data/sessions');
    // Always resolve to an absolute path anchored at process.cwd().
    // Never allow /tmp — that's ephemeral and wiped between deploys.
    let baseDir: string;
    if (path.isAbsolute(rawDir) && !rawDir.startsWith('/tmp')) {
      baseDir = rawDir;
    } else if (!path.isAbsolute(rawDir)) {
      // Relative path: resolve from project root, stripping leading ./
      baseDir = path.resolve(process.cwd(), rawDir.replace(/^\.\//, ''));
    } else {
      // Fell through (was /tmp or similar) — use the safe persistent default
      baseDir = path.resolve(process.cwd(), 'data', 'sessions');
    }
    return path.join(baseDir, accountId);
  }

  private async writeAuthFiles(authDir: string, authData: any) {
    if (authData?.__isArchive && authData.files) {
      for (const [filename, content] of Object.entries(authData.files)) {
        await fs.writeFile(path.join(authDir, filename), content as string, { mode: 0o600 });
      }
      return;
    }

    if (authData?.creds?.__isArchive && authData.creds.files) {
      for (const [filename, content] of Object.entries(authData.creds.files)) {
        await fs.writeFile(path.join(authDir, filename), content as string, { mode: 0o600 });
      }
      return;
    }

    // Fallback legacy support
    if (authData?.creds) {
      let credsToWrite = authData.creds;
      if (typeof credsToWrite === 'string') {
        try {
          const innerParsed = JSON.parse(credsToWrite);
          if (innerParsed?.__isArchive && innerParsed.files?.['creds.json']) {
            credsToWrite = innerParsed.files['creds.json'];
          }
        } catch {}
      } else if (credsToWrite?.__isArchive && credsToWrite.files?.['creds.json']) {
        credsToWrite = credsToWrite.files['creds.json'];
      }

      await fs.writeFile(
        path.join(authDir, 'creds.json'),
        typeof credsToWrite === 'string' ? credsToWrite : JSON.stringify(credsToWrite),
        { mode: 0o600 },
      );
    }

    if (authData?.keys) {
      await fs.writeFile(
        path.join(authDir, 'app-state-sync-key.json'),
        typeof authData.keys === 'string' ? authData.keys : JSON.stringify(authData.keys),
        { mode: 0o600 },
      );
    }
  }
}
