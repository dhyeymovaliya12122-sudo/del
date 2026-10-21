import { Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { RealtimeGateway } from '../../realtime-gateway/gateways/realtime.gateway';
import { TelemetryService } from '../../telemetry/services/telemetry.service';

export interface DisconnectedEntry {
  id: string;
  personName: string;
  accountName?: string;
  phoneNumber?: string;
  type: 'user' | 'account';
  disconnectedAt: number;
  disconnectedBy?: string;
  reason?: string;
}

@Injectable()
export class DisconnectionMonitorService {
  private readonly logger = new Logger(DisconnectionMonitorService.name);
  private readonly disconnectedMap = new Map<string, DisconnectedEntry>();

  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    @Optional()
    private readonly telemetryService?: TelemetryService,
  ) {}

  @OnEvent('user.logged_out')
  handleUserLoggedOut(payload: { userId?: string; username: string; displayName?: string }): void {
    const name = payload.displayName || payload.username || 'User';
    this.recordDisconnection(
      payload.username,
      name,
      'user',
      undefined,
      `User self-logout (${payload.username})`,
      'Manual User Logout',
    );
  }

  @OnEvent('account.disconnected')
  handleAccountDisconnected(payload: {
    accountId: string;
    accountName?: string;
    phoneNumber?: string;
    disconnectedBy?: string;
    reason?: string;
    disconnectedAt?: number;
  }): void {
    const name = payload.accountName || payload.accountId || 'WhatsApp Account';
    this.recordDisconnection(
      payload.accountId,
      name,
      'account',
      payload.phoneNumber,
      payload.disconnectedBy || 'WhatsApp Session Expired / Logged out from Mobile',
      payload.reason,
      payload.disconnectedAt,
    );
  }

  @OnEvent('account.connected')
  handleAccountConnected(payload: { accountId: string; accountName?: string; phoneNumber?: string }): void {
    this.resolveReconnection(payload.accountId);
  }

  @OnEvent('account.removed')
  handleAccountRemoved(payload: { accountId: string }): void {
    this.resolveAccountRemoved(payload.accountId);
  }

  @OnEvent('account.deleted')
  handleAccountDeleted(payload: { accountId: string }): void {
    this.resolveAccountRemoved(payload.accountId);
  }

  /**
   * Record when a person logs out of the web, or an account disconnects.
   */
  recordDisconnection(
    id: string,
    personName: string,
    type: 'user' | 'account' = 'user',
    phoneNumber?: string,
    disconnectedBy?: string,
    reason?: string,
    disconnectedAt?: number,
  ): void {
    const entry: DisconnectedEntry = {
      id,
      personName: personName || id,
      accountName: personName || id,
      phoneNumber: phoneNumber || '',
      type,
      disconnectedAt: disconnectedAt || Date.now(),
      disconnectedBy: disconnectedBy || 'WhatsApp Session Expired / Logged out from Mobile',
      reason: reason || 'Session Disconnected',
    };
    this.disconnectedMap.set(id, entry);
    this.logger.warn(`[DisconnectionMonitor] Registered disconnected ${type}: "${entry.personName}" (Phone: ${entry.phoneNumber}) by ${entry.disconnectedBy}`);

    // Pillar 5: Update Prometheus wa_disconnection_active_gauge
    this.telemetryService?.setDisconnectionCount(this.disconnectedMap.size, 'total');
    this.telemetryService?.incrementDisconnection(type);

    // Immediate initial broadcast
    this.broadcastAlert(entry);
  }

  /**
   * Resolve when the person logs back in or reconnects.
   */
  resolveReconnection(id: string): void {
    const entry = this.disconnectedMap.get(id);
    if (this.disconnectedMap.has(id)) {
      this.disconnectedMap.delete(id);
      this.logger.log(`[DisconnectionMonitor] Cleared disconnected status for: "${entry?.accountName || entry?.personName}"`);

      // Pillar 5: Decrement Prometheus wa_disconnection_active_gauge
      this.telemetryService?.setDisconnectionCount(this.disconnectedMap.size, 'total');
      if (entry) {
        this.telemetryService?.decrementDisconnection(entry.type);
      }
    }

    // Always notify clients that reconnection occurred so alerts disappear automatically
    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.emit('admin:reconnection_alert', {
          id,
          personName: entry?.personName,
          accountName: entry?.accountName,
          phoneNumber: entry?.phoneNumber,
          reconnectedAt: Date.now(),
          action: 'reconnect',
        });
        this.realtimeGateway.server.emit('account:status', {
          accountId: id,
          status: 'CONNECTED',
        });
      }
    } catch {}
  }

  /**
   * Resolve when an account is removed from the system entirely.
   */
  resolveAccountRemoved(id: string): void {
    const entry = this.disconnectedMap.get(id);
    if (this.disconnectedMap.has(id)) {
      this.disconnectedMap.delete(id);
      this.logger.log(`[DisconnectionMonitor] Cleared alert for removed account: "${entry?.accountName || entry?.personName}"`);

      this.telemetryService?.setDisconnectionCount(this.disconnectedMap.size, 'total');
      if (entry) {
        this.telemetryService?.decrementDisconnection(entry.type);
      }
    }

    // Notify clients that account was removed so alerts disappear automatically
    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.emit('admin:reconnection_alert', {
          id,
          personName: entry?.personName,
          accountName: entry?.accountName,
          phoneNumber: entry?.phoneNumber,
          reconnectedAt: Date.now(),
          removed: true,
          action: 'remove',
        });
        this.realtimeGateway.server.emit('account:removed', {
          accountId: id,
          action: 'remove',
        });
        this.realtimeGateway.server.emit('account:deleted', {
          accountId: id,
          action: 'remove',
        });
      }
    } catch {}
  }

  /**
   * Dismiss or acknowledge a disconnected alert.
   */
  dismissAlert(id: string): boolean {
    return this.disconnectedMap.delete(id);
  }

  /**
   * Get single disconnected entity by ID.
   */
  getEntry(id: string): DisconnectedEntry | undefined {
    return this.disconnectedMap.get(id);
  }

  /**
   * Get all currently disconnected entities.
   */
  getActiveDisconnections(): DisconnectedEntry[] {
    return Array.from(this.disconnectedMap.values());
  }

  /**
   * Enterprise Recurring Heartbeat: Every 1 minute (60,000ms),
   * broadcast an alert for each disconnected person to all connected admins.
   * Exactly matches user spec: "every min '(that person name) disconnected'"
   */
  @Interval(60000)
  handleMinuteBroadcast(): void {
    if (this.disconnectedMap.size === 0) return;

    for (const entry of this.disconnectedMap.values()) {
      this.broadcastAlert(entry);
    }
  }

  private broadcastAlert(entry: DisconnectedEntry): void {
    const nameStr = entry.accountName || entry.personName;
    const phoneStr = entry.phoneNumber ? ` (+${entry.phoneNumber.replace(/^\+/, '')})` : '';
    const message = `${nameStr}${phoneStr} disconnected`;
    this.logger.warn(`[DisconnectionMonitor] ⚠️ Disconnection Alert: "${message}" by ${entry.disconnectedBy}`);

    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.emit('admin:disconnection_alert', {
          id: entry.id,
          personName: entry.personName,
          accountName: entry.accountName,
          phoneNumber: entry.phoneNumber,
          type: entry.type,
          message,
          disconnectedAt: entry.disconnectedAt,
          disconnectedBy: entry.disconnectedBy,
          reason: entry.reason,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      this.logger.error(`[DisconnectionMonitor] Failed to broadcast socket event: ${err.message}`);
    }
  }
}
