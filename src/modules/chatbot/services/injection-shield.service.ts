// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/services/injection-shield.service.ts        [F-10]
//
//  Stateless pre-processing guard that runs before every LLM call.
//  Blocks prompt injection, jailbreak attempts, and token-stuffing attacks.
//  Overhead: < 0.1ms on safe inputs (all regexes compiled at module init).
//
//  Enable: ENABLE_SHIELD=true in .env (checked by chatbot-state-machine).
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';

export interface ShieldResult {
  safe: boolean;
  sanitized: string;
  reason?: string;
}

@Injectable()
export class InjectionShieldService {
  private readonly logger = new Logger(InjectionShieldService.name);

  // Compiled once at module init — zero per-request compilation cost
  private readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore (all |previous |prior )?instructions/i,
    /you are now (dan|jailbreak|dev mode|an? ai without)/i,
    /repeat (after me|the following)[:\s]/i,
    /disregard (your |the )?system prompt/i,
    /act as (an? )?(unrestricted|uncensored|unfiltered)/i,
    /\bsystem prompt\b/i,
    /\bjailbreak\b/i,
    /forget (all )?previous (instructions|context)/i,
    /pretend (you are|to be) (a |an )?/i,
    /new persona:/i,
  ];

  // Strip known prompt-delimiter tokens that LLMs treat as control signals
  private readonly DELIMITER_PATTERN =
    /\[INST\]|\[\/INST\]|<s>|<\/s>|###\s*(system|assistant|user)\b/gi;

  /** Max input length forwarded to LLM (protects against token-stuffing) */
  private readonly MAX_INPUT_LENGTH = 1000;

  /**
   * Sanitize incoming text before it reaches any LLM call.
   * Returns { safe: false } if injection is detected.
   * Returns { safe: true, sanitized } with delimiter-stripped text otherwise.
   */
  sanitize(text: string): ShieldResult {
    // 1. Length guard
    if (text.length > this.MAX_INPUT_LENGTH) {
      this.logger.debug(`[Shield] Input too long: ${text.length} chars`);
      return { safe: false, sanitized: '', reason: 'input_too_long' };
    }

    // 2. Injection pattern scan
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.debug(`[Shield] Injection detected: ${pattern.source.slice(0, 40)}`);
        return {
          safe: false,
          sanitized: '',
          reason: `injection:${pattern.source.slice(0, 40)}`,
        };
      }
    }

    // 3. Strip delimiter tokens (safe to pass through — just sanitize)
    const sanitized = text.replace(this.DELIMITER_PATTERN, '').trim();
    return { safe: true, sanitized };
  }
}
