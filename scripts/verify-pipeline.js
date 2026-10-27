#!/usr/bin/env node
/**
 * scripts/verify-pipeline.js
 * Comprehensive master quality verification pipeline.
 * Runs root, admin, and functions checks in strict sequence and stops at the first failure.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const STEPS = [
  // --- ROOT APP CHECKS ---
  {
    name: 'Root: TypeScript Typecheck',
    cmd: 'npm run typecheck',
    cwd: ROOT_DIR,
  },
  {
    name: 'Root: ESLint Static Analysis',
    cmd: 'npm run lint',
    cwd: ROOT_DIR,
  },
  {
    name: 'Root: Brand Tokens & Accessibility Contrast',
    cmd: 'npm run lint:tokens && npm run lint:contrast',
    cwd: ROOT_DIR,
  },
  {
    name: 'Root: Dual-Language i18n Parity',
    cmd: 'npm run lint:i18n',
    cwd: ROOT_DIR,
  },
  {
    name: 'Root: Pre-Commit Secret Scanner',
    cmd: 'npm run lint:secrets',
    cwd: ROOT_DIR,
  },
  {
    name: 'Root: Expo Doctor Health Check',
    cmd: 'npm run doctor',
    cwd: ROOT_DIR,
  },
  {
    name: 'Root: Android Production Bundle Export',
    cmd: 'npm run export:android',
    cwd: ROOT_DIR,
  },

  // --- ADMIN PANEL CHECKS ---
  {
    name: 'Admin: TypeScript Typecheck',
    cmd: 'npm run typecheck',
    cwd: path.join(ROOT_DIR, 'admin'),
  },
  {
    name: 'Admin: ESLint Static Analysis',
    cmd: 'npm run lint',
    cwd: path.join(ROOT_DIR, 'admin'),
  },
  {
    name: 'Admin: Production Vite Build',
    cmd: 'npm run build',
    cwd: path.join(ROOT_DIR, 'admin'),
  },

  // --- CLOUD FUNCTIONS CHECKS ---
  {
    name: 'Functions: TypeScript Typecheck',
    cmd: 'npm run typecheck',
    cwd: path.join(ROOT_DIR, 'functions'),
  },
  {
    name: 'Functions: ESLint Static Analysis',
    cmd: 'npm run lint',
    cwd: path.join(ROOT_DIR, 'functions'),
  },
  {
    name: 'Functions: Production Build (Node 20)',
    cmd: 'npm run build',
    cwd: path.join(ROOT_DIR, 'functions'),
  },
  {
    name: 'Functions: Unit & Regression Tests',
    cmd: 'npm run test',
    cwd: path.join(ROOT_DIR, 'functions'),
  },

  // --- SECURITY RULES EMULATOR CHECKS ---
  {
    name: 'Rules: Live Emulator Tests (Firestore & Storage)',
    cmd: 'npm run test:rules',
    cwd: ROOT_DIR,
  },
];

console.log('═════════════════════════════════════════════════════════════════');
console.log('          STARTING END-TO-END MASTER QUALITY PIPELINE            ');
console.log('═════════════════════════════════════════════════════════════════\n');

const results = [];
let overallPass = true;

for (let i = 0; i < STEPS.length; i++) {
  const step = STEPS[i];
  const stepNum = String(i + 1).padStart(2, '0');
  process.stdout.write(`▶ [${stepNum}/${STEPS.length}] Running ${step.name}... `);

  const startTime = Date.now();
  try {
    execSync(step.cmd, {
      cwd: step.cwd,
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ PASSED (${duration}s)`);
    results.push({ name: step.name, status: 'PASSED', duration: `${duration}s` });
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`❌ FAILED (${duration}s)\n`);
    console.error(`Command failed: ${step.cmd}`);
    if (err.stdout) console.error(err.stdout.toString().trim());
    if (err.stderr) console.error(err.stderr.toString().trim());
    results.push({ name: step.name, status: 'FAILED', duration: `${duration}s` });
    overallPass = false;
    break; // Stop at first failure
  }
}

console.log('\n═════════════════════════════════════════════════════════════════');
console.log('                    PIPELINE EXECUTION SUMMARY                   ');
console.log('═════════════════════════════════════════════════════════════════');

results.forEach((r, idx) => {
  const num = String(idx + 1).padStart(2, '0');
  const icon = r.status === 'PASSED' ? '✓' : '✖';
  console.log(`  ${icon} [${num}] ${r.name.padEnd(46)}: ${r.status} (${r.duration})`);
});

console.log('═════════════════════════════════════════════════════════════════');

if (overallPass && results.length === STEPS.length) {
  console.log('🎉 ALL QUALITY PIPELINE CHECKS PASSED WITH 100% SUCCESS RATE!\n');
  process.exit(0);
} else {
  console.error('🚨 PIPELINE FAILED. Please resolve the errors above before releasing.\n');
  process.exit(1);
}
