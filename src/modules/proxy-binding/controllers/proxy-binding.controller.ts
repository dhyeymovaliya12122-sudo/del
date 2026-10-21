// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/controllers/proxy-binding.controller.ts
//  REST endpoints to manage the proxy pool (add, list, rotate, delete).
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ProxyBindingService } from '../services/proxy-binding.service';
import { ProxyRotationService } from '../services/proxy-rotation.service';
import { ProxyHealthService } from '../services/proxy-health.service';
import { RegisterProxiesDto } from '../dto/register-proxies.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('proxy-binding')
export class ProxyBindingController {
  constructor(
    private readonly proxyBindingService: ProxyBindingService,
    private readonly proxyRotationService: ProxyRotationService,
    private readonly proxyHealthService: ProxyHealthService,
  ) {}

  /** POST /api/v1/proxy-binding/register — Bulk-register residential proxies */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerProxies(@Body() dto: RegisterProxiesDto) {
    return this.proxyBindingService.registerProxies(dto.proxies);
  }

  /** GET /api/v1/proxy-binding/account/:accountId — Get assigned proxy */
  @Get('account/:accountId')
  async getAccountProxy(@Param('accountId') accountId: string) {
    return this.proxyBindingService.assignProxyToAccount(accountId);
  }

  /** POST /api/v1/proxy-binding/account/:accountId/rotate — Force proxy rotation */
  @Post('account/:accountId/rotate')
  async rotateProxy(@Param('accountId') accountId: string) {
    return this.proxyRotationService.rotateForAccount(accountId);
  }

  /** DELETE /api/v1/proxy-binding/account/:accountId — Release proxy binding */
  @Delete('account/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async releaseProxy(@Param('accountId') accountId: string) {
    return this.proxyBindingService.releaseProxy(accountId);
  }
}
