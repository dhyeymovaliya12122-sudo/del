import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledMessageEntity, ScheduleRepeat } from '../entities/scheduled-message.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(ScheduledMessageEntity)
    private readonly scheduledRepo: Repository<ScheduledMessageEntity>,
    private readonly baileysFactory: BaileysClientFactory,
  ) {}

  /** Runs every minute to check and send due scheduled messages */
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueMessages() {
    const now = new Date();
    const due = await this.scheduledRepo.find({
      where: {
        status: 'pending',
        scheduledAt: LessThanOrEqual(now),
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

        // Mark as sent
        await this.scheduledRepo.update(msg.id, {
          status: 'sent',
          sentAt: new Date(),
        });

        // If repeating, schedule next occurrence
        if (msg.repeatType !== ScheduleRepeat.ONCE) {
          const nextDate = new Date(msg.scheduledAt);
          if (msg.repeatType === ScheduleRepeat.DAILY) nextDate.setDate(nextDate.getDate() + 1);
          if (msg.repeatType === ScheduleRepeat.WEEKLY) nextDate.setDate(nextDate.getDate() + 7);
          if (msg.repeatType === ScheduleRepeat.MONTHLY) nextDate.setMonth(nextDate.getMonth() + 1);

          await this.scheduledRepo.save({
            ...msg,
            id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            status: 'pending',
            sentAt: null,
            scheduledAt: nextDate,
          });
        }

        this.logger.log(`✅ Sent scheduled message to ${msg.toJid} for account ${msg.accountId}`);
      } catch (err: any) {
        this.logger.error(`Failed to send scheduled message ${msg.id}: ${err.message}`);
        await this.scheduledRepo.update(msg.id, { status: 'failed' });
      }
    }
  }

  async createScheduledMessage(data: {
    accountId: string;
    toJid: string;
    messageText?: string;
    scheduledAt: Date;
    repeatType?: ScheduleRepeat;
    caption?: string;
  }) {
    const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return this.scheduledRepo.save({
      id,
      accountId: data.accountId,
      toJid: data.toJid,
      messageText: data.messageText || '',
      scheduledAt: data.scheduledAt,
      repeatType: data.repeatType || ScheduleRepeat.ONCE,
      caption: data.caption,
      status: 'pending',
    });
  }

  async getScheduledMessages(accountId: string) {
    return this.scheduledRepo.find({
      where: { accountId },
      order: { scheduledAt: 'ASC' },
    });
  }

  async cancelScheduledMessage(id: string, accountId: string) {
    await this.scheduledRepo.update({ id, accountId }, { status: 'cancelled' });
    return { success: true };
  }

  async deleteScheduledMessage(id: string, accountId: string) {
    await this.scheduledRepo.delete({ id, accountId });
    return { success: true };
  }
}
