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
exports.ContactsController = void 0;
const common_1 = require("@nestjs/common");
const contacts_service_1 = require("../services/contacts.service");
let ContactsController = class ContactsController {
    constructor(contactsService) {
        this.contactsService = contactsService;
    }
    findAllGroups(accountId) {
        return this.contactsService.findAllGroups(accountId);
    }
    findGroup(id) {
        return this.contactsService.findGroup(id);
    }
    createGroup(dto) {
        return this.contactsService.createGroup(dto);
    }
    deleteGroup(id) {
        return this.contactsService.deleteGroup(id);
    }
    getMembers(id, search) {
        return this.contactsService.getMembers(id, search);
    }
    importMembers(id, members) {
        return this.contactsService.importMembers(id, members);
    }
    removeMember(id, phone) {
        return this.contactsService.removeMember(id, phone);
    }
};
exports.ContactsController = ContactsController;
__decorate([
    (0, common_1.Get)('groups'),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "findAllGroups", null);
__decorate([
    (0, common_1.Get)('groups/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "findGroup", null);
__decorate([
    (0, common_1.Post)('groups'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "createGroup", null);
__decorate([
    (0, common_1.Delete)('groups/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "deleteGroup", null);
__decorate([
    (0, common_1.Get)('groups/:id/members'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Post)('groups/:id/import'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('members')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "importMembers", null);
__decorate([
    (0, common_1.Delete)('groups/:id/members/:phone'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "removeMember", null);
exports.ContactsController = ContactsController = __decorate([
    (0, common_1.Controller)('contacts'),
    __metadata("design:paramtypes", [contacts_service_1.ContactsService])
], ContactsController);
//# sourceMappingURL=contacts.controller.js.map