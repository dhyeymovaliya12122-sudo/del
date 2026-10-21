/**
 * types.ts
 * Unified domain models and API data transfer objects.
 * Commandment #4: Consistent naming conventions.
 * Commandment #9: Document the codebase.
 */

export interface Account {
  id: string;
  phoneNumber: string;
  displayName?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'BANNED';
  proxyId?: string;
  proxyHealthy?: boolean;
  circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  unreadCount?: number;
  chatCount?: number;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string | number;
  disconnectedAt?: string | number;
  disconnectedBy?: string;
  disconnectionReason?: string;
  tenantId: string;
  todaysIncoming?: number;
  todaysOutgoing?: number;
  totalIncoming?: number;
  totalOutgoing?: number;
  filteredIncoming?: number;
  filteredOutgoing?: number;
}

export interface WhatsAppChat {
  id: string; // remoteJid
  accountId: string;
  name: string;
  subtitle?: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessageText: string;
  lastMessageTimestamp: number;
  lastMessageStatus: string;
  lastMessageFromMe: boolean;
  pinned: boolean;
  avatarUrl?: string;
  accountName?: string;
  accountPhone?: string;
}

export interface WhatsAppContact {
  id: string; // JID
  accountId: string;
  phoneNumber: string;
  name: string;
  notifyName: string;
  avatarUrl?: string;
}

export interface WhatsAppMessage {
  id: string;
  accountId: string;
  chatJid: string;
  senderJid: string;
  senderName?: string;
  fromMe: boolean;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | string;
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  status: string;
  isDeleted?: boolean;
  isViewOnce?: boolean;
  isEdited?: boolean;
  reaction?: string;
  isStarred?: boolean;
  quotedMsgId?: string;
  quotedText?: string;
  quotedSender?: string;
  timestamp: number;
}

export interface ScheduledMessage {
  id: string;
  accountId: string;
  toJid: string;
  messageText: string;
  mediaPath?: string;
  mediaType?: string;
  caption?: string;
  scheduledAt: string;
  repeatType: 'once' | 'daily' | 'weekly' | 'monthly';
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface AutoReplyRule {
  id: string;
  accountId: string;
  name: string;
  triggerType: 'keyword' | 'regex' | 'new_contact' | 'any' | 'contains';
  triggerValue?: string;
  replyMessage: string;
  isActive: boolean;
  onlyOutsideHours: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  matchCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  body?: string;
  mediaType?: string;
  mediaObjectId?: string;
  presignedUrl?: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'inbound' | 'outbound';
}

export interface ContainerInstance {
  id: string;
  serviceId: string;
  accountId: string;
  tenantId: string;
  phoneNumber: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  healthState: 'healthy' | 'unhealthy' | 'unknown';
  desiredReplicas: number;
  runningReplicas: number;
  healCount: number;
  createdAt: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
}

export interface StreamHealth {
  length: number;
  groups: number;
  lag: number;
}

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  status: string;
  messageBody?: string;
  templateId?: string;
  contactGroupId?: string;
  mediaUrl?: string;
  mediaType?: string;
  scheduledAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  clickedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  phoneNumber: string;
  name?: string;
  status: string;
  webhookResponse?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  repliedAt?: string;
  remarks?: string;
  leadMatch?: string;
  recentReply?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactGroup {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  tags: string;
  memberCount: number;
  createdAt: string;
}

export interface ContactGroupMember {
  id: string;
  groupId: string;
  phoneNumber: string;
  name?: string;
  city?: string;
  language?: string;
  tags: string;
  customFields: string;
  optedOut: boolean;
  optedOutAt?: string;
  createdAt: string;
}

export interface ChatbotFlow {
  id: string;
  accountId: string;
  name: string;
  triggerKeyword?: string;
  isRegex: boolean;
  isActive: boolean;
  nodes: string;
  edges: string;
  escalateToHuman: boolean;
  escalateMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageTemplate {
  id: string;
  accountId: string;
  name: string;
  category: string;
  language: string;
  body: string;
  header?: string;
  footer?: string;
  buttons: string;
  status: string;
  metaTemplateId?: string;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface OptOut {
  id: string;
  accountId: string;
  phoneNumber: string;
  name?: string;
  reason?: string;
  source: string;
  createdAt: string;
}

export interface Migration {
  id: string;
  accountId: string;
  sourcePhoneNumber: string;
  sourceProvider?: string;
  status: string;
  stepsCompleted: number;
  contactsImported: number;
  templatesImported: number;
  messagesImported: number;
  testMessagesSent: number;
  notes?: string;
  createdAt: string;
}

export interface Verification {
  id: string;
  accountId: string;
  status: string;
  businessName?: string;
  businessId?: string;
  greenTick: boolean;
  phoneVerified: boolean;
  docsSubmitted: boolean;
  metaBusinessManagerLinked: boolean;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ExportPayload {
  accountId: string;
  scope?: 'all' | 'single_chat' | 'custom' | 'unreplied';
  chatJid?: string;
  selectedJids?: string[];
  dateFrom?: number;
  dateTo?: number;
  format?: 'excel' | 'pdf' | 'zip';
  piiRedacted?: boolean;
  includeMedia?: 'none' | 'docs_audio' | 'all';
  password?: string;
  sinceLastBackup?: boolean;
}

export interface ExportStats {
  accountId: string;
  accountPhone: string;
  chatCount: number;
  messageCount: number;
  mediaFilesCount: number;
  mediaBytes: number;
  mediaSizeFormatted: string;
  lastBackupAt?: string | null;
}

export interface ExportLog {
  id: string;
  userId?: string;
  username: string;
  userRole: string;
  accountId: string;
  scope: string;
  format: string;
  piiRedacted: boolean;
  passwordProtected: boolean;
  recordCount: number;
  fileSizeBytes: number;
  ipAddress?: string;
  status: string;
  createdAt: string;
}

export interface AutomatedBackupStatus {
  enabled: boolean;
  schedule: string;
  retentionDays: number;
  lastBackupAt: string | null;
  lastFileName: string | null;
  lastFileSizeBytes: number | null;
  lastFileSizeFormatted: string | null;
  totalAccounts: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface LinkedDevice {
  id: string;
  accountId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'web' | 'mobile';
  platform: string;
  status: 'active' | 'revoked' | 'pending' | 'disconnected';
  isPrimary: boolean;
  publicKey?: string;
  ipAddress?: string;
  location?: string;
  lastSeenAt: number | string;
  createdAt: number | string;
}
