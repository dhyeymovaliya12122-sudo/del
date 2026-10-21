// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/message-queue/services/message-queue.service.ts
//  Enterprise alias for OutboundMessageQueueService
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { OutboundMessageQueueService } from './outbound-message-queue.service';

@Injectable()
export class MessageQueueService extends OutboundMessageQueueService {}
