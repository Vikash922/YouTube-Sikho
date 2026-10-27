/**
 * SEMVER COMPARISON UTILITIES
 * -------------------------------------------------------------
 * Safely compares two semantic version strings (e.g. "1.2.0" vs "1.2.1").
 */

export function parseSemver(version: string): number[] {
  if (!version || typeof version !== 'string') return [0, 0, 0];
  const cleaned = version.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

/**
 * Returns:
 *  -1 if v1 < v2
 *   0 if v1 == v2
 *   1 if v1 > v2
 */
export function compareSemver(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 < maj2) return -1;
  if (maj1 > maj2) return 1;

  if (min1 < min2) return -1;
  if (min1 > min2) return 1;

  if (pat1 < pat2) return -1;
  if (pat1 > pat2) return 1;

  return 0;
}

export function isVersionBelow(current: string, target: string): boolean {
  return compareSemver(current, target) < 0;
}
