import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppUserEntity, UserRole } from '../entities/app-user.entity';
import { PasswordResetEntity } from '../entities/password-reset.entity';
import { UserAccountAccessEntity } from '../entities/user-account-access.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
export declare class AuthService implements OnModuleInit {
    private readonly userRepo;
    private readonly accessRepo;
    private readonly accountRepo;
    private readonly resetRepo;
    private readonly jwtService;
    private readonly logger;
    constructor(userRepo: Repository<AppUserEntity>, accessRepo: Repository<UserAccountAccessEntity>, accountRepo: Repository<WhatsappAccountEntity>, resetRepo: Repository<PasswordResetEntity>, jwtService: JwtService);
    onModuleInit(): Promise<void>;
    login(username: string, password: string): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            role: UserRole;
            displayName: string;
            accountIds: string[];
        };
    }>;
    verifyToken(token: string): any;
    getMe(userId: string): Promise<{
        id: string;
        username: string;
        role: UserRole;
        displayName: string;
        accountIds: string[];
    }>;
    createAdmin(username: string, password: string, displayName?: string): Promise<{
        id: string;
        username: string;
        role: UserRole.ADMIN;
        displayName: string;
        isActive: true;
        accountIds: any[];
    }>;
    deleteAdmin(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    assignAccountToAdmin(userId: string, accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    revokeAccountAccess(userId: string, accountId: string): Promise<{
        success: boolean;
    }>;
    getAllAdmins(): Promise<{
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
    updatePassword(userId: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    toggleAdminStatus(userId: string): Promise<{
        id: string;
        isActive: boolean;
    }>;
    getAccessibleAccountIds(userId: string, role: UserRole): Promise<string[]>;
    forgotPassword(identity: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
}
