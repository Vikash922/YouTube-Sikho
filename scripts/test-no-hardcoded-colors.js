/**
 * NO HARDCODED COLORS VERIFICATION SUITE
 * -------------------------------------------------------------
 * Ensures zero arbitrary hex colors (#...) are hardcoded outside
 * of `src/theme/` and `src/config/client.config.ts`.
 * All colors must strictly consume tokens from `useTheme()`.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  path.join(ROOT_DIR, 'src', 'components'),
  path.join(ROOT_DIR, 'app'),
];

// Exemptions: Svg standard multi-color brand icons or client config
const ALLOWED_HEX = [
  '#4285F4', '#34A853', '#FBBC05', '#EA4335', // Google brand icon
  '#25D366', // WhatsApp official green
  '#FFFFFF', '#000000', // Pure contrast text inside SVG or LinearGradient
];

const HEX_REGEX = /#([0-9a-fA-F]{3,8})\b/g;

let totalFilesScanned = 0;
const violations = [];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      totalFilesScanned++;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        let match;
        while ((match = HEX_REGEX.exec(line)) !== null) {
          const hex = match[0].toUpperCase();
          if (!ALLOWED_HEX.includes(hex)) {
            violations.push({
              file: path.relative(ROOT_DIR, fullPath),
              line: idx + 1,
              match: match[0],
              snippet: trimmed,
            });
          }
        }
      });
    }
  }
}

console.log('═════════════════════════════════════════════════════════════════');
console.log('       RUNNING NO-HARDCODED-HEX TOKEN COMPLIANCE SCAN            ');
console.log('═════════════════════════════════════════════════════════════════\n');

SCAN_DIRS.forEach(scanDirectory);

console.log(`Scanned ${totalFilesScanned} source files in src/components and app/\n`);

if (violations.length > 0) {
  console.error(`❌ Found ${violations.length} hardcoded hex colors outside theme:`);
  violations.forEach((v) => {
    console.error(` - ${v.file}:${v.line} -> ${v.match} in "${v.snippet}"`);
  });
  process.exit(1);
} else {
  console.log('✅ ALL UI COMPONENTS EXCLUSIVELY CONSUME THEME TOKENS!\n');
  process.exit(0);
}
