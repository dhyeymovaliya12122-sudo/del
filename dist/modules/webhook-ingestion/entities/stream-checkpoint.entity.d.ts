export declare class StreamCheckpointEntity {
    id: string;
    streamKey: string;
    consumerGroup: string;
    lastAckId: string;
    totalProcessed: number;
    totalDeadLettered: number;
    createdAt: Date;
    updatedAt: Date;
}
