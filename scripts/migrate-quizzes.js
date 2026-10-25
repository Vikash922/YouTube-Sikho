/**
 * Script to migrate legacy quiz schema to Part 6.1 Canonical Schema
 * Usage: node scripts/migrate-quizzes.js
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateQuizzes() {
  console.log('--- Starting Quiz Schema Migration ---');
  const quizzesSnap = await db.collection('quizzes').get();
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
  process.exit(1);
});
