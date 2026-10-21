/**
 * clipboard.ts
 * Sanitized clipboard utility to protect against Clipboard Hijacking & Auto-Execute Attacks.
 *
 * Attacks prevented:
 * 1. Terminal Auto-Execute: Injected trailing newlines (\n, \r) causing immediate shell execution on paste.
 * 2. Invisible Characters: Zero-width spaces (\u200B, \uFEFF) injected to alter commands or bypass visual checks.
 * 3. ANSI Escape Code Injection: Terminal escape sequences hiding destructive payloads.
 */

export interface CopyOptions {
  /** If true, preserves internal newlines for multi-line code, but always strips trailing newlines */
  allowNewlines?: boolean;
}

/**
 * Sanitizes and copies text to the user's system clipboard.
 */
export async function safeCopyToClipboard(
  rawText: string,
  options: CopyOptions = {},
): Promise<boolean> {
  if (!rawText || typeof rawText !== 'string') {
    return false;
  }

  // 1. Strip zero-width & invisible Unicode characters
  let sanitized = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 2. Strip ANSI escape sequences
  sanitized = sanitized.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

  // 3. Normalize and remove carriage returns
  sanitized = sanitized.replace(/\r/g, '');

  // 4. Handle newlines
  if (options.allowNewlines) {
    // Multi-line code: trim trailing newlines to prevent terminal auto-execute on the last command
    sanitized = sanitized.trimEnd();
  } else {
    // Single-line commands / API tokens / numbers: strip ALL newlines
    sanitized = sanitized.replace(/\n+/g, ' ').trim();
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(sanitized);
      return true;
    }

    // Fallback for older browsers / non-secure contexts
    const textarea = document.createElement('textarea');
    textarea.value = sanitized;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.warn('Clipboard write failed:', err);
    return false;
  }
}
