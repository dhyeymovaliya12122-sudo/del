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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const app_user_entity_1 = require("../entities/app-user.entity");
const password_reset_entity_1 = require("../entities/password-reset.entity");
const user_account_access_entity_1 = require("../entities/user-account-access.entity");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepo, accessRepo, accountRepo, resetRepo, jwtService) {
        this.userRepo = userRepo;
        this.accessRepo = accessRepo;
        this.accountRepo = accountRepo;
        this.resetRepo = resetRepo;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async onModuleInit() {
        try {
            await this.userRepo.query(`ALTER TABLE app_users ADD COLUMN email varchar`);
            this.logger.log('✅ Added email column to app_users successfully.');
        }
        catch (e) {
            const msg = (e.message || '').toLowerCase();
            if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
                this.logger.warn(`Email column check: ${e.message}`);
            }
        }
        try {
            const isProd = process.env.NODE_ENV === 'production';
            let initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;
            if (!initialPassword) {
                if (isProd) {
                    initialPassword = crypto.randomBytes(16).toString('hex');
                    this.logger.error(`🚨 [SECURITY] Generated secure random Super Admin password for initial launch: ${initialPassword} — Please change this immediately after logging in!`);
                }
                else {
                    initialPassword = 'changeme';
                }
            }
            const superAdminExists = await this.userRepo.findOne({ where: { username: 'superadmin' } });
            if (!superAdminExists) {
                const hash = await bcrypt.hash(initialPassword, 10);
                await this.userRepo.save({
                    id: 'superadmin',
                    username: 'superadmin',
                    passwordHash: hash,
                    role: app_user_entity_1.UserRole.SUPER_ADMIN,
                    displayName: 'Super Admin',
                    isActive: true,
                });
                if (isProd && !process.env.SUPERADMIN_INITIAL_PASSWORD) {
                    this.logger.warn('⚠️  [SECURITY WARNING] Super Admin initialized with auto-generated secure random password.');
                }
                else {
                    this.logger.log(`✅ Default Super Admin created: superadmin (${initialPassword === 'changeme' ? 'changeme' : '[CONFIGURED]'})`);
                }
            }
            await this.userRepo.delete({ username: 'testadmin' }).catch(() => null);
            await this.userRepo.delete({ username: 'testadmin2' }).catch(() => null);
            await this.userRepo.delete({ username: 'testadmintestadmin2' }).catch(() => null);
            await this.userRepo.delete({ username: 'sales_admin' }).catch(() => null);
        }
        catch (err) {
            this.logger.error(`Failed seeding admins: ${err.message}`);
        }
    }
    async login(username, password) {
        if (typeof username !== 'string' || typeof password !== 'string') {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const cleanUsername = username?.trim();
        if (!cleanUsername || !password || password.length > 128) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        let user = await this.userRepo
            .createQueryBuilder('user')
            .where('LOWER(user.username) = LOWER(:username)', { username: cleanUsername })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .getOne();
        if (!user && (cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'superadmin')) {
            user = await this.userRepo.findOne({ where: { role: app_user_entity_1.UserRole.SUPER_ADMIN, isActive: true } });
        }
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            jti: crypto.randomUUID(),
        };
        const token = this.jwtService.sign(payload);
        const accountIds = await this.getAccessibleAccountIds(user.id, user.role);
        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                accountIds,
            },
        };
    }
    verifyToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    async getMe(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const accountIds = await this.getAccessibleAccountIds(userId, user.role);
        return { id: user.id, username: user.username, role: user.role, displayName: user.displayName, accountIds };
    }
    async createAdmin(username, password, displayName) {
        if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
            throw new common_1.BadRequestException('Password must be between 8 and 128 characters');
        }
        const existing = await this.userRepo.findOne({ where: { username } });
        if (existing)
            throw new common_1.ConflictException(`Username "${username}" already exists`);
        const hash = await bcrypt.hash(password, 10);
        const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const user = await this.userRepo.save({
            id, username, passwordHash: hash,
            role: app_user_entity_1.UserRole.ADMIN,
            displayName: displayName || username,
            isActive: true,
        });
        this.logger.log(`✅ Admin created: ${username}`);
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            isActive: user.isActive,
            accountIds: [],
        };
    }
    async deleteAdmin(userId) {
        let user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            user = await this.userRepo.findOne({ where: { username: userId } });
        }
        if (!user) {
            await this.accessRepo.delete({ userId });
            return { success: true, message: 'Admin deleted' };
        }
        if (user.role === app_user_entity_1.UserRole.SUPER_ADMIN) {
            throw new common_1.BadRequestException('Cannot delete Super Admin account');
        }
        await this.accessRepo.delete({ userId: user.id });
        await this.userRepo.delete(user.id);
        this.logger.log(`🗑️ Admin deleted: ${user.username} (${user.id})`);
        return { success: true, message: `Admin ${user.username} deleted` };
    }
    async assignAccountToAdmin(userId, accountId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        const previousAssignment = await this.accessRepo.findOne({ where: { accountId } });
        let reassignedFrom = null;
        if (previousAssignment && previousAssignment.userId !== userId) {
            const prevAdmin = await this.userRepo.findOne({ where: { id: previousAssignment.userId } });
            reassignedFrom = prevAdmin?.username || previousAssignment.userId;
            this.logger.warn(`Account [${accountId}] was allocated to admin [${reassignedFrom}]. Reallocating exclusively to [${user.username}].`);
        }
        await this.accessRepo.delete({ accountId });
        await this.accessRepo.save({ userId, accountId });
        const accountLabel = account.displayName || account.phoneNumber || accountId;
        const msg = reassignedFrom
            ? `Account ${accountLabel} transferred exclusively to ${user.username} (removed from ${reassignedFrom})`
            : `Account ${accountLabel} allocated exclusively to ${user.username}`;
        this.logger.log(`✅ [Allocation] ${msg}`);
        return { success: true, message: msg };
    }
    async revokeAccountAccess(userId, accountId) {
        await this.accessRepo.delete({ userId, accountId });
        return { success: true };
    }
    async getAllAdmins() {
        const users = await this.userRepo.find();
        const allAccounts = await this.accountRepo.find();
        const result = await Promise.all(users.map(async (user) => {
            let accountIds = [];
            if (user.role === app_user_entity_1.UserRole.SUPER_ADMIN) {
                accountIds = allAccounts.map(a => a.id);
            }
            else {
                const accesses = await this.accessRepo.find({ where: { userId: user.id } });
                accountIds = accesses.map(a => a.accountId);
            }
            const accounts = allAccounts.filter(a => accountIds.includes(a.id));
            return {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                isActive: user.isActive,
                accountIds,
                accounts: accounts.map(a => ({
                    id: a.id,
                    phoneNumber: a.phoneNumber,
                    displayName: a.displayName,
                    status: a.status,
                })),
            };
        }));
        return result;
    }
    async getAccountsWithAdmins() {
        const accounts = await this.accountRepo.find();
        const result = await Promise.all(accounts.map(async (account) => {
            const access = await this.accessRepo.findOne({ where: { accountId: account.id } });
            let admin = null;
            if (access) {
                admin = await this.userRepo.findOne({ where: { id: access.userId } });
            }
            return {
                ...account,
                assignedAdmin: admin ? { id: admin.id, username: admin.username, displayName: admin.displayName } : null,
            };
        }));
        return result;
    }
    async updatePassword(userId, newPassword) {
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
            throw new common_1.BadRequestException('Password must be between 8 and 128 characters');
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.update(userId, { passwordHash: hash });
        return { success: true };
    }
    async toggleAdminStatus(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.userRepo.update(userId, { isActive: !user.isActive });
        return { id: user.id, isActive: !user.isActive };
    }
    async getAccessibleAccountIds(userId, role) {
        if (role === app_user_entity_1.UserRole.SUPER_ADMIN) {
            const all = await this.accountRepo.find();
            return all.map(a => a.id);
        }
        const accesses = await this.accessRepo.find({ where: { userId } });
        return accesses.map(a => a.accountId);
    }
    async forgotPassword(identity) {
        const clean = identity?.trim();
        if (!clean)
            return;
        const user = await this.userRepo
            .createQueryBuilder('user')
            .where('LOWER(user.username) = LOWER(:identity)', { identity: clean })
            .orWhere('LOWER(user.email) = LOWER(:identity)', { identity: clean })
            .getOne();
        if (!user)
            return;
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await this.resetRepo.delete({ userId: user.id });
        await this.resetRepo.save({ tokenHash, userId: user.id, expiresAt });
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
            this.logger.log(`[DEV ONLY] Token for ${user.username}: ${rawToken}`);
            try {
                const filePath = path.join(process.cwd(), '.dev-token.json');
                fs.writeFileSync(filePath, JSON.stringify({ token: rawToken, username: user.username }));
            }
            catch (e) {
                this.logger.error('Could not write automated dev token file', e);
            }
        }
        else {
            this.logger.log(`Password reset token generated securely for user ID: ${user.id}`);
        }
    }
    async resetPassword(token, newPassword) {
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
            throw new common_1.BadRequestException('Password must be between 8 and 128 characters');
        }
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const resetRecord = await this.resetRepo.findOne({ where: { tokenHash } });
        if (!resetRecord || resetRecord.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.update({ id: resetRecord.userId }, { passwordHash });
        await this.resetRepo.delete({ userId: resetRecord.userId });
        try {
            const filePath = path.join(process.cwd(), '.dev-token.json');
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (e) {
            this.logger.error('Could not clean up automated dev token file', e);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(app_user_entity_1.AppUserEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(user_account_access_entity_1.UserAccountAccessEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(password_reset_entity_1.PasswordResetEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map