// ─────────────────────────────────────────────────────────────────────────────
//  src/common/telemetry/llm-tracer.ts                              [O-1]
//
//  LangSmith distributed tracing wrapper.
//  Set LANGSMITH_API_KEY to enable. Has zero effect if key is absent.
//
//  CRITICAL: maskPii() MUST be applied to all user message content
//  before it enters a trace — raw WhatsApp messages = GDPR violation.
// ─────────────────────────────────────────────────────────────────────────────

/** Strip phone numbers, names, and emails from text before tracing */
export const maskPii = (s: string): string =>
  s
    .replace(/\+?\d{10,15}/g, '[PHONE]')
    .replace(/\b[A-Z][a-z]{1,15} [A-Z][a-z]{1,15}\b/g, '[NAME]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

/**
 * Wraps any async function with LangSmith tracing.
 * If LANGSMITH_API_KEY is not set, returns the original function unchanged.
 *
 * Usage:
 *   const tracedRoute = wrapTrace(this.route.bind(this), 'intent-router', { module: 'chatbot' });
 *   const result = await tracedRoute(text, accountId, flows);
 */
export async function wrapTrace<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string,
  metadata: Record<string, string> = {},
): Promise<T> {
  if (!process.env.LANGSMITH_API_KEY) {
    return fn; // No-op when LangSmith is not configured
  }

  try {
    // langsmith/wrappers exports traceable as a named export on the module namespace
    const wrappers = await import('langsmith/wrappers') as any;
    const traceable = wrappers.traceable ?? wrappers.default?.traceable;
    if (!traceable) return fn;

    return traceable(fn, {
      name,
      project_name: process.env.LANGSMITH_PROJECT ?? 'whatsapp-core-engine',
      tags: Object.entries(metadata).map(([k, v]) => `${k}:${v}`),
    }) as T;
  } catch {
    // langsmith package not installed — silently skip tracing
    return fn;
  }
}
