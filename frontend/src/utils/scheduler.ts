/**
 * src/utils/scheduler.ts
 *
 * ── Main-Thread Yield Utilities ──────────────────────────────────────────────
 *
 * WHY THIS FILE EXISTS
 * Chrome DevTools reports INP = 336ms because click handlers (e.g. "Open Chat",
 * account switch) run synchronous work — state updates, array filtering, API
 * dispatches — all in one uninterrupted task. The browser cannot paint or handle
 * input until the entire task finishes, making the UI feel frozen.
 *
 * The Scheduler API / `postTask` / `scheduler.yield()` (Chrome 129+) lets us
 * explicitly yield back to the browser so it can:
 *   1. Paint the immediate visual response (e.g. dismiss the banner, show spinner)
 *   2. Process any queued pointer/touch events
 *   3. Then continue the background work (fetch, sort, set state)
 *
 * USAGE
 *   import { yieldToMain, runAfterPaint, scheduleTask } from '../utils/scheduler';
 *
 *   const handleClick = async () => {
 *     // Do instant visual feedback first
 *     dismissBanner(id);
 *     setLoading(true);
 *
 *     // Yield — lets browser paint the spinner before heavy work starts
 *     await yieldToMain();
 *
 *     // Now do the expensive stuff
 *     const chats = await fetchChats(accountId);
 *     setChats(chats);
 *   };
 */

/** Type-safe accessor for the Scheduler API (Chrome 115+) */
declare global {
  interface Window {
    scheduler?: {
      yield?: () => Promise<void>;
      postTask?: <T>(task: () => T, options?: { priority?: string }) => Promise<T>;
    };
  }
}

/**
 * yieldToMain
 *
 * Gives control back to the browser for at least one task boundary.
 * Uses the native Scheduler API when available (Chrome 115+), falls back
 * to a MessageChannel (sub-millisecond overhead) for other browsers.
 *
 * This is the key fix for the 336ms INP: visual feedback fires BEFORE
 * the heavy async work begins, so the click feels instant.
 */
export function yieldToMain(): Promise<void> {
  // Native Scheduler.yield() — lowest overhead, always safe
  if (typeof window !== 'undefined' && window.scheduler?.yield) {
    return window.scheduler.yield();
  }

  // MessageChannel fallback — fires before setTimeout(0) in the task queue
  return new Promise<void>((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => resolve();
    port2.postMessage(null);
  });
}

/**
 * runAfterPaint
 *
 * Defers a callback until AFTER the next browser paint frame.
 * Use for non-visual work that shouldn't block the LCP frame:
 *   - Prefetching background data
 *   - Starting socket subscriptions
 *   - Initialising analytics
 *
 * Equivalent to: requestAnimationFrame → setTimeout(0), which places the
 * task AFTER layout/paint in the task queue.
 */
export function runAfterPaint(fn: () => void): void {
  requestAnimationFrame(() => {
    // Inner setTimeout ensures we fire AFTER the paint commit
    setTimeout(fn, 0);
  });
}

/**
 * scheduleIdleTask
 *
 * Runs a task during browser idle time using requestIdleCallback.
 * Falls back to setTimeout(200ms) on Safari which doesn't support rIC.
 * Use for truly non-urgent work: cache writes, logging, cleanup.
 */
export function scheduleIdleTask(fn: () => void, timeoutMs = 2000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: timeoutMs });
  } else {
    setTimeout(fn, 200);
  }
}

/**
 * debounce
 *
 * Creates a debounced version of a function. Critical for search inputs:
 * every keystroke triggers a filter over potentially thousands of chat rows.
 * Without debouncing, every keystroke blocks the main thread for ~50-100ms.
 *
 * @param fn      The function to debounce
 * @param delay   Milliseconds to wait after last call (default: 150ms)
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = 150,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
