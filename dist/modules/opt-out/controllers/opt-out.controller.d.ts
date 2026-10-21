import { OptOutService } from '../services/opt-out.service';
export declare class OptOutController {
    private readonly optOutService;
    constructor(optOutService: OptOutService);
    findAll(accountId?: string): Promise<import("../entities/opt-out.entity").OptOutEntity[]>;
    optOut(accountId: string, phoneNumber: string, name?: string, reason?: string): Promise<import("../entities/opt-out.entity").OptOutEntity>;
    optIn(accountId: string, phoneNumber: string): Promise<{
        success: boolean;
    }>;
    bulkImport(accountId: string, numbers: {
        phoneNumber: string;
        name?: string;
    }[]): Promise<{
        imported: number;
    }>;
    checkOptOut(accountId: string, phoneNumber: string): Promise<boolean>;
}
