#!/usr/bin/env node

/**
 * I18N KEY PARITY TEST SCRIPT
 * -------------------------------------------------------------
 * Asserts 100% key parity between English (en) and Hindi (hi)
 * translation dictionaries.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTranslations() {
  const tsPath = path.resolve(__dirname, '../src/i18n/translations.ts');
  const tsCode = fs.readFileSync(tsPath, 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;

  const m = { exports: {} };
  const fn = new Function('require', 'module', 'exports', jsCode);
  fn(require, m, m.exports);
  return m.exports.translations;
}

function checkParity() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('               CHECKING I18N TRANSLATION PARITY                 ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  const translations = loadTranslations();
  const enKeys = Object.keys(translations.en);
  const hiKeys = Object.keys(translations.hi);

  const missingInHi = enKeys.filter((k) => !(k in translations.hi));
  const extraInHi = hiKeys.filter((k) => !(k in translations.en));

  let hasError = false;

  console.log(`Total English keys: ${enKeys.length}`);
  console.log(`Total Hindi keys:   ${hiKeys.length}`);

  if (missingInHi.length > 0) {
    hasError = true;
    console.error(`\n❌ [MISSING IN HINDI (${missingInHi.length})]:`);
    missingInHi.forEach((k) => console.error(`   - ${k}`));
  }

  if (extraInHi.length > 0) {
    hasError = true;
    console.error(`\n❌ [EXTRA IN HINDI NOT IN ENGLISH (${extraInHi.length})]:`);
    extraInHi.forEach((k) => console.error(`   - ${k}`));
  }

  // Check for empty string values
  const emptyInEn = enKeys.filter((k) => !translations.en[k] || !translations.en[k].trim());
  const emptyInHi = hiKeys.filter((k) => !translations.hi[k] || !translations.hi[k].trim());

  if (emptyInEn.length > 0) {
    hasError = true;
    console.error(`\n❌ [EMPTY IN ENGLISH (${emptyInEn.length})]:`, emptyInEn);
  }

  if (emptyInHi.length > 0) {
    hasError = true;
    console.error(`\n❌ [EMPTY IN HINDI (${emptyInHi.length})]:`, emptyInHi);
  }

  if (hasError) {
    console.error('\n✗ I18N parity check FAILED!\n');
    process.exit(1);
  }

  console.log('\n✔ 100% key parity achieved between English and Hindi translations!\n');
  process.exit(0);
}

checkParity();
