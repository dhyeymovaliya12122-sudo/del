import { Repository } from 'typeorm';
import { MigrationEntity } from '../entities/migration.entity';
export interface StartMigrationDto {
    accountId: string;
    sourcePhoneNumber: string;
    sourceProvider?: string;
}
export declare const MIGRATION_STEPS: {
    CONTACTS: number;
    TEMPLATES: number;
    CHAT_HISTORY: number;
    TEST_TRAFFIC: number;
    CUTOVER: number;
};
export declare class MigrationService {
    private readonly migrationRepo;
    private readonly logger;
    constructor(migrationRepo: Repository<MigrationEntity>);
    findAll(accountId?: string): Promise<MigrationEntity[]>;
    findOne(id: string): Promise<MigrationEntity>;
    start(dto: StartMigrationDto): Promise<MigrationEntity>;
    completeStep(id: string, step: keyof typeof MIGRATION_STEPS, data?: Partial<MigrationEntity>): Promise<MigrationEntity>;
    verifyTraffic(id: string, messagesSent: number): Promise<MigrationEntity>;
    cutover(id: string): Promise<MigrationEntity>;
    getProgress(id: string): Promise<{
        steps: Record<string, boolean>;
        percentComplete: number;
    }>;
}
