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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappWebController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const throttler_1 = require("@nestjs/throttler");
const whatsapp_web_service_1 = require("../services/whatsapp-web.service");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const account_isolation_guard_1 = require("../../../common/guards/account-isolation.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
let WhatsappWebController = class WhatsappWebController {
    constructor(whatsappWebService) {
        this.whatsappWebService = whatsappWebService;
    }
    async getChats(accountId, search, limit, offset, startDate, endDate) {
        if (!accountId)
            throw new common_1.BadRequestException('accountId is required');
        return this.whatsappWebService.getChats(accountId, search, limit ? parseInt(limit, 10) : 500, offset ? parseInt(offset, 10) : 0, startDate, endDate);
    }
    async getMessages(jid, accountId, limit, startDate, endDate, search, ghostMode, ghostHeader) {
        if (!accountId)
            throw new common_1.BadRequestException('accountId is required');
        const isGhost = ghostMode === 'true' || ghostHeader === 'true';
        return this.whatsappWebService.getMessages(accountId, jid, limit ? parseInt(limit, 10) : 100, startDate, endDate, search, isGhost);
    }
    async clearChatMessages(jid, accountId) {
        if (!accountId)
            throw new common_1.BadRequestException('accountId is required');
        return this.whatsappWebService.clearChatMessages(accountId, jid);
    }
    async getContacts(accountId, search) {
        if (!accountId)
            throw new common_1.BadRequestException('accountId is required');
        return this.whatsappWebService.getContacts(accountId, search);
    }
    async getMedia(accountId, filename, customName, download, res) {
        return this.whatsappWebService.streamMedia(accountId, filename, res, customName, download === '1' || download === 'true');
    }
    async sendMessage(body) {
        return this.whatsappWebService.sendMessage(body.accountId, body.to, body.text, body.quotedMsgId);
    }
    async sendVoice(body) {
        const base64Clean = body.base64Data.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Clean, 'base64');
        return this.whatsappWebService.sendVoiceNote(body.accountId, body.to, buffer, body.quotedMsgId);
    }
    async sendReaction(body) {
        return this.whatsappWebService.sendReaction(body.accountId, body.to, body.messageId, body.emoji, body.fromMe);
    }
    async sendMedia(file, body) {
        let buffer;
        let fileName;
        let mimeType;
        const blockedExtensions = /\.(exe|bat|cmd|sh|php|cgi|jar|vbs|msi|scr|com|pif)$/i;
        if (file && file.buffer) {
            buffer = file.buffer;
            fileName = body.fileName || file.originalname || 'attachment';
            mimeType = body.mimeType || file.mimetype || 'application/octet-stream';
        }
        else if (body.base64Data) {
            const base64Clean = body.base64Data.replace(/^data:[^;]+;base64,/, '');
            buffer = Buffer.from(base64Clean, 'base64');
            if (buffer.length > 50 * 1024 * 1024) {
                throw new common_1.BadRequestException('Media payload exceeds 50MB limit.');
            }
            fileName = body.fileName || 'attachment';
            if (blockedExtensions.test(fileName)) {
                throw new common_1.BadRequestException('Executable or script files are forbidden.');
            }
            mimeType = body.mimeType || 'application/octet-stream';
        }
        else {
            throw new common_1.BadRequestException('No file or base64Data provided for media message.');
        }
        return this.whatsappWebService.sendMedia(body.accountId, body.to, buffer, fileName, mimeType, body.caption);
    }
    async cleanDemoAccounts() {
        return this.whatsappWebService.cleanDemoAccounts();
    }
    async getQR(accountId) {
        return this.whatsappWebService.getQR(accountId);
    }
    async startQR(body) {
        return this.whatsappWebService.startQR(body.accountId, body.force);
    }
    async syncAll(body) {
        return this.whatsappWebService.syncAll(body.accountId);
    }
    async reconnect(body) {
        return this.whatsappWebService.reconnect(body.accountId);
    }
    async logout(body, req) {
        const who = body.disconnectedBy || req?.user?.displayName || req?.user?.username || 'Super Admin / Web User';
        return this.whatsappWebService.logout(body.accountId, who);
    }
    async saveChat(body) {
        return this.whatsappWebService.saveChat(body.accountId, body);
    }
    async syncChat(jid, body) {
        return this.whatsappWebService.syncChatMessages(body.accountId, jid, body.count || 25);
    }
    async flushAccount(body) {
        return this.whatsappWebService.flushAccount(body.accountId);
    }
    async repairMedia(body) {
        return this.whatsappWebService.repairMedia(body.accountId);
    }
};
exports.WhatsappWebController = WhatsappWebController;
__decorate([
    (0, common_1.Get)('chats'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "getChats", null);
__decorate([
    (0, common_1.Get)('chats/:jid/messages'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Param)('jid')),
    __param(1, (0, common_1.Query)('accountId')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('search')),
    __param(6, (0, common_1.Query)('ghostMode')),
    __param(7, (0, common_1.Headers)('x-ghost-mode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Delete)('chats/:jid/messages'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Param)('jid')),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "clearChatMessages", null);
__decorate([
    (0, common_1.Get)('contacts'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Get)('media/:accountId/:filename'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Query)('name')),
    __param(3, (0, common_1.Query)('download')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "getMedia", null);
__decorate([
    (0, common_1.Post)('messages/send'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('messages/send-voice'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "sendVoice", null);
__decorate([
    (0, common_1.Post)('messages/react'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "sendReaction", null);
__decorate([
    (0, common_1.Post)('messages/send-media'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 50 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const blockedExtensions = /\.(exe|bat|cmd|sh|php|cgi|jar|vbs|msi|scr|com|pif)$/i;
            if (blockedExtensions.test(file.originalname)) {
                return cb(new common_1.BadRequestException('Executable or script files are forbidden.'), false);
            }
            cb(null, true);
        },
    })),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "sendMedia", null);
__decorate([
    (0, common_1.Post)('clean-demo'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "cleanDemoAccounts", null);
__decorate([
    (0, common_1.Get)('qr/:accountId'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "getQR", null);
__decorate([
    (0, common_1.Post)('qr'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "startQR", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "syncAll", null);
__decorate([
    (0, common_1.Post)('reconnect'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "reconnect", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('chats'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "saveChat", null);
__decorate([
    (0, common_1.Post)('chats/:jid/sync'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('jid')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "syncChat", null);
__decorate([
    (0, common_1.Post)('flush'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "flushAccount", null);
__decorate([
    (0, common_1.Post)('media/repair'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappWebController.prototype, "repairMedia", null);
exports.WhatsappWebController = WhatsappWebController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_web_service_1.WhatsappWebService])
], WhatsappWebController);
//# sourceMappingURL=whatsapp-web.controller.js.map