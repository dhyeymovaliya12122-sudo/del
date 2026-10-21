import DOMPurify from 'dompurify';

/**
 * Sanitizes user-generated message strings or HTML content
 * to prevent XSS attacks while allowing safe formatting.
 */
export function sanitizeMessageContent(dirty?: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
}
