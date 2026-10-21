export declare enum AuditAction {
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILED = "LOGIN_FAILED",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    ADMIN_CREATED = "ADMIN_CREATED",
    ADMIN_DELETED = "ADMIN_DELETED",
    ACCOUNT_ASSIGNED = "ACCOUNT_ASSIGNED",
    ACCOUNT_REVOKED = "ACCOUNT_REVOKED",
    CHAT_EXPORT = "CHAT_EXPORT",
    MEDIA_STREAM = "MEDIA_STREAM",
    DEV_BYPASS_ATTEMPT = "DEV_BYPASS_ATTEMPT",
    LOGOUT = "LOGOUT",
    DISCONNECTION = "DISCONNECTION"
}
export declare class SecurityAuditLogEntity {
    id: string;
    actorUserId: string;
    action: AuditAction | string;
    targetAccountId: string;
    ipAddress: string;
    userAgent: string;
    metadata: string;
    integrityHash: string;
    createdAt: Date;
}
