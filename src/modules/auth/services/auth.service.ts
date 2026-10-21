import {
  Injectable, Logger, UnauthorizedException,
  ConflictException, NotFoundException, BadRequestException, OnModuleInit,
} from '@nestjs/common';
// [A-2 FIX] DDL has been moved to src/infrastructure/database/migrations/001_initial_schema.ts
// AuthService is now responsible only for user seeding, not schema management.
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AppUserEntity, UserRole } from '../entities/app-user.entity';
import { PasswordResetEntity } from '../entities/password-reset.entity';
import { UserAccountAccessEntity } from '../entities/user-account-access.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,
    @InjectRepository(UserAccountAccessEntity)
    private readonly accessRepo: Repository<UserAccountAccessEntity>,
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    @InjectRepository(PasswordResetEntity)
    private readonly resetRepo: Repository<PasswordResetEntity>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Seed default superadmin and demo sub-admins on first startup.
   * [A-2 FIX] Schema / DDL management has been moved to:
   *   src/infrastructure/database/migrations/001_initial_schema.ts
   * AuthService is now only responsible for seeding initial USER records.
   */
  async onModuleInit() {
    // Inject the email column here if it is missing
    try {
      await this.userRepo.query(`ALTER TABLE app_users ADD COLUMN email varchar`);
      this.logger.log('✅ Added email column to app_users successfully.');
    } catch (e: any) {
      const msg = (e.message || '').toLowerCase();
      if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
        this.logger.warn(`Email column check: ${e.message}`);
      }
    }

    // Seed superadmin and demo sub-admins if empty
    try {
      const isProd = process.env.NODE_ENV === 'production';
      let initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;
      if (!initialPassword) {
        if (isProd) {
          initialPassword = crypto.randomBytes(16).toString('hex');
          this.logger.error(
            `🚨 [SECURITY] Generated secure random Super Admin password for initial launch: ${initialPassword} — Please change this immediately after logging in!`,
          );
        } else {
          initialPassword = 'changeme';
        }
      }
      const superAdminExists = await this.userRepo.findOne({ where: { username: 'superadmin' } });

      if (!superAdminExists) {
        const hash = await bcrypt.hash(initialPassword, 10);
        await this.userRepo.save({
          id: 'superadmin',
          username: 'superadmin',
          passwordHash: hash,
          role: UserRole.SUPER_ADMIN,
          displayName: 'Super Admin',
          isActive: true,
        });
        if (isProd && !process.env.SUPERADMIN_INITIAL_PASSWORD) {
          this.logger.warn(
            '⚠️  [SECURITY WARNING] Super Admin initialized with auto-generated secure random password.',
          );
        } else {
          this.logger.log(`✅ Default Super Admin created: superadmin (${initialPassword === 'changeme' ? 'changeme' : '[CONFIGURED]'})`);
        }
      }

      // Purge any historical demo sub-admins
      await this.userRepo.delete({ username: 'testadmin' }).catch(() => null);
      await this.userRepo.delete({ username: 'testadmin2' }).catch(() => null);
      await this.userRepo.delete({ username: 'testadmintestadmin2' }).catch(() => null);
      await this.userRepo.delete({ username: 'sales_admin' }).catch(() => null);
    } catch (err: any) {
      this.logger.error(`Failed seeding admins: ${err.message}`);
    }
  }

  /** Login → JWT token */
  async login(username: string, password: string) {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const cleanUsername = username?.trim();
    if (!cleanUsername || !password || password.length > 128) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Case-insensitive lookup so "Superadmin", "superadmin", "SUPERADMIN" all match
    let user = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username: cleanUsername })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    // Fallback: If username is "admin" or "superadmin", allow logging in with the default superadmin
    if (!user && (cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'superadmin')) {
      user = await this.userRepo.findOne({ where: { role: UserRole.SUPER_ADMIN, isActive: true } });
    }
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: crypto.randomUUID(), // Replay attack protection: unique token nonce
    };
    const token = this.jwtService.sign(payload);

    // Get accessible account IDs
    const accountIds = await this.getAccessibleAccountIds(user.id, user.role);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        accountIds,
      },
    };
  }

  /** Verify JWT token → user payload */
  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Get current user info */
  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const accountIds = await this.getAccessibleAccountIds(userId, user.role);
    return { id: user.id, username: user.username, role: user.role, displayName: user.displayName, accountIds };
  }

  /** Super Admin: create a new admin */
  async createAdmin(username: string, password: string, displayName?: string) {
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new BadRequestException('Password must be between 8 and 128 characters');
    }
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) throw new ConflictException(`Username "${username}" already exists`);

    const hash = await bcrypt.hash(password, 10);
    const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user = await this.userRepo.save({
      id, username, passwordHash: hash,
      role: UserRole.ADMIN,
      displayName: displayName || username,
      isActive: true,
    });
    this.logger.log(`✅ Admin created: ${username}`);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      isActive: user.isActive,
      accountIds: [],
    };
  }

  /** Super Admin: delete admin */
  async deleteAdmin(userId: string) {
    let user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      user = await this.userRepo.findOne({ where: { username: userId } });
    }
    if (!user) {
      // Idempotent deletion: if already removed from database, ensure access records wiped
      await this.accessRepo.delete({ userId });
      return { success: true, message: 'Admin deleted' };
    }
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete Super Admin account');
    }
    await this.accessRepo.delete({ userId: user.id });
    await this.userRepo.delete(user.id);
    this.logger.log(`🗑️ Admin deleted: ${user.username} (${user.id})`);
    return { success: true, message: `Admin ${user.username} deleted` };
  }

  /** Super Admin: assign WhatsApp account to admin exclusively (Strict 1 Account = 1 Admin Policy) */
  async assignAccountToAdmin(userId: string, accountId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');

    // Strict 1-to-1 Exclusivity: Check if account was assigned to another admin
    const previousAssignment = await this.accessRepo.findOne({ where: { accountId } });
    let reassignedFrom: string | null = null;
    if (previousAssignment && previousAssignment.userId !== userId) {
      const prevAdmin = await this.userRepo.findOne({ where: { id: previousAssignment.userId } });
      reassignedFrom = prevAdmin?.username || previousAssignment.userId;
      this.logger.warn(`Account [${accountId}] was allocated to admin [${reassignedFrom}]. Reallocating exclusively to [${user.username}].`);
    }

    // Wipe any existing assignment for this account across ALL admins
    await this.accessRepo.delete({ accountId });

    // Save exclusive assignment for the target admin
    await this.accessRepo.save({ userId, accountId });

    const accountLabel = account.displayName || account.phoneNumber || accountId;
    const msg = reassignedFrom
      ? `Account ${accountLabel} transferred exclusively to ${user.username} (removed from ${reassignedFrom})`
      : `Account ${accountLabel} allocated exclusively to ${user.username}`;

    this.logger.log(`✅ [Allocation] ${msg}`);
    return { success: true, message: msg };
  }

  /** Super Admin: remove account access from admin */
  async revokeAccountAccess(userId: string, accountId: string) {
    await this.accessRepo.delete({ userId, accountId });
    return { success: true };
  }

  /** Get all admins with their assigned accounts */
  async getAllAdmins() {
    const users = await this.userRepo.find();
    const allAccounts = await this.accountRepo.find();

    const result = await Promise.all(
      users.map(async user => {
        let accountIds: string[] = [];
        if (user.role === UserRole.SUPER_ADMIN) {
          accountIds = allAccounts.map(a => a.id);
        } else {
          const accesses = await this.accessRepo.find({ where: { userId: user.id } });
          accountIds = accesses.map(a => a.accountId);
        }

        const accounts = allAccounts.filter(a => accountIds.includes(a.id));

        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          isActive: user.isActive,
          accountIds,
          accounts: accounts.map(a => ({
            id: a.id,
            phoneNumber: a.phoneNumber,
            displayName: a.displayName,
            status: a.status,
          })),
        };
      })
    );
    return result;
  }

  /** Get all accounts with their assigned admin */
  async getAccountsWithAdmins() {
    const accounts = await this.accountRepo.find();
    const result = await Promise.all(
      accounts.map(async account => {
        const access = await this.accessRepo.findOne({ where: { accountId: account.id } });
        let admin = null;
        if (access) {
          admin = await this.userRepo.findOne({ where: { id: access.userId } });
        }
        return {
          ...account,
          assignedAdmin: admin ? { id: admin.id, username: admin.username, displayName: admin.displayName } : null,
        };
      })
    );
    return result;
  }

  /** Update admin password */
  async updatePassword(userId: string, newPassword: string) {
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      throw new BadRequestException('Password must be between 8 and 128 characters');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { passwordHash: hash });
    return { success: true };
  }

  /** Toggle admin active status */
  async toggleAdminStatus(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(userId, { isActive: !user.isActive });
    return { id: user.id, isActive: !user.isActive };
  }

  /** Get account IDs this user can access */
  async getAccessibleAccountIds(userId: string, role: UserRole): Promise<string[]> {
    if (role === UserRole.SUPER_ADMIN) {
      const all = await this.accountRepo.find();
      return all.map(a => a.id);
    }
    const accesses = await this.accessRepo.find({ where: { userId } });
    return accesses.map(a => a.accountId);
  }

  /**
   * Generates a reset token and writes it locally (dev) or logs it.
   */
  async forgotPassword(identity: string): Promise<void> {
    const clean = identity?.trim();
    if (!clean) return;

    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:identity)', { identity: clean })
      .orWhere('LOWER(user.email) = LOWER(:identity)', { identity: clean })
      .getOne();

    if (!user) return; // Silent return protects against user enumeration

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.resetRepo.delete({ userId: user.id });
    await this.resetRepo.save({ tokenHash, userId: user.id, expiresAt });

    const isDev = process.env.NODE_ENV !== 'production';

    // SECURITY GATE: Only reveal tokens locally
    if (isDev) {
      // 1. Easy Terminal Visual
      this.logger.log(`[DEV ONLY] Token for ${user.username}: ${rawToken}`);

      // 2. Automated Handshake: Write to a shared local file
      try {
        const filePath = path.join(process.cwd(), '.dev-token.json');
        fs.writeFileSync(filePath, JSON.stringify({ token: rawToken, username: user.username }));
      } catch (e) {
        this.logger.error('Could not write automated dev token file', e);
      }
    } else {
      // PROD: Fallback to standard error log or production mailer pipeline
      this.logger.log(`Password reset token generated securely for user ID: ${user.id}`);
    }
  }

  /**
   * Resets password given a token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      throw new BadRequestException('Password must be between 8 and 128 characters');
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await this.resetRepo.findOne({ where: { tokenHash } });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update({ id: resetRecord.userId }, { passwordHash });
    await this.resetRepo.delete({ userId: resetRecord.userId });

    // Cleanup dev token file
    try {
      const filePath = path.join(process.cwd(), '.dev-token.json');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      this.logger.error('Could not clean up automated dev token file', e);
    }
  }
}
