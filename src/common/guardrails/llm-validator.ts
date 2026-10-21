// ─────────────────────────────────────────────────────────────────────────────
//  src/common/guardrails/llm-validator.ts                          [O-2]
//
//  Zod-based schema enforcement at every LLM JSON boundary.
//  Usage:
//    const result = validateLLM(IntentResultSchema, rawLLMOutput, FALLBACK);
//    if (!isSafeContent(ragAnswer)) { answer = SAFE_FALLBACK_MSG; }
// ─────────────────────────────────────────────────────────────────────────────
import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('LLMValidator');

/**
 * Parse and validate LLM JSON output against a Zod schema.
 * On any failure (parse error, schema mismatch), returns `fallback`
 * and logs the failure for LangSmith dashboard tracking.
 */
export function validateLLM<T>(
  schema: z.ZodSchema<T>,
  raw: string | null | undefined,
  fallback: T,
  context = 'unknown',
): T {
  if (!raw) {
    logger.warn(`[Guardrail:${context}] Empty LLM output — using fallback`);
    return fallback;
  }
  try {
    return schema.parse(JSON.parse(raw));
  } catch (err: any) {
    logger.warn(
      `[Guardrail:${context}] Schema validation failed: ${err.message?.slice(0, 120)}`,
    );
    return fallback;
  }
}

// ── Content Safety Layer ─────────────────────────────────────────────────────
// Blocks LLM-generated text that contains false promises, competitor names,
// or social-engineering patterns before it reaches the end user.
// Tune BLOCKED_PATTERNS against your specific domain vocabulary before enabling.

const BLOCKED_PATTERNS: RegExp[] = [
  /guaranteed refund/i,
  /100% (free|discount|off)/i,      // false promises
  /call (\+?\d{8,})/i,              // prevents bot from sharing random numbers
  /visit us at http/i,              // prevents unverified URL injection
];


/** Returns true if the text is safe to send to the end user. */
export function isSafeContent(text: string): boolean {
  return !BLOCKED_PATTERNS.some(p => p.test(text));
}

export const SAFE_FALLBACK_MSG =
  "I'll connect you with our team for more details on that.";
