/**
 * Script to migrate legacy quiz schema to Part 6.1 Canonical Schema
 * Usage: node scripts/migrate-quizzes.js [--key=<path-to-service-account.json>]
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
const keyFlag = args.find((a) => a.startsWith('--key='));
let serviceAccountPath = keyFlag ? keyFlag.split('=')[1] : null;

if (!serviceAccountPath) {
  const possiblePaths = [
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(__dirname, '../service-account.json'),
    path.resolve(__dirname, '../serviceAccountKey.json'),
    path.resolve(__dirname, '../functions/serviceAccountKey.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      break;
    }
  }
}

if (!admin.apps.length) {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'sikho-77341',
    });
    console.log(`Using Service Account credentials from ${serviceAccountPath}`);
  } else {
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'sikho-77341',
    });
    console.log('Using Application Default Credentials (ADC) / Environment');
  }
}

const db = admin.firestore();

async function migrateQuizzes() {
  console.log('--- Starting Quiz Schema Migration ---');
  let quizzesSnap;
  try {
    quizzesSnap = await db.collection('quizzes').get();
  } catch (err) {
    console.error('Failed to connect or fetch quizzes from Firestore:', err.message);
    console.log('\nTip: To authenticate the Admin SDK on your machine, you can:');
    console.log('1. Place your Firebase service account JSON key as serviceAccountKey.json in the project root, or');
    console.log('2. Run: node scripts/migrate-quizzes.js --key=/path/to/key.json, or');
    console.log('3. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json');
    return;
  }

  console.log(`Found ${quizzesSnap.size} quizzes to inspect.`);

  let updatedQuizzes = 0;
  let updatedQuestions = 0;

  for (const qDoc of quizzesSnap.docs) {
    const data = qDoc.data();
    const updates = {};

    // Canonical timeLimitMinutes
    if (data.timeLimitMinutes === undefined && data.durationMinutes !== undefined) {
      updates.timeLimitMinutes = Number(data.durationMinutes);
    } else if (data.timeLimitMinutes === undefined) {
      updates.timeLimitMinutes = 15;
    }

    // Canonical passingPercentage
    if (data.passingPercentage === undefined && data.passMarks !== undefined) {
      const total = data.totalMarks || 10;
      updates.passingPercentage = Math.round((Number(data.passMarks) / total) * 100);
    } else if (data.passingPercentage === undefined) {
      updates.passingPercentage = 60;
    }

    // Canonical flags
    if (data.allowRetries === undefined) updates.allowRetries = true;
    if (data.maxAttempts === undefined) updates.maxAttempts = 0;
    if (data.negativeMarkingEnabled === undefined) {
      updates.negativeMarkingEnabled = (data.negativeMarkingRate || 0) > 0;
    }
    if (data.negativeMarkingRate === undefined) {
      updates.negativeMarkingRate = 0.25;
    }
    if (data.showAnswersAfterSubmit === undefined) updates.showAnswersAfterSubmit = false;
    if (data.isPublished === undefined) updates.isPublished = true;

    // Check questions subcollection
    const questionsSnap = await db.collection('quizzes').doc(qDoc.id).collection('questions').get();
    updates.questionCount = questionsSnap.size;

    if (Object.keys(updates).length > 0) {
      await qDoc.ref.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatedQuizzes++;
    }

    let order = 1;
    for (const q of questionsSnap.docs) {
      const qData = q.data();
      const qUpdates = {};

      if (qData.question === undefined && qData.questionText) {
        qUpdates.question = qData.questionText;
      }
      if (qData.correctAnswerIndex === undefined && qData.correctOptionIndex !== undefined) {
        qUpdates.correctAnswerIndex = Number(qData.correctOptionIndex);
      }
      if (qData.order === undefined) {
        qUpdates.order = order;
      }
      if (qData.marks === undefined) {
        qUpdates.marks = 1;
      }

      if (Object.keys(qUpdates).length > 0) {
        await q.ref.update(qUpdates);
        updatedQuestions++;
      }
      order++;
    }
  }

  console.log(`--- Migration Finished ---`);
  console.log(`Updated ${updatedQuizzes} quizzes and ${updatedQuestions} questions.`);
}

migrateQuizzes().catch((err) => {
  console.error('Migration failed:', err);
});
