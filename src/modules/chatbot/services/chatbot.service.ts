import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotFlowEntity } from '../entities/chatbot-flow.entity';
import { safeRegexTest } from '../../../common/utils/safe-regex.util';

export interface CreateFlowDto {
  accountId: string;
  name: string;
  triggerKeyword?: string;
  isRegex?: boolean;
  nodes?: any[];
  edges?: any[];
  escalateToHuman?: boolean;
  escalateMessage?: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(ChatbotFlowEntity)
    private readonly flowRepo: Repository<ChatbotFlowEntity>,
  ) {}

  async findAll(accountId?: string): Promise<ChatbotFlowEntity[]> {
    const where = accountId ? { accountId } : {};
    return this.flowRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<ChatbotFlowEntity> {
    const flow = await this.flowRepo.findOne({ where: { id } });
    if (!flow) throw new NotFoundException(`Chatbot flow ${id} not found`);
    return flow;
  }

  async create(dto: CreateFlowDto): Promise<ChatbotFlowEntity> {
    const flow = this.flowRepo.create({
      ...dto,
      nodes: JSON.stringify(dto.nodes ?? []),
      edges: JSON.stringify(dto.edges ?? []),
    });
    const saved = await this.flowRepo.save(flow);
    this.logger.log(`[Chatbot] Created flow "${saved.name}" (${saved.id})`);
    return saved;
  }

  async update(id: string, dto: Partial<CreateFlowDto>): Promise<ChatbotFlowEntity> {
    const existing = await this.findOne(id);
    const updated = {
      ...existing,
      ...dto,
      nodes: dto.nodes ? JSON.stringify(dto.nodes) : existing.nodes,
      edges: dto.edges ? JSON.stringify(dto.edges) : existing.edges,
    };
    await this.flowRepo.save(updated);
    return this.findOne(id);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.flowRepo.delete(id);
    return { success: true };
  }

  async toggleActive(id: string): Promise<{ isActive: boolean }> {
    const flow = await this.findOne(id);
    await this.flowRepo.update(id, { isActive: !flow.isActive });
    return { isActive: !flow.isActive };
  }

  /** Match inbound message against active flows and return matching flow */
  async matchFlow(accountId: string, messageText: string): Promise<ChatbotFlowEntity | null> {
    const flows = await this.flowRepo.find({ where: { accountId, isActive: true } });
    for (const flow of flows) {
      if (!flow.triggerKeyword) continue;
      const text = messageText.trim();
      const keyword = flow.triggerKeyword.trim();
      const matched = flow.isRegex
        ? safeRegexTest(keyword, text, 1000, 120)
        : text.toLowerCase().includes(keyword.toLowerCase());
      if (matched) return flow;
    }
    return null;
  }

  /** Test a flow with a simulated message */
  async testFlow(id: string, testMessage: string): Promise<{ matched: boolean; response?: string; escalate?: boolean }> {
    const flow = await this.findOne(id);
    const nodes: any[] = JSON.parse(flow.nodes || '[]');

    const keyword = flow.triggerKeyword?.trim() ?? '';
    const matched = flow.isRegex
      ? safeRegexTest(keyword, testMessage, 1000, 120)
      : testMessage.toLowerCase().includes(keyword.toLowerCase());

    if (!matched) return { matched: false };

    // Find first message node
    const msgNode = nodes.find((n: any) => n.type === 'message');
    return {
      matched: true,
      response: msgNode?.data?.text ?? 'Auto-reply triggered',
      escalate: flow.escalateToHuman,
    };
  }
}
