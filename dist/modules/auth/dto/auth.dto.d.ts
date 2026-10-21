export declare class LoginDto {
    username: string;
    password: string;
}
export declare class CreateAdminDto {
    username: string;
    password: string;
    displayName?: string;
}
export declare class UpdatePasswordDto {
    userId: string;
    newPassword: string;
}
export declare class ForgotPasswordDto {
    identity: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class LogoutDto {
    username?: string;
    displayName?: string;
}
