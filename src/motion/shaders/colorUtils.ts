/**
 * Zero-hardcoded color conversion utility for SkSL runtime shader uniforms.
 * Safely parses any hex (#RGB, #RRGGBB, #RRGGBBAA) or rgb/rgba string into
 * normalized [r, g, b, a] floats in range [0, 1].
 */
export function colorToVec4(colorStr: string): [number, number, number, number] {
  if (typeof colorStr !== 'string' || !colorStr) return [0, 0, 0, 1];
  const trimmed = colorStr.trim();

  if (trimmed.startsWith('#')) {
    const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    if (!hexPattern.test(trimmed)) {
      return [0, 0, 0, 1];
    }

    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return [r, g, b, 1];
      }
      return [0, 0, 0, 1];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) && Number.isFinite(a)) {
        return [r, g, b, a];
      }
      return [0, 0, 0, 1];
    }
    return [0, 0, 0, 1];
  }

  const rgbaMatch = trimmed.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10) / 255;
    const g = parseInt(rgbaMatch[2], 10) / 255;
    const b = parseInt(rgbaMatch[3], 10) / 255;
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) && Number.isFinite(a)) {
      return [r, g, b, a];
    }
    return [0, 0, 0, 1];
  }

  return [0, 0, 0, 1];
}
