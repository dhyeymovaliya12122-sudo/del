import {
  Injectable, CanActivate, ExecutionContext,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { WhatsappAccountEntity } from '../../modules/session-hydration/entities/whatsapp-account.entity';
import { UserAccountAccessEntity } from '../../modules/auth/entities/user-account-access.entity';

/**
 * AccountIsolationGuard
 *
 * Enforces that:
 * 1. All account-scoped API requests include a valid `accountId` query/body param
 * 2. Non-SUPER_ADMIN users can only access their own assigned accounts
 * 3. The requested accountId exists in the whatsapp_accounts table
 *
 * Usage: Apply to any controller method that scopes data by account.
 */
@Injectable()
export class AccountIsolationGuard implements CanActivate {
  private readonly logger = new Logger(AccountIsolationGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    @InjectRepository(UserAccountAccessEntity)
    private readonly accessRepo: Repository<UserAccountAccessEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract accountId from query params, route params, or body (in that order)
    const accountId: string =
      request.query?.accountId ||
      request.params?.accountId ||
      request.body?.accountId;

    // Require accountId to be present - no global selects allowed
    if (!accountId) {
      throw new BadRequestException(
        'accountId is required. Global selects across all accounts are not permitted.',
      );
    }

    // Skip strict isolation for the universal "all" view (SUPER_ADMIN only)
    if (accountId === 'all') {
      const user = request.user;
      if (!user || user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException(
          'Only Super Admins may view the universal all-accounts stream.',
        );
      }
      return true;
    }

    // Verify the account exists in the database
    let account = null;
    try {
      account = await this.accountRepo.findOne({ where: { id: accountId } });
    } catch (err: any) {
      this.logger.error(`Database error verifying account ${accountId}: ${err.message}`);
    }
    if (!account) {
      throw new BadRequestException(`Account with id "${accountId}" does not exist.`);
    }

    // SUPER_ADMIN may access any account
    const user = request.user;
    if (!user || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // For non-SUPER_ADMIN users: check explicit access record in user_account_access
    let access = null;
    try {
      access = await this.accessRepo.findOne({
        where: { accountId, userId: user.sub || user.id },
      });
    } catch (err: any) {
      this.logger.error(`Database error checking user ${user.sub || user.id} access to ${accountId}: ${err.message}`);
    }

    if (!access) {
      this.logger.warn(
        `SECURITY: User ${user.sub || user.id} (role: ${user.role}) attempted to access account ${accountId} without permission.`,
      );
      throw new ForbiddenException(
        `You do not have permission to access account ${accountId}. Contact your administrator.`,
      );
    }

    return true;
  }
}
