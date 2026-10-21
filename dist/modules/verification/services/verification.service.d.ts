import { Repository } from 'typeorm';
import { VerificationEntity, VerificationStatus } from '../entities/verification.entity';
export declare class VerificationService {
    private readonly verificationRepo;
    private readonly logger;
    constructor(verificationRepo: Repository<VerificationEntity>);
    getOrCreate(accountId: string): Promise<VerificationEntity>;
    findAll(): Promise<VerificationEntity[]>;
    update(accountId: string, data: any): Promise<VerificationEntity>;
    getChecklist(accountId: string): Promise<{
        status: VerificationStatus;
        greenTick: boolean;
        steps: {
            label: string;
            completed: boolean;
        }[];
        percentComplete: number;
    }>;
}
