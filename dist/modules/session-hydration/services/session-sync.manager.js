"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SessionSyncManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSyncManager = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const fs = require("fs/promises");
const path = require("path");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const session_auth_entity_1 = require("../entities/session-auth.entity");
const session_crypto_service_1 = require("./session-crypto.service");
let SessionSyncManager = SessionSyncManager_1 = class SessionSyncManager {
    constructor(sessionRepo, redis, cryptoService, config) {
        this.sessionRepo = sessionRepo;
        this.redis = redis;
        this.cryptoService = cryptoService;
        this.config = config;
        this.logger = new common_1.Logger(SessionSyncManager_1.name);
    }
    async hydrateSession(accountId) {
        const authDir = this.getAuthDir(accountId);
        const cacheKey = `hydrated:${accountId}`;
        const ttl = this.config.get('redis.ttlSeconds', 3600);
        const cachedStr = await this.redis.get(cacheKey);
        if (cachedStr) {
            try {
                const cachedEncrypted = JSON.parse(cachedStr);
                const decryptedCache = this.cryptoService.decrypt(cachedEncrypted);
                await fs.mkdir(authDir, { recursive: true });
                await this.writeAuthFiles(authDir, JSON.parse(decryptedCache));
                this.logger.log(`Session [${accountId}] hydrated from REDIS cache`);
                return { accountId, authDir, hydratedAt: new Date(), fromCache: true };
            }
            catch (err) {
                this.logger.warn(`Redis cache decryption failed for ${accountId}, falling back to Postgres`);
            }
        }
        const sessionRecord = await this.sessionRepo.findOne({
            where: { accountId, isActive: true },
        });
        if (!sessionRecord) {
            throw new common_1.NotFoundException(`No active session found in DB for account ${accountId}`);
        }
        const decryptedCreds = this.cryptoService.decrypt({
            ciphertext: sessionRecord.encryptedCreds,
            iv: sessionRecord.iv,
            checksum: sessionRecord.checksum,
        });
        let decryptedKeys = null;
        if (sessionRecord.encryptedKeys) {
            decryptedKeys = this.cryptoService.decrypt({
                ciphertext: sessionRecord.encryptedKeys,
                iv: sessionRecord.iv,
                checksum: sessionRecord.checksum,
            });
        }
        const parsed = JSON.parse(decryptedCreds);
        let authData;
        if (parsed && (parsed.__isArchive || parsed.files)) {
            authData = parsed;
        }
        else {
            authData = {
                creds: parsed,
                keys: decryptedKeys ? JSON.parse(decryptedKeys) : null,
            };
        }
        await fs.mkdir(authDir, { recursive: true });
        await this.writeAuthFiles(authDir, authData);
        const cacheEncrypted = this.cryptoService.encrypt(JSON.stringify(authData));
        await this.redis.set(cacheKey, JSON.stringify(cacheEncrypted), 'EX', ttl);
        await this.sessionRepo.update(sessionRecord.id, { hydratedAt: new Date() });
        this.logger.log(`Session [${accountId}] hydrated from POSTGRESQL → /tmp`);
        return { accountId, authDir, hydratedAt: new Date(), fromCache: false };
    }
    async persistSession(accountId, authData) {
        const authDir = this.getAuthDir(accountId);
        let payloadToSave = authData;
        try {
            const files = await fs.readdir(authDir);
            const fileMap = {};
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fileMap[file] = await fs.readFile(path.join(authDir, file), 'utf8');
                }
            }
            if (Object.keys(fileMap).length > 0) {
                payloadToSave = { __isArchive: true, files: fileMap };
            }
        }
        catch {
        }
        let isRegistered = false;
        try {
            const credsRaw = payloadToSave?.files?.['creds.json'] || (payloadToSave?.creds ? JSON.stringify(payloadToSave.creds) : null);
            if (credsRaw) {
                const parsed = JSON.parse(credsRaw);
                if (parsed?.registered === true && parsed?.me?.id) {
                    isRegistered = true;
                }
            }
        }
        catch { }
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
        }
        else {
            await this.sessionRepo.save(this.sessionRepo.create({
                accountId,
                encryptedCreds: encrypted.ciphertext,
                iv: encrypted.iv,
                checksum: encrypted.checksum,
                isActive: isRegistered,
            }));
        }
        await this.redis.del(`hydrated:${accountId}`).catch(() => null);
        this.logger.log(`Session [${accountId}] persisted with all keys to database`);
    }
    async cleanupEphemeralSession(accountId) {
        const authDir = this.getAuthDir(accountId);
        try {
            await fs.rm(authDir, { recursive: true, force: true });
            this.logger.debug(`Cleaned up session dir for ${accountId}`);
        }
        catch {
        }
    }
    async hasSession(accountId) {
        const record = await this.sessionRepo.findOne({
            where: { accountId, isActive: true },
        });
        return !!record;
    }
    async invalidateSession(accountId) {
        try {
            await this.sessionRepo.update({ accountId }, { isActive: false });
            await this.redis.del(`hydrated:${accountId}`).catch(() => null);
            this.logger.log(`Session [${accountId}] invalidated (device logged out)`);
        }
        catch (err) {
            this.logger.warn(`Could not invalidate session for [${accountId}]: ${err.message}`);
        }
    }
    async createEmptySession(accountId) {
        const authDir = this.getAuthDir(accountId);
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
    getAuthDir(accountId) {
        const rawDir = this.config.get('app.authTempDir', './data/sessions');
        let baseDir;
        if (path.isAbsolute(rawDir) && !rawDir.startsWith('/tmp')) {
            baseDir = rawDir;
        }
        else if (!path.isAbsolute(rawDir)) {
            baseDir = path.resolve(process.cwd(), rawDir.replace(/^\.\//, ''));
        }
        else {
            baseDir = path.resolve(process.cwd(), 'data', 'sessions');
        }
        return path.join(baseDir, accountId);
    }
    async writeAuthFiles(authDir, authData) {
        if (authData?.__isArchive && authData.files) {
            for (const [filename, content] of Object.entries(authData.files)) {
                await fs.writeFile(path.join(authDir, filename), content, { mode: 0o600 });
            }
            return;
        }
        if (authData?.creds?.__isArchive && authData.creds.files) {
            for (const [filename, content] of Object.entries(authData.creds.files)) {
                await fs.writeFile(path.join(authDir, filename), content, { mode: 0o600 });
            }
            return;
        }
        if (authData?.creds) {
            let credsToWrite = authData.creds;
            if (typeof credsToWrite === 'string') {
                try {
                    const innerParsed = JSON.parse(credsToWrite);
                    if (innerParsed?.__isArchive && innerParsed.files?.['creds.json']) {
                        credsToWrite = innerParsed.files['creds.json'];
                    }
                }
                catch { }
            }
            else if (credsToWrite?.__isArchive && credsToWrite.files?.['creds.json']) {
                credsToWrite = credsToWrite.files['creds.json'];
            }
            await fs.writeFile(path.join(authDir, 'creds.json'), typeof credsToWrite === 'string' ? credsToWrite : JSON.stringify(credsToWrite), { mode: 0o600 });
        }
        if (authData?.keys) {
            await fs.writeFile(path.join(authDir, 'app-state-sync-key.json'), typeof authData.keys === 'string' ? authData.keys : JSON.stringify(authData.keys), { mode: 0o600 });
        }
    }
};
exports.SessionSyncManager = SessionSyncManager;
exports.SessionSyncManager = SessionSyncManager = SessionSyncManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_auth_entity_1.SessionAuthEntity)),
    __param(1, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ioredis_1.Redis,
        session_crypto_service_1.SessionCryptoService,
        config_1.ConfigService])
], SessionSyncManager);
//# sourceMappingURL=session-sync.manager.js.map