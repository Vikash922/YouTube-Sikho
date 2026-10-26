import DOMPurify from 'dompurify';

/**
 * Sanitize untrusted HTML to protect against XSS vulnerabilities.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'code',
      'pre',
      'span',
      'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}
