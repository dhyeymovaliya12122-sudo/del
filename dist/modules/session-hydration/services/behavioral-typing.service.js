"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BehavioralTypingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralTypingService = void 0;
const common_1 = require("@nestjs/common");
const time_util_1 = require("../../../common/utils/time.util");
let BehavioralTypingService = BehavioralTypingService_1 = class BehavioralTypingService {
    constructor() {
        this.logger = new common_1.Logger(BehavioralTypingService_1.name);
    }
    async simulateHumanDispatch(socket, jid, text, options = {}) {
        if (options.enabled === false || !socket || typeof socket.sendPresenceUpdate !== 'function') {
            return;
        }
        const charCount = (text || '').trim().length;
        if (charCount === 0)
            return;
        const targetWpm = Math.min(options.maxWpm || 75, Math.max(options.minWpm || 35, this.sampleGaussian(55, 10)));
        const charsPerSecond = (targetWpm * 5) / 60;
        const computedDuration = (charCount / charsPerSecond) * 1000;
        const maxDuration = options.maxTypingDurationMs || 12000;
        const typingTimeMs = Math.min(maxDuration, Math.max(800, computedDuration));
        try {
            const thinkingPauseMs = this.sampleGaussian(800, 250);
            await (0, time_util_1.delay)(thinkingPauseMs);
            await socket.sendPresenceUpdate('composing', jid).catch(() => null);
            this.logger.debug(`[Anti-Ban Behavioral] Emulating human typing for ${jid} (${typingTimeMs.toFixed(0)}ms at ${targetWpm.toFixed(0)} WPM)`);
            if (charCount > 80 && typingTimeMs > 2500) {
                const firstSegment = typingTimeMs * 0.45;
                await (0, time_util_1.delay)(firstSegment);
                await socket.sendPresenceUpdate('paused', jid).catch(() => null);
                await (0, time_util_1.delay)(this.sampleGaussian(450, 150));
                await socket.sendPresenceUpdate('composing', jid).catch(() => null);
                await (0, time_util_1.delay)(typingTimeMs - firstSegment);
            }
            else {
                await (0, time_util_1.delay)(typingTimeMs);
            }
            await socket.sendPresenceUpdate('paused', jid).catch(() => null);
            await (0, time_util_1.delay)(this.sampleGaussian(250, 80));
        }
        catch (err) {
            this.logger.debug(`[Anti-Ban Behavioral] Typing simulation skipped: ${err.message}`);
        }
    }
    sampleGaussian(mean, stdev) {
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return Math.max(50, mean + z * stdev);
    }
};
exports.BehavioralTypingService = BehavioralTypingService;
exports.BehavioralTypingService = BehavioralTypingService = BehavioralTypingService_1 = __decorate([
    (0, common_1.Injectable)()
], BehavioralTypingService);
//# sourceMappingURL=behavioral-typing.service.js.map