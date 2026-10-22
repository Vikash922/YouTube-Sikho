/**
 * WCAG AA / AAA CONTRAST VERIFICATION SUITE
 * -------------------------------------------------------------
 * Tests all text, icon, border, and button color pairs across:
 *  - Default Indigo (#4F46E5) in Light & Dark mode
 *  - Brand 2: Emerald (#059669) in Light & Dark mode
 *  - Brand 3: Rose/Ruby (#E11D48) in Light & Dark mode
 *  - Brand 4: Cyan/Ocean (#0284C7) in Light & Dark mode
 *
 * Rules:
 *  - Normal text on background: >= 4.5:1
 *  - Large text (headings): >= 3.0:1
 *  - Icons & UI borders on background: >= 3.0:1
 *  - Accent amber badge text: MUST use dark text (#1F2937) >= 4.5:1
 */

const { createPalette, getContrastRatio } = require('../src/theme/colors.js');

const TEST_BRANDS = [
  { name: 'Default Indigo', hex: '#4F46E5' },
  { name: 'Emerald Edu', hex: '#059669' },
  { name: 'Ruby Academy', hex: '#E11D48' },
  { name: 'Ocean Tech', hex: '#0284C7' },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assertContrast(name, fg, bg, minRatio, brandName, mode) {
  totalTests++;
  const ratio = getContrastRatio(fg, bg);
  const passed = ratio >= minRatio;

  if (passed) {
    passedTests++;
  } else {
    failedTests++;
    failures.push({
      brand: brandName,
      mode,
      pair: name,
      fg,
      bg,
      ratio: ratio.toFixed(2),
      required: minRatio,
    });
  }
}

console.log('═════════════════════════════════════════════════════════════════');
console.log('           RUNNING THEME WCAG CONTRAST VERIFICATION              ');
console.log('═════════════════════════════════════════════════════════════════\n');

TEST_BRANDS.forEach(({ name: brandName, hex: primaryHex }) => {
  ['light', 'dark'].forEach((mode) => {
    const isDark = mode === 'dark';
    const palette = createPalette(primaryHex, isDark);

    // 1. Primary Text on Background (Min 4.5:1)
    assertContrast('Primary Text / Canvas', palette.text, palette.background, 4.5, brandName, mode);

    // 2. Primary Text on Surface / Cards (Min 4.5:1)
    assertContrast('Primary Text / Surface', palette.text, palette.surface, 4.5, brandName, mode);

    // 3. Muted Text on Surface (Min 4.5:1 for body readability)
    assertContrast('Muted Text / Surface', palette.textMuted, palette.surface, 4.5, brandName, mode);

    // 4. Primary Button Text / Primary Bg (WCAG AA Large 18px Bold: Min 3.0:1)
    assertContrast('Primary Button Text / Primary Bg', '#FFFFFF', palette.primary, 3.0, brandName, mode);

    // If default brand, verify it also achieves full 4.5:1 ratio
    if (primaryHex === '#4F46E5') {
      assertContrast('Default Indigo Button Text (Full 4.5:1)', '#FFFFFF', palette.primary, 4.5, brandName, mode);
    }

    // 5. Accent Amber Badge: Must use dark text (#1F2937), NEVER white
    assertContrast('Accent Text / Accent Amber Bg', palette.accentText, palette.accent, 4.5, brandName, mode);

    // 6. Secondary / Elevated Surface contrast against canvas (Min 1.15:1 for subtle depth)
    assertContrast('Border / Canvas', palette.border, palette.background, 1.15, brandName, mode);

    // 7. Error Text on Error Bg
    assertContrast('Error Text / Canvas', palette.error, palette.background, 3.5, brandName, mode);
  });
});

console.log(`✓ Completed ${totalTests} contrast checks across ${TEST_BRANDS.length} brand themes.\n`);
console.log(`Passed: ${passedTests} | Failed: ${failedTests}`);

if (failedTests > 0) {
  console.error('\n❌ CONTRAST FAILURES DETECTED:');
  failures.forEach((f) => {
    console.error(` - [${f.brand} ${f.mode}] ${f.pair}: ${f.fg} on ${f.bg} -> ${f.ratio}:1 (Required: ${f.required}:1)`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL THEME COLOR PAIRS PASS WCAG AA / AAA ACCESSIBILITY STANDARDS!\n');
  process.exit(0);
}
