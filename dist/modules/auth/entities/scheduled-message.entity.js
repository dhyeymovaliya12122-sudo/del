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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledMessageEntity = exports.ScheduleRepeat = void 0;
const typeorm_1 = require("typeorm");
var ScheduleRepeat;
(function (ScheduleRepeat) {
    ScheduleRepeat["ONCE"] = "once";
    ScheduleRepeat["DAILY"] = "daily";
    ScheduleRepeat["WEEKLY"] = "weekly";
    ScheduleRepeat["MONTHLY"] = "monthly";
})(ScheduleRepeat || (exports.ScheduleRepeat = ScheduleRepeat = {}));
let ScheduledMessageEntity = class ScheduledMessageEntity {
};
exports.ScheduledMessageEntity = ScheduledMessageEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id' }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_jid' }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "toJid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'message_text', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "messageText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_path', nullable: true }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "mediaPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_type', nullable: true }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'caption', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "caption", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at', type: 'datetime' }),
    __metadata("design:type", Date)
], ScheduledMessageEntity.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'repeat_type', default: ScheduleRepeat.ONCE }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "repeatType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ScheduledMessageEntity.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], ScheduledMessageEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ScheduledMessageEntity.prototype, "createdAt", void 0);
exports.ScheduledMessageEntity = ScheduledMessageEntity = __decorate([
    (0, typeorm_1.Entity)('scheduled_messages')
], ScheduledMessageEntity);
//# sourceMappingURL=scheduled-message.entity.js.map