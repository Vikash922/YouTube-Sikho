/**
 * URL Sanitization and Safety Utilities
 */

export function sanitizeUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }
  return '#';
}

export function isSafeExternalUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}
