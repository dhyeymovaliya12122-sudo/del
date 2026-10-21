// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/controllers/session-hydration.controller.ts
//  REST endpoints for session lifecycle management.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Post, Delete, Get, Param, HttpCode, HttpStatus, UseGuards
} from '@nestjs/common';
import { SessionHydrationService } from '../services/session-hydration.service';
import { BaileysClientFactory } from '../factories/baileys-client.factory';
import { AccountWarmupService } from '../services/account-warmup.service';
import { DistributedSocketManagerService } from '../services/distributed-socket-manager.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('session-hydration')
export class SessionHydrationController {
  constructor(
    private readonly hydrationService: SessionHydrationService,
    private readonly clientFactory: BaileysClientFactory,
    private readonly warmupService: AccountWarmupService,
    private readonly socketManager: DistributedSocketManagerService,
  ) {}

  /** POST /api/v1/session-hydration/:accountId/start — Manually hydrate a session */
  @Post(':accountId/start')
  @HttpCode(HttpStatus.OK)
  async hydrateAccount(@Param('accountId') accountId: string) {
    await this.hydrationService.hydrateAccount(accountId);
    return { message: `Session hydrated for account ${accountId}` };
  }

  /** DELETE /api/v1/session-hydration/:accountId — Terminate and clean up session */
  @Delete(':accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async terminateAccount(@Param('accountId') accountId: string) {
    return this.hydrationService.terminateAccount(accountId);
  }

  /** GET /api/v1/session-hydration/active — List all active WhatsApp clients */
  @Get('active')
  async getActiveClients() {
    return {
      activeClients: this.clientFactory.getActiveClients(),
      count: this.clientFactory.getActiveClients().length,
    };
  }

  /** GET /api/v1/session-hydration/:accountId/warmup-status — Anti-Ban Warm-Up Health & Quota */
  @Get(':accountId/warmup-status')
  async getWarmupStatus(@Param('accountId') accountId: string) {
    return this.warmupService.getWarmupProfile(accountId);
  }

  /** GET /api/v1/session-hydration/:accountId/cluster-lease — Cluster Leader Election & Lease Status */
  @Get(':accountId/cluster-lease')
  async getClusterLease(@Param('accountId') accountId: string) {
    return this.socketManager.getClusterStatus(accountId);
  }
}
