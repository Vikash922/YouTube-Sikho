import * as admin from 'firebase-admin';

export interface AuditLogEntry {
  actorUid: string;
  action: string;
  targetType: 'user' | 'course' | 'quiz' | 'live_class' | 'notification' | 'enrollment' | 'payment' | 'claim' | 'settings';
  targetId: string;
  metadata?: Record<string, any>;
  createdAt?: admin.firestore.FieldValue;
}

/**
 * Record an administrative or security-critical event to the auditLog collection.
 */
export async function writeAuditLog(
  actorUid: string,
  action: string,
  targetType: AuditLogEntry['targetType'],
  targetId: string,
  metadata: Record<string, any> = {},
  db: admin.firestore.Firestore = admin.firestore()
): Promise<string> {
  const ref = db.collection('auditLog').doc();
  const entry: AuditLogEntry = {
    actorUid,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(entry);
  return ref.id;
}
