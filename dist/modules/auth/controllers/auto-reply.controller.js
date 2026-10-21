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
exports.AutoReplyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const auto_reply_service_1 = require("../services/auto-reply.service");
let AutoReplyController = class AutoReplyController {
    constructor(autoReplyService, jwtService) {
        this.autoReplyService = autoReplyService;
        this.jwtService = jwtService;
    }
    getUser(auth) {
        if (!auth)
            throw new common_1.UnauthorizedException('No token');
        return this.jwtService.verify(auth.replace('Bearer ', ''));
    }
    async getRulesRoot(auth, accountId) {
        this.getUser(auth);
        return this.autoReplyService.getRules(accountId);
    }
    async getRules(auth, accountId) {
        this.getUser(auth);
        return this.autoReplyService.getRules(accountId);
    }
    async createRuleRoot(auth, body) {
        this.getUser(auth);
        return this.autoReplyService.createRule(body);
    }
    async createRule(auth, body) {
        this.getUser(auth);
        return this.autoReplyService.createRule(body);
    }
    async updateRuleById(auth, id, body) {
        this.getUser(auth);
        if (id === 'rules')
            throw new common_1.UnauthorizedException('Invalid route');
        return this.autoReplyService.updateRule(id, body);
    }
    async toggleRuleById(auth, id) {
        this.getUser(auth);
        return this.autoReplyService.toggleRule(id);
    }
    async updateRule(auth, id, body) {
        this.getUser(auth);
        return this.autoReplyService.updateRule(id, body);
    }
    async toggleRule(auth, id) {
        this.getUser(auth);
        return this.autoReplyService.toggleRule(id);
    }
    async deleteRuleById(auth, id) {
        this.getUser(auth);
        return this.autoReplyService.deleteRule(id);
    }
    async deleteRule(auth, id) {
        this.getUser(auth);
        return this.autoReplyService.deleteRule(id);
    }
};
exports.AutoReplyController = AutoReplyController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "getRulesRoot", null);
__decorate([
    (0, common_1.Get)('rules'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "createRuleRoot", null);
__decorate([
    (0, common_1.Post)('rules'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "createRule", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "updateRuleById", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "toggleRuleById", null);
__decorate([
    (0, common_1.Patch)('rules/:id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Post)('rules/:id/toggle'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "toggleRule", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "deleteRuleById", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutoReplyController.prototype, "deleteRule", null);
exports.AutoReplyController = AutoReplyController = __decorate([
    (0, common_1.Controller)('auto-reply'),
    __metadata("design:paramtypes", [auto_reply_service_1.AutoReplyService,
        jwt_1.JwtService])
], AutoReplyController);
//# sourceMappingURL=auto-reply.controller.js.map