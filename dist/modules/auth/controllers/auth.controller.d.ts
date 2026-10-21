import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../entities/app-user.entity';
import { SecurityAuditService } from '../../../common/services/security-audit.service';
import { DisconnectionMonitorService } from '../services/disconnection-monitor.service';
import { LoginDto, CreateAdminDto, UpdatePasswordDto, ForgotPasswordDto, ResetPasswordDto, LogoutDto } from '../dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    private readonly auditService;
    private readonly disconnectionMonitor;
    constructor(authService: AuthService, auditService: SecurityAuditService, disconnectionMonitor: DisconnectionMonitorService);
    login(body: LoginDto, req: Request, res: Response): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            role: UserRole;
            displayName: string;
            accountIds: string[];
        };
    }>;
    logout(body: LogoutDto, req: Request, res: Response): Promise<{
        success: boolean;
        message: string;
    }>;
    getDisconnections(): import("../services/disconnection-monitor.service").DisconnectedEntry[];
    dismissDisconnection(id: string): {
        success: boolean;
    };
    getMe(user: any): Promise<{
        id: string;
        username: string;
        role: UserRole;
        displayName: string;
        accountIds: string[];
    }>;
    getAdmins(): Promise<{
        id: string;
        username: string;
        displayName: string;
        role: UserRole;
        isActive: boolean;
        accountIds: string[];
        accounts: {
            id: string;
            phoneNumber: string;
            displayName: string;
            status: import("../../session-hydration/entities/whatsapp-account.entity").AccountStatus;
        }[];
    }[]>;
    getAccountsWithAdmins(): Promise<{
        assignedAdmin: {
            id: any;
            username: any;
            displayName: any;
        };
        id: string;
        phoneNumber: string;
        displayName?: string;
        status: import("../../session-hydration/entities/whatsapp-account.entity").AccountStatus;
        proxyId?: string;
        session?: import("../../session-hydration/entities/session-auth.entity").SessionAuthEntity;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getAuditLogs(): Promise<import("../entities/security-audit-log.entity").SecurityAuditLogEntity[]>;
    createAdminRest(user: any, body: CreateAdminDto, req: Request): Promise<{
        id: string;
        username: string;
        role: UserRole.ADMIN;
        displayName: string;
        isActive: true;
        accountIds: any[];
    }>;
    deleteAdmin(user: any, id: string, req: Request): Promise<{
        success: boolean;
        message: string;
    }>;
    assignAccountRest(user: any, userId: string, body: {
        accountId: string;
    }, req: Request): Promise<{
        success: boolean;
        message: string;
    }>;
    revokeAccountRest(user: any, userId: string, accountId: string, req: Request): Promise<{
        success: boolean;
    }>;
    updatePassword(user: any, body: UpdatePasswordDto, req: Request): Promise<{
        success: boolean;
    }>;
    toggleAdmin(userId: string): Promise<{
        id: string;
        isActive: boolean;
    }>;
    forgotPassword(body: ForgotPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(body: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
