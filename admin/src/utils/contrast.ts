/**
 * WCAG 2.1 Color Contrast Utilities
 */

export function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const rgb = fullHex.match(/.{2}/g)?.map((x) => parseInt(x, 16) / 255) || [0, 0, 0];
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  } catch {
    return 1;
  }
}

export function isWcagCompliant(fgHex: string, bgHex: string, minRatio: number = 4.5): boolean {
  return getContrastRatio(fgHex, bgHex) >= minRatio;
}
