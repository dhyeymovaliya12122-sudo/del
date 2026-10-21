import { UserRole } from '../../modules/auth/entities/app-user.entity';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
