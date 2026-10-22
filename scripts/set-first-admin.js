/**
 * FIRST ADMIN SETUP SCRIPT
 * -------------------------------------------------------------
 * Usage:
 *   1. Using UID (Recommended if Email/Password provider is pending in Console):
 *      node scripts/set-first-admin.js --uid <UID> [email]
 *      Example: node scripts/set-first-admin.js --uid 4kL89sDjsa92 admin@youtubesikho.com
 *
 *   2. Using Email & Password (Requires Email/Password provider enabled in Console):
 *      node scripts/set-first-admin.js [email] [password]
 *      Example: node scripts/set-first-admin.js admin@youtubesikho.com Admin@123456
 */

const { initializeApp } = require('firebase/app');
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { clientConfig } = require('../src/config/client.config.js');

const app = initializeApp(clientConfig.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const args = process.argv.slice(2);

async function bootstrapAdmin() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('               BOOTSTRAPPING FIRST ADMIN ACCOUNT                ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  let uid = null;
  let email = 'admin@youtubesikho.com';

  if (args[0] === '--uid') {
    uid = args[1];
    email = args[2] || 'admin@youtubesikho.com';
    if (!uid) {
      console.error('Error: Please provide a UID: node scripts/set-first-admin.js --uid <UID>');
      process.exit(1);
    }
    console.log(`▶ Using direct UID: ${uid} (Email: ${email})`);
  } else {
    email = args[0] || 'admin@youtubesikho.com';
    const password = args[1] || 'Admin@123456';
    console.log(`▶ Target Email: ${email}`);

    try {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
        console.log(`✓ Admin user created in Firebase Auth with UID: ${uid}`);
      } catch (createErr) {
        if (createErr.code === 'auth/email-already-in-use') {
          console.log('ℹ Account exists. Signing in to retrieve UID...');
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          uid = userCredential.user.uid;
          console.log(`✓ Signed in existing admin user with UID: ${uid}`);
        } else {
          throw createErr;
        }
      }
    } catch (authErr) {
      if (authErr.code === 'auth/operation-not-allowed') {
        console.warn('\n⚠️  NOTICE: Firebase Email/Password provider is not yet enabled in Firebase Console.');
        console.warn('👉 To enable it: Go to Firebase Console > Authentication > Sign-in method > Enable Email/Password');
        console.warn('   URL: https://console.firebase.google.com/project/sikho-77341/authentication/providers\n');
        console.warn('💡 You can also promote your existing Phone or Google Sign-In UID directly:');
        console.warn('   node scripts/set-first-admin.js --uid <YOUR_UID>\n');

        // Provision a default admin UID placeholder so the database admin collection is initialized
        uid = 'admin_bootstrap_default';
        console.log(`ℹ Provisioning bootstrap admin document with fallback ID: ${uid}...`);
      } else {
        throw authErr;
      }
    }
  }

  try {
    // 1. Write to /admins/{uid}
    console.log(`▶ Granting admin rights in Firestore: /admins/${uid}...`);
    await setDoc(doc(db, 'admins', uid), {
      email,
      role: 'admin',
      active: true,
      promotedAt: serverTimestamp(),
      systemBootstrap: true,
    }, { merge: true });
    console.log(`✓ Document /admins/${uid} written successfully.`);

    // 2. Write / update /users/{uid}
    console.log(`▶ Updating user profile in /users/${uid}...`);
    await setDoc(doc(db, 'users', uid), {
      name: 'Super Admin',
      email,
      role: 'admin',
      isBlocked: false,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`✓ Document /users/${uid} updated.`);

    console.log('\n═════════════════════════════════════════════════════════════════');
    console.log('🎉 FIRST ADMIN SETUP COMPLETE!');
    console.log(`Email: ${email}`);
    console.log(`UID:   ${uid}`);
    console.log('═════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (dbErr) {
    console.error('✗ Failed to write admin document to Firestore:', dbErr.message || dbErr);
    process.exit(1);
  }
}

bootstrapAdmin();
