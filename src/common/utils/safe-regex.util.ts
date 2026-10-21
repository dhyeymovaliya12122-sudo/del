/**
 * safe-regex.util.ts
 * Hardened utility to prevent ReDoS (Regular Expression Denial of Service)
 * and Server-Side Template Injection (SSTI).
 */

// Detects catastrophic nested backtracking quantifiers like (a+)+, (.*)*, ([a-z]+)+
const CATASTROPHIC_QUANTIFIER_REGEX = /(\([^\)]*[\+\*]\)[^\)]*[\+\*])|(\([^\)]*\{\d+,\}[^\)]*[\+\*])/;

/**
 * Escapes arbitrary string so it can be safely used in a regex without injection.
 */
export function safeEscapeRegex(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely tests a pattern against text with strict length bounding and ReDoS guards.
 *
 * @param pattern The regex pattern string (e.g. from user or bot trigger)
 * @param text The input text to test
 * @param maxTextLength Max characters of text to test (prevents unbounded processing)
 * @param maxPatternLength Max length of regex pattern (rejects massive regex payloads)
 * @returns boolean whether pattern matched safely
 */
export function safeRegexTest(
  pattern: string,
  text: string,
  maxTextLength = 1000,
  maxPatternLength = 120,
): boolean {
  if (!pattern || typeof pattern !== 'string' || !text || typeof text !== 'string') {
    return false;
  }

  // Reject overly long patterns
  if (pattern.length > maxPatternLength) {
    return false;
  }

  // Reject known catastrophic backtracking patterns
  if (CATASTROPHIC_QUANTIFIER_REGEX.test(pattern)) {
    return false;
  }

  // Clamp input text to prevent CPU exhaustion on long payloads
  const boundedText = text.slice(0, maxTextLength);

  try {
    const re = new RegExp(pattern, 'i');
    return re.test(boundedText);
  } catch {
    return false;
  }
}

/**
 * Safely replaces {variable} tokens without compiling raw unescaped regexes
 * preventing SSTI and regex syntax errors.
 */
export function safeInterpolate(
  text: string,
  variables: Record<string, any>,
): string {
  if (!text || typeof text !== 'string') return '';
  if (!variables || typeof variables !== 'object') return text;

  let result = text;
  for (const [key, val] of Object.entries(variables)) {
    if (!key || typeof key !== 'string') continue;
    const token = `{${key}}`;
    const cleanVal = val !== null && val !== undefined ? String(val) : '';
    // Use split/join to replace all occurrences literally without regex interpretation
    result = result.split(token).join(cleanVal);
  }
  return result;
}
