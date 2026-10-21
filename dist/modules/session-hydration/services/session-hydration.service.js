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
var SessionHydrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionHydrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const session_sync_manager_1 = require("./session-sync.manager");
const baileys_client_factory_1 = require("../factories/baileys-client.factory");
const whatsapp_account_entity_1 = require("../entities/whatsapp-account.entity");
let SessionHydrationService = SessionHydrationService_1 = class SessionHydrationService {
    constructor(accountRepo, sessionSyncManager, baileysClientFactory, config) {
        this.accountRepo = accountRepo;
        this.sessionSyncManager = sessionSyncManager;
        this.baileysClientFactory = baileysClientFactory;
        this.config = config;
        this.logger = new common_1.Logger(SessionHydrationService_1.name);
    }
    async onApplicationBootstrap() {
        this.logger.log('🔄 Container boot: starting stateless session hydration…');
        const accounts = await this.accountRepo.find();
        const accountsToHydrate = [];
        for (const acc of accounts) {
            if (acc.status === 'banned')
                continue;
            if (acc.status === 'pending' && acc.phoneNumber?.startsWith('pending_'))
                continue;
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
        const results = await Promise.allSettled(accountsToHydrate.map((account) => this.hydrateAccount(account.id)));
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;
        this.logger.log(`✅ Hydration complete: ${succeeded} succeeded, ${failed} failed`);
    }
    async hydrateAccount(accountId) {
        try {
            let hydrationResult;
            try {
                hydrationResult = await this.sessionSyncManager.hydrateSession(accountId);
            }
            catch (error) {
                if (error.message?.includes('No active session found')) {
                    this.logger.log(`No existing session for [${accountId}]. Starting QR flow...`);
                    hydrationResult = await this.sessionSyncManager.createEmptySession(accountId);
                }
                else {
                    throw error;
                }
            }
            await this.baileysClientFactory.createClient(accountId, hydrationResult.authDir);
            this.logger.log(`✅ Account [${accountId}] connected via ${hydrationResult.fromCache ? 'CACHE' : 'DB'}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to hydrate account [${accountId}]: ${error.message}`);
            throw error;
        }
    }
    async terminateAccount(accountId, logout = false) {
        if (logout) {
            await this.baileysClientFactory.logoutClient(accountId);
        }
        else {
            await this.baileysClientFactory.destroyClient(accountId);
        }
        await this.sessionSyncManager.cleanupEphemeralSession(accountId);
        this.logger.log(`Account [${accountId}] terminated and ephemeral session cleaned (logout: ${logout})`);
    }
};
exports.SessionHydrationService = SessionHydrationService;
exports.SessionHydrationService = SessionHydrationService = SessionHydrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        session_sync_manager_1.SessionSyncManager,
        baileys_client_factory_1.BaileysClientFactory,
        config_1.ConfigService])
], SessionHydrationService);
//# sourceMappingURL=session-hydration.service.js.map