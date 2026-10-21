import { MigrationService, StartMigrationDto } from '../services/migration.service';
export declare class MigrationController {
    private readonly migrationService;
    constructor(migrationService: MigrationService);
    findAll(accountId?: string): Promise<import("../entities/migration.entity").MigrationEntity[]>;
    findOne(id: string): Promise<import("../entities/migration.entity").MigrationEntity>;
    getProgress(id: string): Promise<{
        steps: Record<string, boolean>;
        percentComplete: number;
    }>;
    start(dto: StartMigrationDto): Promise<import("../entities/migration.entity").MigrationEntity>;
    completeStep(id: string, step: string, data: any): Promise<import("../entities/migration.entity").MigrationEntity>;
    verifyTraffic(id: string, messagesSent: number): Promise<import("../entities/migration.entity").MigrationEntity>;
    cutover(id: string): Promise<import("../entities/migration.entity").MigrationEntity>;
}
