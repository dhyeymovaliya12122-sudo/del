// ─────────────────────────────────────────────────────────────────────────────
//  modules/accounts/controllers/accounts.controller.ts
//  REST API: GET /api/v1/accounts — consumed by frontend sidebar
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, HttpCode, HttpStatus, Headers, UseGuards, Req
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AccountsService, CreateAccountDTO } from '../services/accounts.service';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly sessionHydrationService: SessionHydrationService,
  ) {}

  /**
   * GET /api/v1/accounts
   * List all accounts with live proxy health, message metrics, and date duration filtering.
   * Optional ?tenantId=, ?startDate=, ?endDate= filters and role-aware admin isolation.
   */
  @Get()
  async listAccounts(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.accountsService.findAll(tenantId, req.user || auth, startDate, endDate);
  }

  /**
   * GET /api/v1/accounts/:id
   * Single account detail with enriched state, message metrics, and permission check.
   */
  @Get(':id')
  async getAccount(
    @Param('id') id: string,
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.accountsService.findOne(id, tenantId, req.user || auth, startDate, endDate);
  }

  /**
   * POST /api/v1/accounts
   * Create a new account record and immediately trigger QR code generation.
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAccount(@Body() body: CreateAccountDTO) {
    const account = await this.accountsService.create(body);
    
    // Immediately trigger session hydration to start QR generation
    // This runs in the background - don't await to avoid blocking the response
    this.sessionHydrationService.hydrateAccount(account.id).catch((err) => {
      console.error(`Failed to start QR flow for ${account.id}:`, err);
    });
    
    return account;
  }

  /**
   * PATCH /api/v1/accounts/:id
   * Update account properties such as custom displayName
   */
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateAccount(
    @Param('id') id: string,
    @Body() body: { displayName?: string },
  ) {
    return this.accountsService.update(id, body);
  }

  /**
   * PATCH /api/v1/accounts/:id/status
   * Update account connection status (called by Baileys event handlers).
   */
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    await this.accountsService.updateStatus(id, body.status);
    return { id, status: body.status };
  }

  /**
   * DELETE /api/v1/accounts/:id
   * Completely remove an account, its messages, chats, contacts and session.
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Param('id') id: string) {
    return this.accountsService.delete(id);
  }

  /**
   * GET /api/v1/accounts/:id/devices
   * List all linked devices adhering to Technical Plan §5 & §16
   */
  @Get(':id/devices')
  async getLinkedDevices(@Param('id') id: string) {
    return this.accountsService.getLinkedDevices(id);
  }

  /**
   * POST /api/v1/accounts/:id/devices/pair
   * Request QR pairing payload adhering to Technical Plan §4 & §22
   */
  @Post(':id/devices/pair')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async pairDevice(@Param('id') id: string, @Body() body: any) {
    return this.accountsService.pairDevice(id, body);
  }

  /**
   * POST /api/v1/accounts/:id/devices/approve
   * Approve a linked device session
   */
  @Post(':id/devices/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveDevice(@Param('id') id: string, @Body() body: { pairingId: string }) {
    return this.accountsService.approveDevice(id, body);
  }

  /**
   * DELETE /api/v1/accounts/:id/devices/:deviceId
   * Revoke device session adhering to Technical Plan §17
   */
  @Delete(':id/devices/:deviceId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async revokeDevice(@Param('id') id: string, @Param('deviceId') deviceId: string) {
    return this.accountsService.revokeDevice(id, deviceId);
  }
}
