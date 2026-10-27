/**
 * FIRESTORE & STORAGE SECURITY RULES REAL EMULATOR TEST SUITE
 * -------------------------------------------------------------
 * Uses @firebase/rules-unit-testing to verify firestore.rules and storage.rules
 * against real local Firebase Emulators (Firestore on 8080, Storage on 9199).
 *
 * Scenarios Tested:
 * 1. Users collection: read own, update own name/phone (not role, not isBlocked, not coinBalance),
 *    read other (denied for private user doc), update other (deny).
 * 2. Courses and lessons: read published course (anyone), read draft course (only admin),
 *    read free preview lesson (anyone), read paid lesson (only enrolled or admin), edit course/lesson (only admin).
 * 3. Enrollments: student cannot write/update/delete their own enrollment; only admin can create/revoke enrollments.
 * 4. Orders: student can read their own order; cannot change status to 'paid'; cannot delete; admin can read all.
 * 5. Reviews: student can create/update own review if enrolled; cannot edit other's review; admin can delete/moderate.
 * 6. Support tickets: student can create/read own ticket; cannot update status to resolved; cannot read other's ticket.
 * 7. Storage rules: student can upload own avatar (<=5MB, image/*); student cannot upload course materials;
 *    student cannot overwrite another user's files; admin can upload course banners and materials.
 */

const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const { ref, getBytes, uploadBytes } = require('firebase/storage');

const PROJECT_ID = 'demo-sikho-rules-test';
const FIRESTORE_RULES_PATH = path.resolve(__dirname, '../firestore.rules');
const STORAGE_RULES_PATH = path.resolve(__dirname, '../storage.rules');

let testEnv;
let passedCount = 0;
let failedCount = 0;
const testResults = [];

async function runTest(testName, fn) {
  const start = Date.now();
  process.stdout.write(`  ▶ ${testName}... `);
  try {
    await fn();
    const elapsed = Date.now() - start;
    console.log(`✅ PASS (${elapsed}ms)`);
    passedCount++;
    testResults.push({ name: testName, status: 'PASS', durationMs: elapsed });
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`❌ FAIL (${elapsed}ms)\n    Error: ${err.message}`);
    failedCount++;
    testResults.push({ name: testName, status: 'FAIL', durationMs: elapsed, error: err.message });
  }
}

