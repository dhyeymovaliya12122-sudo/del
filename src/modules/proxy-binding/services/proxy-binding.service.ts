// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/services/proxy-binding.service.ts
//  Core Proxy Binding Service — Feature 1
//
//  Responsibilities:
//  1. Assign a dedicated proxy to a WhatsApp account
//  2. Build SOCKS5Agent / HttpProxyAgent for Baileys engine
//  3. Return a fetch-compatible dispatcher for WebSocket upgrades
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { ProxyPoolEntity, ProxyProtocol } from '../entities/proxy-pool.entity';

export interface ProxyAgentBundle {
  /** For Baileys fetchAgent option (HTTPS requests) */
  httpsAgent: SocksProxyAgent | HttpsProxyAgent<string>;
  /** For plain HTTP requests */
  httpAgent: SocksProxyAgent | HttpProxyAgent<string>;
  /** Raw proxy URL string for logging / external tools */
  proxyUrl: string;
  protocol: ProxyProtocol;
}

@Injectable()
export class ProxyBindingService {
  private readonly logger = new Logger(ProxyBindingService.name);

  constructor(
    @InjectRepository(ProxyPoolEntity)
    private readonly proxyRepo: Repository<ProxyPoolEntity>,
    private readonly config: ConfigService,
  ) {}

  // ── Assign proxy to account ───────────────────────────────────────────────
  async assignProxyToAccount(accountId: string): Promise<ProxyPoolEntity> {
    // Try to find an already-assigned proxy for this account
    let proxy = await this.proxyRepo.findOne({
      where: { assignedAccountId: accountId, isActive: true, isHealthy: true },
    });

    if (!proxy) {
      // Get next available healthy, unassigned proxy
      proxy = await this.proxyRepo.findOne({
        where: { isActive: true, isHealthy: true, assignedAccountId: undefined },
        order: { createdAt: 'ASC' },
      });

      if (!proxy) {
        throw new NotFoundException(
          `No healthy proxy available to assign to account ${accountId}`,
        );
      }

      proxy.assignedAccountId = accountId;
      await this.proxyRepo.save(proxy);
      this.logger.log(`Assigned proxy [${proxy.label}] → account [${accountId}]`);
    }

    return proxy;
  }

  // ── Build agent bundle for Baileys engine ────────────────────────────────
  async buildAgentBundle(accountId: string): Promise<ProxyAgentBundle> {
    const proxy = await this.assignProxyToAccount(accountId);
    const proxyUrl = proxy.toUrl();

    this.logger.debug(`Building ${proxy.protocol.toUpperCase()} agent for account ${accountId}`);

    if (proxy.protocol === 'socks5') {
      const agent = new SocksProxyAgent(proxyUrl);
      return {
        httpsAgent: agent,
        httpAgent: agent,
        proxyUrl,
        protocol: 'socks5',
      };
    }

    // HTTP / HTTPS proxy
    return {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      httpAgent: new HttpProxyAgent(proxyUrl),
      proxyUrl,
      protocol: proxy.protocol,
    };
  }

  // ── Release proxy binding (on account ban/disconnect) ────────────────────
  async releaseProxy(accountId: string): Promise<void> {
    await this.proxyRepo.update(
      { assignedAccountId: accountId },
      { assignedAccountId: undefined },
    );
    this.logger.warn(`Released proxy binding for account ${accountId}`);
  }

  // ── Register new proxies in bulk ─────────────────────────────────────────
  async registerProxies(
    proxies: Partial<ProxyPoolEntity>[],
  ): Promise<ProxyPoolEntity[]> {
    const entities = this.proxyRepo.create(proxies);
    return this.proxyRepo.save(entities);
  }
}
