export type QueueJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
export declare class MessageQueueLogEntity {
    id: string;
    jobId: string;
    accountId?: string;
    queueName: string;
    jobType: string;
    status: QueueJobStatus;
    payload: object;
    attempt: number;
    errorMessage?: string;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
