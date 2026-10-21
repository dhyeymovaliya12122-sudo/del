import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AutoReplyRuleEntity } from '../entities/auto-reply-rule.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { safeRegexTest } from '../../../common/utils/safe-regex.util';

@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);
  // Track recent auto-replies to avoid reply loops (chatJid → last reply timestamp)
  private readonly recentReplies = new Map<string, number>();

  constructor(
    @InjectRepository(AutoReplyRuleEntity)
    private readonly ruleRepo: Repository<AutoReplyRuleEntity>,
    private readonly baileysFactory: BaileysClientFactory,
  ) {}

  /** Called from messages.upsert handler for every incoming message */
  @OnEvent('auto-reply.check')
  async processIncomingMessage({ accountId, message }: { accountId: string; message: Partial<WhatsappMessageEntity> }) {
    if (message.fromMe) return; // Never auto-reply to own messages
    if (!message.text || !message.chatJid) return;

    const cacheKey = `${accountId}:${message.chatJid}`;
    const lastReply = this.recentReplies.get(cacheKey) || 0;
    const cooldown = 30_000; // 30 seconds between auto-replies to same chat

    if (Date.now() - lastReply < cooldown) return; // Still in cooldown

    const rules = await this.ruleRepo.find({
      where: { accountId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    for (const rule of rules) {
      if (!this.matchesRule(message.text, rule)) continue;
      if (!this.isWithinBusinessHours(rule)) continue;

      const client = this.baileysFactory.getClient(accountId);
      if (!client?.socket) continue;

      // Personalize the reply
      const replyText = rule.replyMessage
        .replace('{name}', message.senderJid?.split('@')[0] || 'there')
        .replace('{chat}', message.chatJid.split('@')[0]);

      try {
        await client.socket.sendMessage(message.chatJid, { text: replyText });
        this.recentReplies.set(cacheKey, Date.now());

        // Update match + reply counts
        await this.ruleRepo.update(rule.id, {
          matchCount: rule.matchCount + 1,
          replyCount: rule.replyCount + 1,
        });

        this.logger.log(`🤖 Auto-replied to ${message.chatJid} using rule "${rule.name}"`);
        break; // Only fire first matching rule
      } catch (err: any) {
        this.logger.error(`Auto-reply failed: ${err.message}`);
      }
    }
  }

  private matchesRule(text: string, rule: AutoReplyRuleEntity): boolean {
    const lowerText = text.toLowerCase();
    switch (rule.triggerType) {
      case 'any': return true;
      case 'keyword': return lowerText.includes((rule.triggerValue || '').toLowerCase());
      case 'contains': return lowerText.includes((rule.triggerValue || '').toLowerCase());
      case 'regex':
        return safeRegexTest(rule.triggerValue, text, 1000, 120);
      case 'new_contact': return true; // handled separately
      default: return false;
    }
  }

  private isWithinBusinessHours(rule: AutoReplyRuleEntity): boolean {
    if (!rule.onlyOutsideHours || !rule.businessHoursStart || !rule.businessHoursEnd) return true;
    const now = new Date();
    const [startH, startM] = rule.businessHoursStart.split(':').map(Number);
    const [endH, endM] = rule.businessHoursEnd.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    // Rule fires OUTSIDE business hours
    return nowMins < startMins || nowMins > endMins;
  }

  async createRule(data: Partial<AutoReplyRuleEntity>) {
    const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    return this.ruleRepo.save({ ...data, id, matchCount: 0, replyCount: 0 });
  }

  async getRules(accountId: string) {
    return this.ruleRepo.find({ where: { accountId }, order: { createdAt: 'ASC' } });
  }

  async updateRule(id: string, data: Partial<AutoReplyRuleEntity>) {
    await this.ruleRepo.update(id, data);
    return this.ruleRepo.findOne({ where: { id } });
  }

  async deleteRule(id: string) {
    await this.ruleRepo.delete(id);
    return { success: true };
  }

  async toggleRule(id: string) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) return;
    await this.ruleRepo.update(id, { isActive: !rule.isActive });
    return { id, isActive: !rule.isActive };
  }
}
