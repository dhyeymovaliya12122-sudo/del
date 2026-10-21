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
var AccountIsolationGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountIsolationGuard = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const whatsapp_account_entity_1 = require("../../modules/session-hydration/entities/whatsapp-account.entity");
const user_account_access_entity_1 = require("../../modules/auth/entities/user-account-access.entity");
let AccountIsolationGuard = AccountIsolationGuard_1 = class AccountIsolationGuard {
    constructor(jwtService, accountRepo, accessRepo) {
        this.jwtService = jwtService;
        this.accountRepo = accountRepo;
        this.accessRepo = accessRepo;
        this.logger = new common_1.Logger(AccountIsolationGuard_1.name);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const accountId = request.query?.accountId ||
            request.params?.accountId ||
            request.body?.accountId;
        if (!accountId) {
            throw new common_1.BadRequestException('accountId is required. Global selects across all accounts are not permitted.');
        }
        if (accountId === 'all') {
            const user = request.user;
            if (!user || user.role !== 'SUPER_ADMIN') {
                throw new common_1.ForbiddenException('Only Super Admins may view the universal all-accounts stream.');
            }
            return true;
        }
        let account = null;
        try {
            account = await this.accountRepo.findOne({ where: { id: accountId } });
        }
        catch (err) {
            this.logger.error(`Database error verifying account ${accountId}: ${err.message}`);
        }
        if (!account) {
            throw new common_1.BadRequestException(`Account with id "${accountId}" does not exist.`);
        }
        const user = request.user;
        if (!user || user.role === 'SUPER_ADMIN') {
            return true;
        }
        let access = null;
        try {
            access = await this.accessRepo.findOne({
                where: { accountId, userId: user.sub || user.id },
            });
        }
        catch (err) {
            this.logger.error(`Database error checking user ${user.sub || user.id} access to ${accountId}: ${err.message}`);
        }
        if (!access) {
            this.logger.warn(`SECURITY: User ${user.sub || user.id} (role: ${user.role}) attempted to access account ${accountId} without permission.`);
            throw new common_1.ForbiddenException(`You do not have permission to access account ${accountId}. Contact your administrator.`);
        }
        return true;
    }
};
exports.AccountIsolationGuard = AccountIsolationGuard;
exports.AccountIsolationGuard = AccountIsolationGuard = AccountIsolationGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(user_account_access_entity_1.UserAccountAccessEntity)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AccountIsolationGuard);
//# sourceMappingURL=account-isolation.guard.js.map