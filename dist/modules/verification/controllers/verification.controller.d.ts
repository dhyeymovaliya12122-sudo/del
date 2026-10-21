import { VerificationService } from '../services/verification.service';
export declare class VerificationController {
    private readonly verificationService;
    constructor(verificationService: VerificationService);
    findAll(): Promise<import("../entities/verification.entity").VerificationEntity[]>;
    get(accountId: string): Promise<import("../entities/verification.entity").VerificationEntity>;
    getChecklist(accountId: string): Promise<{
        status: import("../entities/verification.entity").VerificationStatus;
        greenTick: boolean;
        steps: {
            label: string;
            completed: boolean;
        }[];
        percentComplete: number;
    }>;
    update(accountId: string, data: any): Promise<import("../entities/verification.entity").VerificationEntity>;
}
