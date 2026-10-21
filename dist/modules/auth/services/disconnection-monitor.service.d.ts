import { RealtimeGateway } from '../../realtime-gateway/gateways/realtime.gateway';
import { TelemetryService } from '../../telemetry/services/telemetry.service';
export interface DisconnectedEntry {
    id: string;
    personName: string;
    accountName?: string;
    phoneNumber?: string;
    type: 'user' | 'account';
    disconnectedAt: number;
    disconnectedBy?: string;
    reason?: string;
}
export declare class DisconnectionMonitorService {
    private readonly realtimeGateway;
    private readonly telemetryService?;
    private readonly logger;
    private readonly disconnectedMap;
    constructor(realtimeGateway: RealtimeGateway, telemetryService?: TelemetryService);
    handleUserLoggedOut(payload: {
        userId?: string;
        username: string;
        displayName?: string;
    }): void;
    handleAccountDisconnected(payload: {
        accountId: string;
        accountName?: string;
        phoneNumber?: string;
        disconnectedBy?: string;
        reason?: string;
        disconnectedAt?: number;
    }): void;
    handleAccountConnected(payload: {
        accountId: string;
        accountName?: string;
        phoneNumber?: string;
    }): void;
    handleAccountRemoved(payload: {
        accountId: string;
    }): void;
    handleAccountDeleted(payload: {
        accountId: string;
    }): void;
    recordDisconnection(id: string, personName: string, type?: 'user' | 'account', phoneNumber?: string, disconnectedBy?: string, reason?: string, disconnectedAt?: number): void;
    resolveReconnection(id: string): void;
    resolveAccountRemoved(id: string): void;
    dismissAlert(id: string): boolean;
    getEntry(id: string): DisconnectedEntry | undefined;
    getActiveDisconnections(): DisconnectedEntry[];
    handleMinuteBroadcast(): void;
    private broadcastAlert;
}
