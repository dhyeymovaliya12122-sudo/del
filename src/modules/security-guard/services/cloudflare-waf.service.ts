// ─────────────────────────────────────────────────────────────────────────────
//  modules/security-guard/services/cloudflare-waf.service.ts
//  Cloudflare WAF integration — manages IP block rules and rate limiting.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CloudflareWafService {
  private readonly logger = new Logger(CloudflareWafService.name);
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly zoneId: string;

  constructor(private readonly config: ConfigService) {
    this.zoneId = config.get<string>('security.cloudflareZoneId', '');
    const token = config.get<string>('security.cloudflareApiToken', '');
    this.baseUrl = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}`;
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Block an IP address at the Cloudflare WAF level.
   * Used when repeated HMAC failures are detected from the same IP.
   */
  async blockIp(ip: string, notes = 'Automated block: repeated HMAC failures'): Promise<void> {
    if (!this.zoneId) {
      this.logger.warn('Cloudflare Zone ID not configured — skipping IP block');
      return;
    }

    try {
      await axios.post(
        `${this.baseUrl}/firewall/access-rules/rules`,
        {
          mode: 'block',
          configuration: { target: 'ip', value: ip },
          notes,
        },
        { headers: this.headers },
      );
      this.logger.warn(`🚫 Cloudflare WAF: Blocked IP ${ip}`);
    } catch (err) {
      this.logger.error(`Failed to block IP ${ip} via Cloudflare: ${err.message}`);
    }
  }

  /** Get current WAF firewall rules */
  async getFirewallRules(): Promise<any[]> {
    if (!this.zoneId) return [];
    const res = await axios.get(
      `${this.baseUrl}/firewall/access-rules/rules`,
      { headers: this.headers },
    );
    return res.data?.result ?? [];
  }
}
