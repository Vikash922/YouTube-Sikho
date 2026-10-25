#!/usr/bin/env node

/**
 * 📦 CURRICULUM DATA MIGRATION SCRIPT
 * ---------------------------------------------------------------------
 * Migrates courses from legacy embedded 'sections' array to subcollections:
 *   /courses/{courseId}/sections/{sectionId}
 *   /courses/{courseId}/sections/{sectionId}/lessons/{lessonId}
 *   /courses/{courseId}/sections/{sectionId}/lessons/{lessonId}/private/media
 *
 * Usage:
 *   node scripts/migrate-curriculum.js [--key=<path-to-service-account.json>] [--commit]
 *
 * Default is DRY RUN (no writes committed, creates local backup JSON).
 */

const fs = require('fs');
const path = require('path');

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  try {
    admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
  } catch (e2) {
    console.error('Could not load firebase-admin. Please ensure functions/node_modules is installed.');
    process.exit(1);
  }
}

// Parse CLI flags
const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const keyFlag = args.find((a) => a.startsWith('--key='));
let serviceAccountPath = keyFlag ? keyFlag.split('=')[1] : null;

// Search common default service account locations if not explicitly passed
if (!serviceAccountPath) {
  const possiblePaths = [
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(__dirname, '../service-account.json'),
    path.resolve(__dirname, '../serviceAccountKey.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      break;
    }
  }
}

console.log('═════════════════════════════════════════════════════════════════');
console.log('       CURRICULUM SUBCOLLECTION MIGRATION UTILITY               ');
console.log('═════════════════════════════════════════════════════════════════');
console.log(`Mode:    ${isCommit ? '🔥 COMMIT (REAL FIRESTORE WRITES)' : '🛡 DRY RUN (SAFE PREVIEW - NO WRITES)'}`);
console.log(`Auth:    ${serviceAccountPath ? `Service Account (${serviceAccountPath})` : 'Default ADC / Environment Credentials'}`);
console.log('═════════════════════════════════════════════════════════════════\n');

// Initialize Firebase Admin
if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'sikho-77341',
  });
} else {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'sikho-77341',
  });
}

const db = admin.firestore();

