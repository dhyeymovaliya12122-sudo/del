import { SessionHydrationService } from '../services/session-hydration.service';
import { BaileysClientFactory } from '../factories/baileys-client.factory';
import { AccountWarmupService } from '../services/account-warmup.service';
import { DistributedSocketManagerService } from '../services/distributed-socket-manager.service';
export declare class SessionHydrationController {
    private readonly hydrationService;
    private readonly clientFactory;
    private readonly warmupService;
    private readonly socketManager;
    constructor(hydrationService: SessionHydrationService, clientFactory: BaileysClientFactory, warmupService: AccountWarmupService, socketManager: DistributedSocketManagerService);
    hydrateAccount(accountId: string): Promise<{
        message: string;
    }>;
    terminateAccount(accountId: string): Promise<void>;
    getActiveClients(): Promise<{
        activeClients: string[];
        count: number;
    }>;
    getWarmupStatus(accountId: string): Promise<import("../services/account-warmup.service").WarmupProfile>;
    getClusterLease(accountId: string): Promise<import("../services/distributed-socket-manager.service").ClusterStatus>;
}
