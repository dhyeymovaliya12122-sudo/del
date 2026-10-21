import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { WhatsappAccountEntity } from '../../modules/session-hydration/entities/whatsapp-account.entity';
import { UserAccountAccessEntity } from '../../modules/auth/entities/user-account-access.entity';
export declare class AccountIsolationGuard implements CanActivate {
    private readonly jwtService;
    private readonly accountRepo;
    private readonly accessRepo;
    private readonly logger;
    constructor(jwtService: JwtService, accountRepo: Repository<WhatsappAccountEntity>, accessRepo: Repository<UserAccountAccessEntity>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
