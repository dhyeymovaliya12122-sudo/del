export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN"
}
export declare class AppUserEntity {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    displayName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
