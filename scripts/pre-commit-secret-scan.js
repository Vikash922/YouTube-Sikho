#!/usr/bin/env node
/**
 * scripts/pre-commit-secret-scan.js
 * Scans git staged files for accidentally included secrets before commit.
 * Can also be run directly in CI or local auditing:
 *   node scripts/pre-commit-secret-scan.js [--all]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCAN_ALL = process.argv.includes('--all');

// Patterns that block commits
const SECRET_RULES = [
  {
    name: 'Private Key Block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  },
  {
    name: 'Live Razorpay Key ID',
    pattern: /rzp_live_[0-9a-zA-Z]{14}/,
  },
  {
    name: 'Razorpay Secret Key',
    pattern: /['"][0-9a-zA-Z]{24}['"]\s*.*razorpay.*secret/i,
  },
  {
    name: 'GCP Service Account Private Key',
    pattern: /"private_key":\s*"-----BEGIN PRIVATE KEY/,
  },
  {
    name: 'AWS / Cloudflare Access Key',
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
  },
  {
    name: 'Live Webhook Secret Token',
    pattern: /whsec_[0-9a-zA-Z]{32,}/,
  },
  {
    name: 'Hardcoded Admin Password Assignment',
    pattern: /(?:admin_password|adminPassword|ADMIN_PASSWORD)\s*=\s*['"][^'"]{8,}['"]/,
  },
];

// Files that should NEVER be committed regardless of content
const BLOCKED_EXTENSIONS = ['.keystore', '.jks', '.p12', '.pem'];
const BLOCKED_FILENAMES = ['serviceAccountKey.json', 'service-account.json'];

function getFilesToScan() {
  try {
    if (SCAN_ALL) {
      const output = execSync('git ls-files', { encoding: 'utf8' });
      return output.split('\n').filter(Boolean);
    }
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (err) {
    console.error('Failed to get files from git:', err.message);
    return [];
  }
}

function scan() {
  const files = getFilesToScan();
  if (files.length === 0) {
    console.log('Secret Scan: No files to scan.');
    process.exit(0);
  }

  let violations = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file);

    // 1. Extension / file-name check
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      violations.push({
        file,
        rule: `Prohibited sensitive extension (${ext})`,
        line: 1,
      });
      continue;
    }

    if (BLOCKED_FILENAMES.includes(base)) {
      violations.push({
        file,
        rule: `Prohibited credential filename (${base})`,
        line: 1,
      });
      continue;
    }

    // Skip scanning this scan script or binary files or images
    if (file === 'scripts/pre-commit-secret-scan.js') continue;
    if (['.png', '.jpg', '.jpeg', '.webp', '.ico', '.pdf', '.woff', '.woff2', '.ttf'].includes(ext)) continue;

    if (!fs.existsSync(file)) continue;

    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const rule of SECRET_RULES) {
          if (rule.pattern.test(line)) {
            violations.push({
              file,
              rule: rule.name,
              line: i + 1,
              sample: line.trim().substring(0, 80),
            });
          }
        }
      }
    } catch {
      // Ignore binary or unreadable files
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 [PRE-COMMIT SECRET SCAN FAILED] Sensitive secrets detected:');
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} [${v.rule}]`);
      if (v.sample) console.error(`    Matching: ${v.sample}`);
    }
    console.error('\nCommit aborted. Remove sensitive keys before staging.\n');
    process.exit(1);
  }

  console.log(`✅ Secret scan passed: ${files.length} file(s) checked. No committed secrets found.`);
  process.exit(0);
}

scan();
