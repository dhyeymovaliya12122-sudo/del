import type Redis from 'ioredis';
export declare class SemanticCacheService {
    private readonly redis;
    private readonly logger;
    private readonly SIM_THRESHOLD;
    private readonly TTL_SEC;
    private readonly MAX_SCAN;
    constructor(redis: Redis);
    get(question: string, accountId: string): Promise<string | null>;
    set(question: string, answer: string, accountId: string): Promise<void>;
    invalidate(accountId: string): Promise<void>;
    private embed;
    private cosine;
    private sha;
}
