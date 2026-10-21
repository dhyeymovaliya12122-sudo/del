// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-circuit-breaker/workers/circuit-breaker.worker.ts
//  BullMQ processor for the 'proxy-health-check' queue.
//
//  Job types:
//    'health-probe'    → tests a proxy and records success/failure
//    'circuit-reset'   → fires after reset delay → transitions OPEN → HALF_OPEN
// ─────────────────────────────────────────────────────────────────────────────
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
import { ProxyCircuitBreakerService } from '../services/proxy-circuit-breaker.service';

const PROBE_URL = 'https://httpbin.org/ip';
const PROBE_TIMEOUT_MS = 8000;

@Processor('proxy-health-check')
export class CircuitBreakerWorker extends WorkerHost {
  private readonly logger = new Logger(CircuitBreakerWorker.name);

  constructor(
    @InjectRepository(ProxyPoolEntity)
    private readonly proxyRepo: Repository<ProxyPoolEntity>,
    private readonly circuitBreakerService: ProxyCircuitBreakerService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { proxyId, accountId } = job.data;

    if (job.name === 'circuit-reset') {
      return this.handleCircuitReset(proxyId, accountId);
    }

    if (job.name === 'health-probe') {
      return this.handleHealthProbe(proxyId, accountId);
    }
  }

  // ── Probe: test proxy and record result ──────────────────────────────────
  private async handleHealthProbe(proxyId: string, accountId?: string): Promise<void> {
    const proxy = await this.proxyRepo.findOne({ where: { id: proxyId } });
    if (!proxy) {
      this.logger.warn(`[CB Worker] Proxy ${proxyId} not found — skipping probe`);
      return;
    }

    const proxyUrl = proxy.toUrl();
    const agent =
      proxy.protocol === 'socks5'
        ? new SocksProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl);

    try {
      await axios.get(PROBE_URL, {
        httpsAgent: agent,
        timeout: PROBE_TIMEOUT_MS,
        validateStatus: (s) => s < 500,
      });

      this.logger.log(`[CB Worker] ✅ Probe PASS for proxy [${proxy.label}]`);
      await this.circuitBreakerService.recordSuccess(proxyId);
    } catch (err) {
      this.logger.warn(`[CB Worker] ❌ Probe FAIL for proxy [${proxy.label}]: ${err.message}`);
      await this.circuitBreakerService.recordFailure(proxyId, accountId);
    }
  }

  // ── Reset: OPEN → HALF_OPEN after reset window expires ──────────────────
  private async handleCircuitReset(proxyId: string, accountId?: string): Promise<void> {
    const currentState = await this.circuitBreakerService.getState(proxyId);

    if (currentState !== 'OPEN') {
      this.logger.debug(
        `[CB Worker] Reset job fired but proxy ${proxyId} is already ${currentState}. Skipping.`,
      );
      return;
    }

    this.logger.log(`[CB Worker] ⏱  Reset timer fired. Moving proxy ${proxyId} → HALF_OPEN`);
    await this.circuitBreakerService.halfOpenCircuit(proxyId, accountId);

    // Immediately enqueue one probe in HALF_OPEN state
    const queue = (this as any).worker?.queue;
    if (queue) {
      await queue.add('health-probe', { proxyId, accountId }, { priority: 1 });
    }
  }
}
