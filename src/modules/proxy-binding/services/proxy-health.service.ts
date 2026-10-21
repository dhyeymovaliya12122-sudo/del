// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/services/proxy-health.service.ts
//  Periodically checks proxy liveness via HTTPS GET to a probe URL.
//  Marks unhealthy proxies in the database.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios from 'axios';
import { ProxyPoolEntity } from '../entities/proxy-pool.entity';

const HEALTH_PROBE_URL = 'https://httpbin.org/ip';

@Injectable()
export class ProxyHealthService {
  private readonly logger = new Logger(ProxyHealthService.name);

  constructor(
    @InjectRepository(ProxyPoolEntity)
    private readonly proxyRepo: Repository<ProxyPoolEntity>,
    private readonly config: ConfigService,
  ) {}

  // ── Runs every PROXY_HEALTH_CHECK_INTERVAL_MS ─────────────────────────────
  @Interval('proxyHealthCheck', 30000)
  async runHealthChecks(): Promise<void> {
    const proxies = await this.proxyRepo.find({ where: { isActive: true } });
    this.logger.log(`Running health checks on ${proxies.length} proxies…`);

    await Promise.allSettled(
      proxies.map((proxy) => this.checkProxy(proxy)),
    );
  }

  async checkProxy(proxy: ProxyPoolEntity): Promise<boolean> {
    const timeout = this.config.get<number>('proxy.timeoutMs', 10000);
    const proxyUrl = proxy.toUrl();

    let agent: SocksProxyAgent | HttpsProxyAgent<string>;
    if (proxy.protocol === 'socks5') {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    try {
      await axios.get(HEALTH_PROBE_URL, {
        httpsAgent: agent,
        timeout,
        validateStatus: (s) => s < 500,
      });

      if (!proxy.isHealthy) {
        await this.proxyRepo.update(proxy.id, { isHealthy: true, lastHealthCheck: new Date() });
        this.logger.log(`✅ Proxy [${proxy.label}] recovered`);
      } else {
        await this.proxyRepo.update(proxy.id, { lastHealthCheck: new Date() });
      }
      return true;
    } catch {
      if (proxy.isHealthy) {
        await this.proxyRepo.update(proxy.id, {
          isHealthy: false,
          lastHealthCheck: new Date(),
        });
        this.logger.warn(`❌ Proxy [${proxy.label}] marked UNHEALTHY`);
      }
      return false;
    }
  }
}
