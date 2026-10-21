// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/services/behavioral-typing.service.ts
//  Pillar 1: AI-Powered Anti-Ban Behavioral Typing Simulator
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { delay } from '../../../common/utils/time.util';

export interface TypingSimulationOptions {
  enabled?: boolean;
  minWpm?: number;
  maxWpm?: number;
  maxTypingDurationMs?: number;
}

@Injectable()
export class BehavioralTypingService {
  private readonly logger = new Logger(BehavioralTypingService.name);

  /**
   * Computes and executes realistic human typing cadence and presence state updates
   * prior to message delivery.
   */
  async simulateHumanDispatch(
    socket: any,
    jid: string,
    text: string,
    options: TypingSimulationOptions = {},
  ): Promise<void> {
    if (options.enabled === false || !socket || typeof socket.sendPresenceUpdate !== 'function') {
      return;
    }

    const charCount = (text || '').trim().length;
    if (charCount === 0) return;

    // Human typing calculation: ~5 characters per word
    const targetWpm = Math.min(
      options.maxWpm || 75,
      Math.max(options.minWpm || 35, this.sampleGaussian(55, 10)),
    );
    const charsPerSecond = (targetWpm * 5) / 60;
    const computedDuration = (charCount / charsPerSecond) * 1000;

    // Cap typing duration to avoid excessive wait times (default 12s ceiling, 800ms floor)
    const maxDuration = options.maxTypingDurationMs || 12000;
    const typingTimeMs = Math.min(maxDuration, Math.max(800, computedDuration));

    try {
      // 1. Initial "Thinking/Composing Intent" pause
      const thinkingPauseMs = this.sampleGaussian(800, 250);
      await delay(thinkingPauseMs);

      // 2. Broadcast 'composing' presence packet to recipient
      await socket.sendPresenceUpdate('composing', jid).catch(() => null);
      this.logger.debug(
        `[Anti-Ban Behavioral] Emulating human typing for ${jid} (${typingTimeMs.toFixed(0)}ms at ${targetWpm.toFixed(0)} WPM)`,
      );

      // 3. Emulate realistic mid-text pause for messages longer than 80 characters
      if (charCount > 80 && typingTimeMs > 2500) {
        const firstSegment = typingTimeMs * 0.45;
        await delay(firstSegment);

        // Brief human hesitation
        await socket.sendPresenceUpdate('paused', jid).catch(() => null);
        await delay(this.sampleGaussian(450, 150));

        // Resume composing
        await socket.sendPresenceUpdate('composing', jid).catch(() => null);
        await delay(typingTimeMs - firstSegment);
      } else {
        await delay(typingTimeMs);
      }

      // 4. Conclude composing presence
      await socket.sendPresenceUpdate('paused', jid).catch(() => null);
      await delay(this.sampleGaussian(250, 80));
    } catch (err: any) {
      // Presence updates must never block actual message dispatch
      this.logger.debug(`[Anti-Ban Behavioral] Typing simulation skipped: ${err.message}`);
    }
  }

  /**
   * Box-Muller transform for true Gaussian/Normal distribution sampling
   */
  sampleGaussian(mean: number, stdev: number): number {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.max(50, mean + z * stdev);
  }
}
