"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DisconnectionMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisconnectionMonitorService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const realtime_gateway_1 = require("../../realtime-gateway/gateways/realtime.gateway");
const telemetry_service_1 = require("../../telemetry/services/telemetry.service");
let DisconnectionMonitorService = DisconnectionMonitorService_1 = class DisconnectionMonitorService {
    constructor(realtimeGateway, telemetryService) {
        this.realtimeGateway = realtimeGateway;
        this.telemetryService = telemetryService;
        this.logger = new common_1.Logger(DisconnectionMonitorService_1.name);
        this.disconnectedMap = new Map();
    }
    handleUserLoggedOut(payload) {
        const name = payload.displayName || payload.username || 'User';
        this.recordDisconnection(payload.username, name, 'user', undefined, `User self-logout (${payload.username})`, 'Manual User Logout');
    }
    handleAccountDisconnected(payload) {
        const name = payload.accountName || payload.accountId || 'WhatsApp Account';
        this.recordDisconnection(payload.accountId, name, 'account', payload.phoneNumber, payload.disconnectedBy || 'WhatsApp Session Expired / Logged out from Mobile', payload.reason, payload.disconnectedAt);
    }
    handleAccountConnected(payload) {
        this.resolveReconnection(payload.accountId);
    }
    handleAccountRemoved(payload) {
        this.resolveAccountRemoved(payload.accountId);
    }
    handleAccountDeleted(payload) {
        this.resolveAccountRemoved(payload.accountId);
    }
    recordDisconnection(id, personName, type = 'user', phoneNumber, disconnectedBy, reason, disconnectedAt) {
        const entry = {
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
        this.telemetryService?.setDisconnectionCount(this.disconnectedMap.size, 'total');
        this.telemetryService?.incrementDisconnection(type);
        this.broadcastAlert(entry);
    }
    resolveReconnection(id) {
        const entry = this.disconnectedMap.get(id);
        if (this.disconnectedMap.has(id)) {
            this.disconnectedMap.delete(id);
            this.logger.log(`[DisconnectionMonitor] Cleared disconnected status for: "${entry?.accountName || entry?.personName}"`);
            this.telemetryService?.setDisconnectionCount(this.disconnectedMap.size, 'total');
            if (entry) {
                this.telemetryService?.decrementDisconnection(entry.type);
            }
        }
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
        }
        catch { }
    }
    resolveAccountRemoved(id) {
        const entry = this.disconnectedMap.get(id);
        if (this.disconnectedMap.has(id)) {
            this.disconnectedMap.delete(id);
            this.logger.log(`[DisconnectionMonitor] Cleared alert for removed account: "${entry?.accountName || entry?.personName}"`);
            this.telemetryService?.setDisconnectionCount(this.disconnectedMap.size, 'total');
            if (entry) {
                this.telemetryService?.decrementDisconnection(entry.type);
            }
        }
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
        }
        catch { }
    }
    dismissAlert(id) {
        return this.disconnectedMap.delete(id);
    }
    getEntry(id) {
        return this.disconnectedMap.get(id);
    }
    getActiveDisconnections() {
        return Array.from(this.disconnectedMap.values());
    }
    handleMinuteBroadcast() {
        if (this.disconnectedMap.size === 0)
            return;
        for (const entry of this.disconnectedMap.values()) {
            this.broadcastAlert(entry);
        }
    }
    broadcastAlert(entry) {
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
        }
        catch (err) {
            this.logger.error(`[DisconnectionMonitor] Failed to broadcast socket event: ${err.message}`);
        }
    }
};
exports.DisconnectionMonitorService = DisconnectionMonitorService;
__decorate([
    (0, event_emitter_1.OnEvent)('user.logged_out'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DisconnectionMonitorService.prototype, "handleUserLoggedOut", null);
__decorate([
    (0, event_emitter_1.OnEvent)('account.disconnected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DisconnectionMonitorService.prototype, "handleAccountDisconnected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('account.connected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DisconnectionMonitorService.prototype, "handleAccountConnected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('account.removed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DisconnectionMonitorService.prototype, "handleAccountRemoved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('account.deleted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DisconnectionMonitorService.prototype, "handleAccountDeleted", null);
__decorate([
    (0, schedule_1.Interval)(60000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DisconnectionMonitorService.prototype, "handleMinuteBroadcast", null);
exports.DisconnectionMonitorService = DisconnectionMonitorService = DisconnectionMonitorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway,
        telemetry_service_1.TelemetryService])
], DisconnectionMonitorService);
//# sourceMappingURL=disconnection-monitor.service.js.map