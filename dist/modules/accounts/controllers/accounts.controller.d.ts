import { AccountsService, CreateAccountDTO } from '../services/accounts.service';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
export declare class AccountsController {
    private readonly accountsService;
    private readonly sessionHydrationService;
    constructor(accountsService: AccountsService, sessionHydrationService: SessionHydrationService);
    listAccounts(req: any, tenantId?: string, startDate?: string, endDate?: string, auth?: string): Promise<import("../services/accounts.service").AccountDTO[]>;
    getAccount(id: string, req: any, tenantId?: string, startDate?: string, endDate?: string, auth?: string): Promise<import("../services/accounts.service").AccountDTO>;
    createAccount(body: CreateAccountDTO): Promise<import("../services/accounts.service").AccountDTO>;
    updateAccount(id: string, body: {
        displayName?: string;
    }): Promise<import("../services/accounts.service").AccountDTO>;
    updateStatus(id: string, body: {
        status: string;
    }): Promise<{
        id: string;
        status: string;
    }>;
    deleteAccount(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getLinkedDevices(id: string): Promise<any>;
    pairDevice(id: string, body: any): Promise<{
        pairingId: string;
        deviceId: any;
        qrPayload: string;
        expiresAt: number;
    }>;
    approveDevice(id: string, body: {
        pairingId: string;
    }): Promise<{
        success: boolean;
        device: {
            id: string;
            accountId: string;
            deviceId: string;
            deviceName: string;
            deviceType: "desktop" | "web";
            platform: string;
            status: "active";
            isPrimary: boolean;
            publicKey: string;
            ipAddress: string;
            location: string;
            lastSeenAt: number;
            createdAt: number;
        };
    }>;
    revokeDevice(id: string, deviceId: string): Promise<{
        success: boolean;
        revokedId: string;
    }>;
}
