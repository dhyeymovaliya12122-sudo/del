// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-circuit-breaker/controllers/proxy-circuit-breaker.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProxyCircuitBreakerService } from '../services/proxy-circuit-breaker.service';
import { SmartProxyRotatorService } from '../services/smart-proxy-rotator.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('proxy-circuit-breaker')
export class ProxyCircuitBreakerController {
  constructor(
    private readonly cbService: ProxyCircuitBreakerService,
    private readonly proxyRotator: SmartProxyRotatorService,
  ) {}

  /** GET /api/v1/proxy-circuit-breaker — All circuit breaker states */
  @Get()
  async getAllStates() {
    return this.cbService.getAllCircuitStates();
  }

  /** GET /api/v1/proxy-circuit-breaker/:proxyId/state */
  @Get(':proxyId/state')
  async getState(@Param('proxyId') proxyId: string) {
    const state = await this.cbService.getState(proxyId);
    return { proxyId, state };
  }

  /** POST /api/v1/proxy-circuit-breaker/:proxyId/reset — Force close circuit */
  @Post(':proxyId/reset')
  @HttpCode(HttpStatus.OK)
  async resetCircuit(@Param('proxyId') proxyId: string) {
    await this.cbService.closeCircuit(proxyId);
    return { message: `Circuit CLOSED (forced) for proxy ${proxyId}` };
  }

  /** POST /api/v1/proxy-circuit-breaker/:proxyId/trip — Force open circuit (testing) */
  @Post(':proxyId/trip')
  @HttpCode(HttpStatus.OK)
  async tripCircuit(
    @Param('proxyId') proxyId: string,
  ) {
    await this.cbService.openCircuit(proxyId);
    return { message: `Circuit OPENED (forced) for proxy ${proxyId}` };
  }

  /** POST /api/v1/proxy-circuit-breaker/rotate/:accountId — Autonomous subnet-isolated rotation */
  @Post('rotate/:accountId')
  @HttpCode(HttpStatus.OK)
  async rotateProxy(
    @Param('accountId') accountId: string,
    @Body('failedProxyId') failedProxyId?: string,
  ) {
    const rotated = await this.proxyRotator.rotateToCleanSubnet(accountId, failedProxyId);
    return {
      message: `Account ${accountId} successfully rotated to clean subnet proxy`,
      proxy: {
        id: rotated.id,
        host: rotated.host,
        port: rotated.port,
        protocol: rotated.protocol,
      },
    };
  }
}
