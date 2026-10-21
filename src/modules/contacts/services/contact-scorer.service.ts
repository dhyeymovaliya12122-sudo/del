// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/contacts/services/contact-scorer.service.ts         [F-12]
//
//  Calculates contact engagement score (0-100) based on:
//  - Recency: interaction within 7 days decays over time (max 30 pts)
//  - Engagement frequency: session count in memory (max 25 pts)
//  - Sentiment analysis: positive/neutral/negative memory tags (max 20 pts)
//  - Campaign response rate: read / replied delivery history (max 25 pts)
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMemoryEntity } from '../../chatbot/entities/conversation-memory.entity';
import { CampaignRecipientEntity } from '../../campaigns/entities/campaign-recipient.entity';
import { ContactGroupMemberEntity } from '../entities/contact-group-member.entity';

@Injectable()
export class ContactScorerService {
  private readonly logger = new Logger(ContactScorerService.name);

  constructor(
    @InjectRepository(ConversationMemoryEntity)
    private readonly memRepo: Repository<ConversationMemoryEntity>,
    @InjectRepository(CampaignRecipientEntity)
    private readonly recRepo: Repository<CampaignRecipientEntity>,
    @InjectRepository(ContactGroupMemberEntity)
    private readonly memberRepo: Repository<ContactGroupMemberEntity>,
  ) {}

  /**
   * Score an individual contact based on memory and past campaign engagement
   * Returns a clamped integer score between 0 and 100.
   */
  async scoreContact(accountId: string, senderJid: string): Promise<number> {
    const rawPhone = senderJid.split('@')[0];

    const [memory, deliveries] = await Promise.all([
      this.memRepo.findOne({ where: { accountId, senderJid } }).catch(() => null),
      this.recRepo.find({ where: { phoneNumber: rawPhone } }).catch(() => []),
    ]);

    let score = 0;

    // 1. Recency: last interaction within 7 days = high value (max 30 pts)
    if (memory?.updatedAt) {
      const daysSince = (Date.now() - new Date(memory.updatedAt).getTime()) / 86_400_000;
      score += Math.max(0, 30 - daysSince * 4); // max 30 pts, decays by 4/day
    }

    // 2. Engagement frequency: session count from conversation memory (max 25 pts)
    score += Math.min((memory?.sessionCount ?? 0) * 5, 25);

    // 3. Sentiment from memory keyFacts (max 20 pts)
    const sentiment = (memory?.keyFacts as any)?.sentiment;
    if (sentiment === 'positive') score += 20;
    else if (sentiment === 'neutral') score += 10;

    // 4. Campaign delivery history (max 25 pts)
    if (deliveries.length > 0) {
      const reads = deliveries.filter(d => ['read', 'replied'].includes(d.status)).length;
      score += (reads / deliveries.length) * 25;
    }

    const finalScore = Math.min(Math.max(Math.round(score), 0), 100);
    this.logger.debug(`[ContactScorer] Scored ${senderJid}: ${finalScore}/100`);
    return finalScore;
  }

  /**
   * Batch score entire contact group and persist scores to member metadata
   */
  async scoreGroup(accountId: string, groupId: string): Promise<{ updated: number }> {
    const members = await this.memberRepo.find({ where: { groupId } });
    let updated = 0;

    for (const member of members) {
      const jid = `${member.phoneNumber}@s.whatsapp.net`;
      const score = await this.scoreContact(accountId, jid);
      await this.updateContactScore(member.id, score);
      updated++;
    }

    this.logger.log(`[ContactScorer] Scored ${updated} contacts in group ${groupId}`);
    return { updated };
  }

  /**
   * Persist calculated score into member customFields
   */
  async updateContactScore(memberId: string, score: number): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) return;

    let fields: Record<string, any> = {};
    try {
      fields = JSON.parse(member.customFields || '{}');
    } catch {
      fields = {};
    }

    fields.engagementScore = score;
    fields.scoredAt = new Date().toISOString();

    await this.memberRepo.update(memberId, {
      customFields: JSON.stringify(fields),
    });
  }
}
