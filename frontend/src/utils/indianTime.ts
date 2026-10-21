// ─────────────────────────────────────────────────────────────────────────────
//  utils/indianTime.ts
//  Standardized Indian Standard Time (IST, UTC+5:30) Formatter for All Features
// ─────────────────────────────────────────────────────────────────────────────

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parses any timestamp (seconds or milliseconds), ISO string, or Date into a valid Date object.
 */
export function parseToDate(input: number | string | Date | undefined | null): Date | null {
  if (input === undefined || input === null || input === '' || input === 0) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  if (typeof input === 'number') {
    // If timestamp in seconds (10 digits), convert to milliseconds (13 digits)
    const ms = input < 10000000000 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    // If numeric string in seconds or ms
    if (/^\d+$/.test(input)) {
      const num = Number(input);
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Formats time in Indian 12-hour format with AM/PM in IST (e.g. "12:52 PM" or "3:45 AM")
 */
export function formatIndianTime(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats time with seconds in IST (e.g. "12:52:15 PM")
 */
export function formatIndianTimeWithSec(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats date as DD/MM/YYYY in IST (e.g. "21/09/2026")
 */
export function formatIndianDate(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats date with short month name in IST (e.g. "21 Sep 2026")
 */
export function formatIndianDateText(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Full Indian Date & Time string (e.g. "21 Sep 2026, 12:52 PM")
 */
export function formatIndianDateTime(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';
  const datePart = formatIndianDateText(date);
  const timePart = formatIndianTime(date);
  return `${datePart}, ${timePart}`;
}

/**
 * Chat List timestamp in IST:
 * - If today: "12:52 pm"
 * - If yesterday: "Yesterday"
 * - Older: "21/09/2026"
 */
export function formatIndianChatTime(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';

  const now = new Date();
  const dateIST = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(date); // YYYY-MM-DD
  const nowIST = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(now);

  if (dateIST === nowIST) {
    return formatIndianTime(date).toLowerCase();
  }

  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayIST = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(yesterday);
  if (dateIST === yesterdayIST) {
    return 'Yesterday';
  }

  return formatIndianDate(date);
}

/**
 * Message timeline date divider banner in IST:
 * - If today: "TODAY"
 * - If yesterday: "YESTERDAY"
 * - Older: "21 SEPTEMBER 2026"
 */
export function formatIndianDateDivider(input: number | string | Date | undefined | null): string {
  const date = parseToDate(input);
  if (!date) return '';

  const now = new Date();
  const dateIST = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(date);
  const nowIST = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(now);

  if (dateIST === nowIST) return 'TODAY';

  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayIST = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(yesterday);
  if (dateIST === yesterdayIST) return 'YESTERDAY';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date).toUpperCase();
}

/**
 * Format Last Active status in IST:
 * - If connected: "Active now"
 * - If lastMessageAt present: "21 Sep, 12:52 PM"
 * - If unlinked / no record: "Not Linked"
 */
export function formatIndianLastActive(
  lastMessageAt: string | number | undefined | null,
  isConnected: boolean,
): string {
  if (isConnected) return 'Active now';
  if (!lastMessageAt) return 'Not Linked';
  const d = parseToDate(lastMessageAt);
  if (!d) return 'Not Linked';
  return formatIndianDateTime(d);
}