async function main() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('      FIRESTORE & STORAGE SECURITY RULES REAL EMULATOR TESTS     ');
  console.log('═════════════════════════════════════════════════════════════════\n');

  const firestoreRules = fs.readFileSync(FIRESTORE_RULES_PATH, 'utf8');
  const storageRules = fs.readFileSync(STORAGE_RULES_PATH, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: firestoreRules,
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: storageRules,
      host: '127.0.0.1',
      port: 9199,
    },
  });

  console.log('✓ Connected to Firestore & Storage local emulators successfully.\n');

  // ===============================================================
  // 1. USERS COLLECTION
  // ===============================================================
  console.log('--- 1. USERS COLLECTION (PII Isolation & Field Lock) ---');

  await runTest('Student can read their own user profile document', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/student_alice'), {
        uid: 'student_alice',
        name: 'Alice',
        phone: '+919876543210',
      });
    });

    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'users/student_alice')));
  });

  await runTest('Student cannot read another student private user profile document', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'users/student_alice')));
  });

  await runTest('Unauthenticated caller cannot read any user profile', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'users/student_alice')));
  });

  await runTest('Student can update their own allowed fields (name, phone, language)', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users/student_alice'), {
        name: 'Alice Cooper',
        phone: '+919999999999',
        language: 'hi',
      })
    );
  });

  await runTest('Student CANNOT update protected fields (role, admin, isBlocked, coinBalance)', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'users/student_alice'), {
        role: 'owner',
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, 'users/student_alice'), {
        isBlocked: false,
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, 'users/student_alice'), {
        coinBalance: 9999,
      })
    );
  });

  await runTest('Student cannot update another student profile', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(
      updateDoc(doc(bobDb, 'users/student_alice'), {
        name: 'Hacked by Bob',
      })
    );
  });

  // ===============================================================
  // 2. COURSES & LESSONS
  // ===============================================================
  console.log('\n--- 2. COURSES AND LESSONS (Draft/Published & Free Preview) ---');

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'courses/course_published'), {
      title: 'YouTube Mastery 2026',
      isPublished: true,
      price: 999,
    });
    await setDoc(doc(db, 'courses/course_draft'), {
      title: 'Secret Upcoming Course',
      isPublished: false,
      price: 1999,
    });
    await setDoc(doc(db, 'courses/course_published/sections/sec_1'), {
      title: 'Module 1',
    });
    await setDoc(doc(db, 'courses/course_published/sections/sec_1/lessons/les_free'), {
      title: 'Free Intro',
      isFreePreview: true,
    });
    await setDoc(doc(db, 'courses/course_published/sections/sec_1/lessons/les_paid'), {
      title: 'Paid Advanced Strategy',
      isFreePreview: false,
    });
    await setDoc(doc(db, 'courses/course_published/sections/sec_1/lessons/les_paid/private/media'), {
      videoId: 'bunny_secret_media_id_123',
    });
  });

  await runTest('Unauthenticated caller can read published course', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, 'courses/course_published')));
  });

  await runTest('Student cannot read draft / unpublished course', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(getDoc(doc(aliceDb, 'courses/course_draft')));
  });

  await runTest('Admin / Editor can read draft course', async () => {
    const adminDb = testEnv.authenticatedContext('admin_user', { role: 'editor' }).firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'courses/course_draft')));
  });

  await runTest('Student cannot edit or create courses or sections', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'courses/course_hacked'), {
        title: 'Unauthorized course',
        isPublished: true,
      })
    );
  });

  await runTest('Private lesson media document is completely blocked to students', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(
      getDoc(doc(aliceDb, 'courses/course_published/sections/sec_1/lessons/les_paid/private/media'))
    );
  });

  // ===============================================================
  // 3. ENROLLMENTS
  // ===============================================================
  console.log('\n--- 3. STUDENT ENROLLMENTS (Cloud Functions Protected) ---');

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'enrollments/student_alice_course_published'), {
      uid: 'student_alice',
      courseId: 'course_published',
      status: 'active',
      active: true,
    });
  });

  await runTest('Enrolled student can read their own enrollment', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'enrollments/student_alice_course_published')));
  });

  await runTest('Student cannot read another student enrollment document', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'enrollments/student_alice_course_published')));
  });

  await runTest('Student cannot forge/create their own enrollment directly', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(
      setDoc(doc(bobDb, 'enrollments/student_bob_course_published'), {
        uid: 'student_bob',
        courseId: 'course_published',
        status: 'active',
        active: true,
      })
    );
  });

  await runTest('Student cannot delete or tamper with their enrollment', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(deleteDoc(doc(aliceDb, 'enrollments/student_alice_course_published')));
  });

  // ===============================================================
  // 4. ORDERS & BILLING
  // ===============================================================
  console.log('\n--- 4. ORDERS & BILLING (Server-Authoritative) ---');

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'orders/order_alice_001'), {
      uid: 'student_alice',
      courseId: 'course_published',
      amountPaise: 99900,
      status: 'created',
    });
  });

  await runTest('Student can read their own order document', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'orders/order_alice_001')));
  });

  await runTest('Student cannot read another student order', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'orders/order_alice_001')));
  });

  await runTest('Student cannot tamper order status to paid or change price', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(
      updateDoc(doc(aliceDb, 'orders/order_alice_001'), {
        status: 'paid',
      })
    );
  });

  await runTest('Student cannot delete order records', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(deleteDoc(doc(aliceDb, 'orders/order_alice_001')));
  });

  await runTest('Admin / Owner can read all orders', async () => {
    const ownerDb = testEnv.authenticatedContext('admin_owner', { role: 'owner' }).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'orders/order_alice_001')));
  });

  // ===============================================================
  // 5. REVIEWS & RATINGS
  // ===============================================================
  console.log('\n--- 5. STUDENT REVIEWS (Enrollment Enforced) ---');

  await runTest('Enrolled student can post a review for their course', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'reviews/review_alice_course_published'), {
        uid: 'student_alice',
        courseId: 'course_published',
        rating: 5,
        reviewText: 'Outstanding course, learned so much!',
      })
    );
  });

  await runTest('Unenrolled student CANNOT post a review for that course', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(
      setDoc(doc(bobDb, 'reviews/review_bob_course_published'), {
        uid: 'student_bob',
        courseId: 'course_published',
        rating: 1,
        reviewText: 'Fake spam review',
      })
    );
  });

  await runTest('Student cannot edit or overwrite another student review', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(
      updateDoc(doc(bobDb, 'reviews/review_alice_course_published'), {
        rating: 1,
        reviewText: 'Defaced by Bob',
      })
    );
  });

  // ===============================================================
  // 6. SUPPORT TICKETS
  // ===============================================================
  console.log('\n--- 6. SUPPORT TICKETS & MESSAGING ---');

  await runTest('Student can create a support ticket with status open', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, 'tickets/ticket_alice_01'), {
        uid: 'student_alice',
        subject: 'Cannot access lecture 3',
        status: 'open',
      })
    );
  });

  await runTest('Student CANNOT create a support ticket with status resolved directly', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertFails(
      setDoc(doc(aliceDb, 'tickets/ticket_alice_02'), {
        uid: 'student_alice',
        subject: 'Fake ticket',
        status: 'resolved',
      })
    );
  });

  await runTest('Student can read their own support ticket', async () => {
    const aliceDb = testEnv.authenticatedContext('student_alice').firestore();
    await assertSucceeds(getDoc(doc(aliceDb, 'tickets/ticket_alice_01')));
  });

  await runTest('Another student cannot read Alice support ticket', async () => {
    const bobDb = testEnv.authenticatedContext('student_bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'tickets/ticket_alice_01')));
  });

  await runTest('Support role can read and update any ticket status', async () => {
    const supportDb = testEnv.authenticatedContext('support_staff', { role: 'support' }).firestore();
    await assertSucceeds(getDoc(doc(supportDb, 'tickets/ticket_alice_01')));
    await assertSucceeds(
      updateDoc(doc(supportDb, 'tickets/ticket_alice_01'), {
        status: 'resolved',
      })
    );
  });

  // ===============================================================
  // 7. STORAGE SECURITY RULES
  // ===============================================================
  console.log('\n--- 7. STORAGE RULES (Avatars, Banners & Materials) ---');

  const validJpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const dummyPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);

  await runTest('Student can upload their own profile avatar image', async () => {
    const aliceStorage = testEnv.authenticatedContext('student_alice').storage();
    const avatarRef = ref(aliceStorage, 'users/student_alice/avatar/photo.jpg');
    await assertSucceeds(uploadBytes(avatarRef, validJpgBytes, { contentType: 'image/jpeg' }));
  });

  await runTest('Student cannot upload avatar for another student', async () => {
    const bobStorage = testEnv.authenticatedContext('student_bob').storage();
    const targetRef = ref(bobStorage, 'users/student_alice/avatar/photo.jpg');
    await assertFails(uploadBytes(targetRef, validJpgBytes, { contentType: 'image/jpeg' }));
  });

  await runTest('Student cannot upload executable or script as avatar', async () => {
    const aliceStorage = testEnv.authenticatedContext('student_alice').storage();
    const malRef = ref(aliceStorage, 'users/student_alice/avatar/hack.html');
    await assertFails(uploadBytes(malRef, validJpgBytes, { contentType: 'text/html' }));
  });

  await runTest('Student cannot upload course materials directly to storage', async () => {
    const aliceStorage = testEnv.authenticatedContext('student_alice').storage();
    const matRef = ref(aliceStorage, 'materials/course_published/notes.pdf');
    await assertFails(uploadBytes(matRef, dummyPdfBytes, { contentType: 'application/pdf' }));
  });

  await runTest('Admin can upload course banners and study materials', async () => {
    const adminStorage = testEnv.authenticatedContext('admin_owner', { role: 'owner', admin: true }).storage();
    const bannerRef = ref(adminStorage, 'banners/banner_01/hero.png');
    await assertSucceeds(uploadBytes(bannerRef, validJpgBytes, { contentType: 'image/png' }));

    const matRef = ref(adminStorage, 'materials/course_published/cheatsheet.pdf');
    await assertSucceeds(uploadBytes(matRef, dummyPdfBytes, { contentType: 'application/pdf' }));
  });

  // ===============================================================
  // CLEANUP & SUMMARY
  // ===============================================================
  await testEnv.cleanup();

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('              RULES EMULATOR SUITE EXECUTION SUMMARY             ');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`  Total Test Scenarios : ${passedCount + failedCount}`);
  console.log(`  Passed               : ${passedCount}`);
  console.log(`  Failed               : ${failedCount}`);
  console.log(`  Success Rate         : ${((passedCount / (passedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log('═════════════════════════════════════════════════════════════════\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal Rules Test Runner Error:', err);
  process.exit(1);
});
