import { Repository } from 'typeorm';
import { OptOutEntity } from '../entities/opt-out.entity';
export declare class OptOutService {
    private readonly optOutRepo;
    private readonly logger;
    constructor(optOutRepo: Repository<OptOutEntity>);
    findAll(accountId?: string): Promise<OptOutEntity[]>;
    isOptedOut(accountId: string, phoneNumber: string): Promise<boolean>;
    optOut(accountId: string, phoneNumber: string, name?: string, reason?: string, source?: string): Promise<OptOutEntity>;
    optIn(accountId: string, phoneNumber: string): Promise<{
        success: boolean;
    }>;
    bulkImport(accountId: string, numbers: {
        phoneNumber: string;
        name?: string;
    }[]): Promise<{
        imported: number;
    }>;
    filterOptedOut(accountId: string, phoneNumbers: string[]): Promise<string[]>;
}