async function runMigration() {
  const coursesSnap = await db.collection('courses').get();
  console.log(`Found ${coursesSnap.size} courses in Firestore.\n`);

  if (coursesSnap.empty) {
    console.log('No courses found to migrate.');
    return;
  }

  // 1. Create a local backup of all course documents
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-courses-${timestamp}.json`);

  const backupData = {};
  coursesSnap.docs.forEach((doc) => {
    backupData[doc.id] = doc.data();
  });
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`✓ Created local backup file: ${backupFile}\n`);

  let migratedCoursesCount = 0;
  let skippedCoursesCount = 0;

  for (const courseDoc of coursesSnap.docs) {
    const courseId = courseDoc.id;
    const courseData = courseDoc.data();
    const rawSections = courseData.sections;

    console.log(`▶ Inspecting course [${courseId}] - "${courseData.title || 'Untitled'}"...`);

    // Check if course has already been migrated (subcollection exists or sections array missing)
    const existingSectionsSnap = await courseDoc.ref.collection('sections').limit(1).get();
    const hasSubcollections = !existingSectionsSnap.empty;

    if (!Array.isArray(rawSections) || rawSections.length === 0) {
      if (hasSubcollections) {
        console.log(`  ↪ Subcollections already exist and no embedded 'sections' array. Skipping (Idempotent).`);
      } else {
        console.log(`  ↪ Course has no curriculum sections. Skipping.`);
      }
      skippedCoursesCount++;
      continue;
    }

    console.log(`  Found embedded 'sections' array with ${rawSections.length} module(s). Processing...`);

    let totalLessonsCount = 0;
    let totalDurationSeconds = 0;

    const sectionsToMigrate = [];

    rawSections.forEach((sec, sIdx) => {
      const sectionId = sec.id || `sec_${sIdx + 1}_${Date.now().toString(36)}`;
      const sectionTitle = sec.title || `Module ${sIdx + 1}`;
      const sectionOrder = Number(sec.order !== undefined ? sec.order : sIdx + 1);

      const lessons = Array.isArray(sec.lessons) ? sec.lessons : [];
      const lessonsToMigrate = [];

      lessons.forEach((les, lIdx) => {
        totalLessonsCount++;
        const lessonId = les.id || `les_${lIdx + 1}_${Date.now().toString(36)}`;
        const durationSec = Number(les.durationSeconds || (les.duration ? Number(les.duration) : 0));
        totalDurationSeconds += durationSec;

        const publicLesson = {
          title: les.title || `Lesson ${lIdx + 1}`,
          type: les.type || (les.videoId ? 'video' : les.pdfUrl ? 'pdf' : 'video'),
          order: Number(les.order !== undefined ? les.order : lIdx + 1),
          durationSeconds: durationSec,
          isFreePreview: Boolean(les.isFreePreview),
          quizId: les.quizId || null,
          hasMedia: Boolean(les.videoId || les.pdfUrl || les.pdfPath),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const privateMedia = {
          videoId: les.videoId || '',
          pdfPath: les.pdfPath || les.pdfUrl || '',
          libraryId: les.libraryId || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        lessonsToMigrate.push({
          lessonId,
          publicLesson,
          privateMedia,
        });
      });

      sectionsToMigrate.push({
        sectionId,
        sectionTitle,
        sectionOrder,
        lessons: lessonsToMigrate,
      });
    });

    console.log(`  ↪ Computed: ${totalLessonsCount} lessons across ${sectionsToMigrate.length} sections (${Math.round(totalDurationSeconds / 60)} minutes total).`);

    if (isCommit) {
      // Execute batched writes for sections and lessons
      const batch = db.batch();

      for (const s of sectionsToMigrate) {
        const secRef = courseDoc.ref.collection('sections').doc(s.sectionId);
        batch.set(secRef, {
          title: s.sectionTitle,
          order: s.sectionOrder,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        for (const l of s.lessons) {
          const lesRef = secRef.collection('lessons').doc(l.lessonId);
          batch.set(lesRef, l.publicLesson, { merge: true });

          const mediaRef = lesRef.collection('private').doc('media');
          batch.set(mediaRef, l.privateMedia, { merge: true });
        }
      }

      // Update parent course doc: set metrics, remove embedded sections array & video references
      batch.update(courseDoc.ref, {
        totalLessons: totalLessonsCount,
        totalDurationSeconds: totalDurationSeconds,
        thumbnailUrl: courseData.thumbnailUrl || courseData.thumbnail || courseData.image || '',
        sections: admin.firestore.FieldValue.delete(),
        videoId: admin.firestore.FieldValue.delete(),
        pdfUrl: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      console.log(`  ✓ Successfully committed subcollections and cleansed course document.`);
      migratedCoursesCount++;
    } else {
      console.log(`  [DRY RUN] Would write ${sectionsToMigrate.length} section docs, ${totalLessonsCount} lesson docs, and ${totalLessonsCount} private/media docs.`);
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(`MIGRATION SUMMARY:`);
  console.log(`  Total courses processed:  ${coursesSnap.size}`);
  console.log(`  Courses migrated:          ${isCommit ? migratedCoursesCount : `(Would migrate ${coursesSnap.size - skippedCoursesCount})`}`);
  console.log(`  Courses skipped:           ${skippedCoursesCount}`);
  if (!isCommit) {
    console.log(`\nTo execute these changes against your Firestore database, re-run with:`);
    console.log(`  node scripts/migrate-curriculum.js --commit`);
  }
  console.log('═════════════════════════════════════════════════════════════════');
}

runMigration().catch((err) => {
  console.error('\n✗ Migration failed with error:', err);
  process.exit(1);
});
