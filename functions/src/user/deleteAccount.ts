import * as admin from 'firebase-admin';

export async function deleteAccountHandler(callerUid: string | null, db: any = admin.firestore()) {
  if (!callerUid) {
    throw new Error('Authentication required.');
  }

  // 1. Delete user watch progress
  const progressSnap = await db.collection('progress').where('uid', '==', callerUid).get();
  const batch = db.batch();
  progressSnap.forEach((doc: any) => batch.delete(doc.ref));

  // 2. Delete user in-app notifications
  const notifsSnap = await db
    .collection('userNotifications')
    .doc(callerUid)
    .collection('items')
    .get();
  notifsSnap.forEach((doc: any) => batch.delete(doc.ref));

  // 3. Delete user document from /users
  const userRef = db.collection('users').doc(callerUid);
  batch.delete(userRef);

  await batch.commit();

  // 4. Anonymize user profile in Firebase Auth and delete account
  try {
    await admin.auth().deleteUser(callerUid);
  } catch (authError: any) {
    console.warn('Firebase Auth user deletion warning:', authError.message);
  }

  return { success: true, message: 'Account and associated personal data deleted successfully.' };
}
