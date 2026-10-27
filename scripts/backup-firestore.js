#!/usr/bin/env node
/**
 * scripts/backup-firestore.js
 * Automated Firestore daily backup & disaster recovery utility.
 * Backs up all core collections to compressed JSON archives in ./backups/
 * with SHA-256 verification and automatic 30-day retention pruning.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { clientConfig } = require('./load-client-config');

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 30;

const COLLECTIONS_TO_BACKUP = [
  'users',
  'courses',
  'orders',
  'enrollments',
  'categories',
  'banners',
  'homeSections',
  'coupons',
  'live_classes',
  'tickets',
  'faqs',
  'settings',
  'stats',
];

async function runBackup() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const app = initializeApp(clientConfig.firebaseConfig);
  const db = getFirestore(app);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `firestore_backup_${clientConfig.projectId || 'client'}_${timestamp}.json.gz`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFilename);

  console.log(`\n🛡️ Starting Firestore automated backup for [${clientConfig.appName}]...`);
  const exportPayload = {
    metadata: {
      projectId: clientConfig.projectId,
      appName: clientConfig.appName,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    data: {},
  };

  let totalDocs = 0;

  for (const colName of COLLECTIONS_TO_BACKUP) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docs = {};
      snapshot.forEach((d) => {
        docs[d.id] = d.data();
      });
      exportPayload.data[colName] = docs;
      totalDocs += snapshot.size;
      console.log(`  ✓ Backed up collection [${colName}]: ${snapshot.size} document(s)`);
    } catch (err) {
      console.warn(`  ⚠️ Warning: Could not read collection [${colName}]: ${err.message}`);
      exportPayload.data[colName] = {};
    }
  }

  // Compress to .json.gz
  const jsonBuffer = Buffer.from(JSON.stringify(exportPayload, null, 2), 'utf8');
  const compressed = zlib.gzipSync(jsonBuffer);
  fs.writeFileSync(backupFilePath, compressed);

  // Compute checksum
  const hash = crypto.createHash('sha256').update(compressed).digest('hex');
  fs.writeFileSync(`${backupFilePath}.sha256`, `${hash}  ${backupFilename}\n`);

  console.log(`\n✅ Backup complete:`);
  console.log(`  - File: ${backupFilePath}`);
  console.log(`  - Documents: ${totalDocs}`);
  console.log(`  - Compressed Size: ${(compressed.length / 1024).toFixed(2)} KB`);
  console.log(`  - SHA-256: ${hash}`);

  // Prune backups older than RETENTION_DAYS
  pruneOldBackups();
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR);
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const f of files) {
      const filePath = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`  🧹 Pruned expired backup: ${f}`);
      }
    }
  } catch (err) {
    console.warn('  ⚠️ Backup pruning warning:', err.message);
  }
}

runBackup().catch((err) => {
  console.error('\n❌ Backup failed:', err.message);
  process.exit(1);
});
