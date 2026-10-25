/**
 * FIRST ADMIN SETUP SCRIPT (SECURE ADMIN SDK)
 * -------------------------------------------------------------
 * Sets the `{ admin: true }` custom claim on a Firebase Auth user
 * and registers them in Firestore `/admins/{uid}` and `/users/{uid}`.
 *
 * Usage:
 *   node scripts/set-first-admin.js --service-account <path-to-key.json> --email <user-email>
 *   node scripts/set-first-admin.js --service-account <path-to-key.json> --uid <user-uid>
 *
 * Environment variable alternative:
 *   export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
 *   node scripts/set-first-admin.js --email <user-email>
 */

const fs = require('fs');
const path = require('path');

// Resolve firebase-admin safely
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  try {
    admin = require('../functions/node_modules/firebase-admin');
  } catch (e2) {
    try {
      admin = require('./functions/node_modules/firebase-admin');
    } catch (e3) {
      console.error('Error: firebase-admin is required. Please install it or run from repo root.');
      process.exit(1);
    }
  }
}

const { clientConfig } = require('./load-client-config');

// Parse CLI flags
const args = process.argv.slice(2);
let serviceAccountPath = null;
let targetEmail = null;
let targetUid = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--service-account' || arg === '-s') {
    serviceAccountPath = args[++i];
  } else if (arg === '--email' || arg === '-e') {
    targetEmail = args[++i];
  } else if (arg === '--uid' || arg === '-u') {
    targetUid = args[++i];
  } else if (!targetEmail && !targetUid && !arg.startsWith('-')) {
    if (arg.includes('@')) {
      targetEmail = arg;
    } else {
      targetUid = arg;
    }
  }
}

async function main() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('            FIREBASE ADMIN ROLE PROMOTION TOOL                  ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  if (!targetEmail && !targetUid) {
    console.error('Error: You must provide a target user email or UID.');
    console.log('\nUsage Examples:');
    console.log('  node scripts/set-first-admin.js --service-account serviceAccountKey.json --email admin@example.com');
    console.log('  node scripts/set-first-admin.js --service-account serviceAccountKey.json --uid <USER_UID>');
    console.log('\nHow to obtain a Service Account Key:');
    console.log('  1. Open Firebase Console: https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk');
    console.log('  2. Click "Generate new private key".');
    console.log('  3. Save the JSON file and pass its path using --service-account <path>.\n');
    process.exit(1);
  }

  // Determine credentials
  const credPath = serviceAccountPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credential;

  if (credPath) {
    const absPath = path.resolve(process.cwd(), credPath);
    if (!fs.existsSync(absPath)) {
      console.error(`Error: Service account key file not found at: ${absPath}`);
      process.exit(1);
    }
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(absPath, 'utf8'));
      credential = admin.credential.cert(serviceAccount);
      console.log(`✓ Loaded service account credentials from: ${absPath}`);
    } catch (parseErr) {
      console.error(`Error parsing service account JSON: ${parseErr.message}`);
      process.exit(1);
    }
  } else {
    console.log('ℹ No --service-account specified. Attempting Application Default Credentials (ADC)...');
    try {
      credential = admin.credential.applicationDefault();
    } catch (adcErr) {
      console.error('Error: Missing service account credentials.');
      console.error('Provide a service account key using: --service-account <path-to-json>');
      process.exit(1);
    }
  }

  // Initialize Admin App
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential,
      projectId: clientConfig?.firebaseConfig?.projectId,
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // Find target user
  let userRecord;
  try {
    if (targetUid) {
      console.log(`▶ Looking up user by UID: ${targetUid}...`);
      userRecord = await auth.getUser(targetUid);
    } else if (targetEmail) {
      console.log(`▶ Looking up user by Email: ${targetEmail}...`);
      userRecord = await auth.getUserByEmail(targetEmail);
    }
  } catch (lookupErr) {
    console.error(`✗ User lookup failed: ${lookupErr.message}`);
    console.error('Make sure the user has already registered or logged in at least once.');
    process.exit(1);
  }

  const uid = userRecord.uid;
  const email = userRecord.email || targetEmail || 'unknown@domain';

  console.log(`✓ User found: UID=${uid}, Email=${email}`);

  // 1. Set Custom Claim: { admin: true }
  console.log('▶ Setting custom claim { admin: true }...');
  const currentClaims = userRecord.customClaims || {};
  await auth.setCustomUserClaims(uid, {
    ...currentClaims,
    admin: true,
  });
  console.log('✓ Firebase Auth custom claim { admin: true } granted successfully.');

  // 2. Set Firestore /admins/{uid}
  console.log(`▶ Writing /admins/${uid} document...`);
  await db.collection('admins').doc(uid).set(
    {
      email,
      role: 'admin',
      active: true,
      promotedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✓ Document /admins/${uid} updated.`);

  // 3. Update /users/{uid}
  console.log(`▶ Updating /users/${uid} profile...`);
  await db.collection('users').doc(uid).set(
    {
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✓ Document /users/${uid} updated.`);

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('🎉 ADMIN PROMOTION COMPLETE!');
  console.log(`User: ${email} (UID: ${uid})`);
  console.log('IMPORTANT: The user must sign out and sign back in for the new');
  console.log('custom claim token to take effect in their session.');
  console.log('═════════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal execution error:', err.message || err);
  process.exit(1);
});
