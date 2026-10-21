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
exports.ChatbotController = void 0;
const common_1 = require("@nestjs/common");
const chatbot_service_1 = require("../services/chatbot.service");
let ChatbotController = class ChatbotController {
    constructor(chatbotService) {
        this.chatbotService = chatbotService;
    }
    findAll(accountId) {
        return this.chatbotService.findAll(accountId);
    }
    findOne(id) {
        return this.chatbotService.findOne(id);
    }
    create(dto) {
        return this.chatbotService.create(dto);
    }
    update(id, dto) {
        return this.chatbotService.update(id, dto);
    }
    delete(id) {
        return this.chatbotService.delete(id);
    }
    toggleActive(id) {
        return this.chatbotService.toggleActive(id);
    }
    testFlow(id, message) {
        return this.chatbotService.testFlow(id, message);
    }
};
exports.ChatbotController = ChatbotController;
__decorate([
    (0, common_1.Get)('flows'),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('flows/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('flows'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('flows/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('flows/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('flows/:id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "toggleActive", null);
__decorate([
    (0, common_1.Post)('flows/:id/test'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ChatbotController.prototype, "testFlow", null);
exports.ChatbotController = ChatbotController = __decorate([
    (0, common_1.Controller)('chatbot'),
    __metadata("design:paramtypes", [chatbot_service_1.ChatbotService])
], ChatbotController);
//# sourceMappingURL=chatbot.controller.js.map