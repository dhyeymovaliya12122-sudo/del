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
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const scheduled_message_entity_1 = require("../entities/scheduled-message.entity");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    constructor(scheduledRepo, baileysFactory) {
        this.scheduledRepo = scheduledRepo;
        this.baileysFactory = baileysFactory;
        this.logger = new common_1.Logger(SchedulerService_1.name);
    }
    async processDueMessages() {
        const now = new Date();
        const due = await this.scheduledRepo.find({
            where: {
                status: 'pending',
                scheduledAt: (0, typeorm_2.LessThanOrEqual)(now),
            },
        });
        for (const msg of due) {
            try {
                const client = this.baileysFactory.getClient(msg.accountId);
                if (!client?.socket) {
                    this.logger.warn(`Account ${msg.accountId} not connected for scheduled message`);
                    continue;
                }
                await client.socket.sendMessage(msg.toJid, { text: msg.messageText });
                await this.scheduledRepo.update(msg.id, {
                    status: 'sent',
                    sentAt: new Date(),
                });
                if (msg.repeatType !== scheduled_message_entity_1.ScheduleRepeat.ONCE) {
                    const nextDate = new Date(msg.scheduledAt);
                    if (msg.repeatType === scheduled_message_entity_1.ScheduleRepeat.DAILY)
                        nextDate.setDate(nextDate.getDate() + 1);
                    if (msg.repeatType === scheduled_message_entity_1.ScheduleRepeat.WEEKLY)
                        nextDate.setDate(nextDate.getDate() + 7);
                    if (msg.repeatType === scheduled_message_entity_1.ScheduleRepeat.MONTHLY)
                        nextDate.setMonth(nextDate.getMonth() + 1);
                    await this.scheduledRepo.save({
                        ...msg,
                        id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                        status: 'pending',
                        sentAt: null,
                        scheduledAt: nextDate,
                    });
                }
                this.logger.log(`✅ Sent scheduled message to ${msg.toJid} for account ${msg.accountId}`);
            }
            catch (err) {
                this.logger.error(`Failed to send scheduled message ${msg.id}: ${err.message}`);
                await this.scheduledRepo.update(msg.id, { status: 'failed' });
            }
        }
    }
    async createScheduledMessage(data) {
        const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        return this.scheduledRepo.save({
            id,
            accountId: data.accountId,
            toJid: data.toJid,
            messageText: data.messageText || '',
            scheduledAt: data.scheduledAt,
            repeatType: data.repeatType || scheduled_message_entity_1.ScheduleRepeat.ONCE,
            caption: data.caption,
            status: 'pending',
        });
    }
    async getScheduledMessages(accountId) {
        return this.scheduledRepo.find({
            where: { accountId },
            order: { scheduledAt: 'ASC' },
        });
    }
    async cancelScheduledMessage(id, accountId) {
        await this.scheduledRepo.update({ id, accountId }, { status: 'cancelled' });
        return { success: true };
    }
    async deleteScheduledMessage(id, accountId) {
        await this.scheduledRepo.delete({ id, accountId });
        return { success: true };
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "processDueMessages", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scheduled_message_entity_1.ScheduledMessageEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        baileys_client_factory_1.BaileysClientFactory])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map