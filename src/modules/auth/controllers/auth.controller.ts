import {
  Controller, Post, Get, Delete, Body, Param, Req,
  UnauthorizedException, HttpCode, HttpStatus, UseGuards, ForbiddenException, NotFoundException, Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../entities/app-user.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SecurityAuditService } from '../../../common/services/security-audit.service';
import { AuditAction } from '../entities/security-audit-log.entity';
import { DisconnectionMonitorService } from '../services/disconnection-monitor.service';
import {
  LoginDto,
  CreateAdminDto,
  UpdatePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto,
} from '../dto/auth.dto';
import * as fs from 'fs';
import * as path from 'path';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: SecurityAuditService,
    private readonly disconnectionMonitor: DisconnectionMonitorService,
  ) {}

  /** POST /api/v1/auth/login */
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.login(body.username, body.password);
      res.cookie('wa_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await this.auditService.record({
        actorUserId: result.user?.id,
        action: AuditAction.LOGIN_SUCCESS,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
        userAgent: req.headers['user-agent'],
        metadata: { username: body.username },
      });

      // Clear any active disconnection notification for this user
      this.disconnectionMonitor.resolveReconnection(result.user?.username || body.username);

      return result;
    } catch (err: any) {
      await this.auditService.record({
        action: AuditAction.LOGIN_FAILED,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
        userAgent: req.headers['user-agent'],
        metadata: { username: body.username, error: err.message },
      });
      throw err;
    }
  }

  /** POST /api/v1/auth/logout */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('wa_token', { path: '/' });
    const personName = body?.displayName || body?.username || 'User';
    const personId = body?.username || `user-${Date.now()}`;
    
    // Register disconnected person to trigger 1-minute recurring alert to admins
    this.disconnectionMonitor.recordDisconnection(personId, personName, 'user');

    await this.auditService.record({
      action: AuditAction.LOGOUT,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { personName, username: body?.username },
    }).catch(() => null);

    return { success: true, message: `${personName} logged out successfully` };
  }

  /** GET /api/v1/auth/disconnections — Active disconnections for dashboard */
  @Get('disconnections')
  getDisconnections() {
    return this.disconnectionMonitor.getActiveDisconnections();
  }

  /** DELETE /api/v1/auth/disconnections/:id — Dismiss disconnected alert */
  @Delete('disconnections/:id')
  dismissDisconnection(@Param('id') id: string) {
    const dismissed = this.disconnectionMonitor.dismissAlert(id);
    return { success: dismissed };
  }

  /** GET /api/v1/auth/me */
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.sub);
  }

  /** GET /api/v1/auth/admins — Super Admin only */
  @Get('admins')
  @Roles(UserRole.SUPER_ADMIN)
  async getAdmins() {
    return this.authService.getAllAdmins();
  }

  /** GET /api/v1/auth/accounts-with-admins */
  @Get('accounts-with-admins')
  @Roles(UserRole.SUPER_ADMIN)
  async getAccountsWithAdmins() {
    return this.authService.getAccountsWithAdmins();
  }

  /** GET /api/v1/auth/audit-logs — Super Admin only */
  @Get('audit-logs')
  @Roles(UserRole.SUPER_ADMIN)
  async getAuditLogs() {
    return this.auditService.getRecentLogs(200);
  }

  /** POST /api/v1/auth/admins — Super Admin only (RESTful) */
  @Post('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAdminRest(
    @CurrentUser() user: any,
    @Body() body: CreateAdminDto,
    @Req() req: Request,
  ) {
    const result = await this.authService.createAdmin(body.username, body.password, body.displayName);
    await this.auditService.record({
      actorUserId: user?.sub || user?.id || 'superadmin',
      action: AuditAction.ADMIN_CREATED,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { createdUsername: body.username, createdId: result.id },
    });
    return result;
  }

  /** DELETE /api/v1/auth/admins/:id — Super Admin only */
  @Delete('admins/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteAdmin(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.authService.deleteAdmin(id);
    await this.auditService.record({
      actorUserId: user?.sub || user?.id || 'superadmin',
      action: AuditAction.ADMIN_DELETED,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { targetAdminId: id },
    });
    return result;
  }

  /** POST /api/v1/auth/admins/:userId/accounts — Super Admin only */
  @Post('admins/:userId/accounts')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignAccountRest(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() body: { accountId: string },
    @Req() req: Request,
  ) {
    const result = await this.authService.assignAccountToAdmin(userId, body.accountId);
    await this.auditService.record({
      actorUserId: user?.sub || user?.id || 'superadmin',
      action: AuditAction.ACCOUNT_ASSIGNED,
      targetAccountId: body.accountId,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { targetUserId: userId },
    });
    return result;
  }

  /** DELETE /api/v1/auth/admins/:userId/accounts/:accountId — Super Admin only */
  @Delete('admins/:userId/accounts/:accountId')
  @Roles(UserRole.SUPER_ADMIN)
  async revokeAccountRest(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Param('accountId') accountId: string,
    @Req() req: Request,
  ) {
    const result = await this.authService.revokeAccountAccess(userId, accountId);
    await this.auditService.record({
      actorUserId: user?.sub || user?.id || 'superadmin',
      action: AuditAction.ACCOUNT_REVOKED,
      targetAccountId: accountId,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { targetUserId: userId },
    });
    return result;
  }

  /** POST /api/v1/auth/update-password */
  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @CurrentUser() user: any,
    @Body() body: UpdatePasswordDto,
    @Req() req: Request,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN && user.sub !== body.userId) {
      throw new UnauthorizedException('Cannot update another admin\'s password');
    }
    const result = await this.authService.updatePassword(body.userId, body.newPassword);
    await this.auditService.record({
      actorUserId: user.sub,
      action: AuditAction.PASSWORD_CHANGE,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
      metadata: { targetUserId: body.userId },
    });
    return result;
  }

  /** POST /api/v1/auth/toggle-admin/:userId */
  @Post('toggle-admin/:userId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleAdmin(@Param('userId') userId: string) {
    return this.authService.toggleAdminStatus(userId);
  }

  /** POST /api/v1/auth/forgot-password */
  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body.identity);
    return { success: true, message: 'If that user exists, a reset token has been generated.' };
  }

  /** POST /api/v1/auth/reset-password */
  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { success: true, message: 'Password has been reset successfully.' };
  }
}
