import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

initializeApp();
const db = getFirestore();

const privilegedRoles = new Set(['guildAdmin', 'guildManager']);
const roleClaims: Record<string, Record<string, boolean>> = {
  member: { member: true },
  contributor: { contributor: true },
  receptionist: { receptionist: true },
  guildManager: { guildManager: true },
  guildAdmin: { guildAdmin: true }
};

async function assertAdmin(uid?: string) {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const profile = await db.doc(`users/${uid}`).get();
  if (!profile.exists || profile.data()?.role !== 'guildAdmin') throw new HttpsError('permission-denied', 'Guild Admin role required.');
}

export const setUserRole = onCall(async (request) => {
  await assertAdmin(request.auth?.uid);
  const { uid, role } = request.data as { uid?: string; role?: string };
  if (!uid || !role || !roleClaims[role]) throw new HttpsError('invalid-argument', 'Valid uid and role are required.');
  await db.doc(`users/${uid}`).set({ role, updatedAt: new Date().toISOString() }, { merge: true });
  await getAuth().setCustomUserClaims(uid, roleClaims[role]);
  await db.collection('activityLogs').add({ userId: request.auth?.uid, action: 'Role Updated', relatedEntityType: 'users', relatedEntityId: uid, time: new Date().toISOString(), metadata: { role } });
  return { ok: true };
});

export const syncRoleClaims = onDocumentUpdated('users/{uid}', async (event) => {
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  if (!after || after.role === before?.role || !roleClaims[after.role]) return;
  await getAuth().setCustomUserClaims(event.params.uid, roleClaims[after.role]);
});

export const logLedgerCreate = onDocumentCreated('{collectionId}/{docId}', async (event) => {
  const collectionId = event.params.collectionId;
  if (['activityLogs', 'notifications'].includes(collectionId)) return;
  const data = event.data?.data();
  if (!data?.createdBy) return;
  await db.collection('activityLogs').add({
    userId: data.createdBy,
    action: `${collectionId} created`,
    relatedEntityType: collectionId,
    relatedEntityId: event.params.docId,
    time: new Date().toISOString(),
    metadata: { responsibleReceptionist: data.responsibleReceptionist || null }
  });
});

export const updateReceptionistScorecard = onDocumentCreated('{collectionId}/{docId}', async (event) => {
  const collectionId = event.params.collectionId;
  const data = event.data?.data();
  const receptionist = data?.responsibleReceptionist || data?.createdBy;
  if (!receptionist) return;
  const scorecardRef = db.doc(`receptionistScorecards/${receptionist}`);
  const increments: Record<string, FieldValue> = {};
  if (collectionId === 'organizations') increments.organizationsAdded = FieldValue.increment(1);
  if (collectionId === 'opportunities') increments.opportunitiesCreated = FieldValue.increment(1);
  if (collectionId === 'outcomes') increments.outcomesRecorded = FieldValue.increment(1);
  if (collectionId === 'quests') increments.questsCreated = FieldValue.increment(1);
  if (collectionId === 'revenueEvents') increments.revenueGenerated = FieldValue.increment(Number(data.amount || 0));
  if (!Object.keys(increments).length) return;
  await scorecardRef.set({ receptionist, updatedAt: new Date().toISOString(), ...increments }, { merge: true });
});

export const preserveOutcomeKnowledge = onDocumentCreated('outcomes/{outcomeId}', async (event) => {
  const outcome = event.data?.data();
  if (!outcome) return;
  await db.collection('knowledgeArchive').add({
    title: `Outcome: ${outcome.title}`,
    type: 'lesson',
    outcomeId: event.params.outcomeId,
    organizationId: outcome.organizationId || '',
    tags: ['outcome', outcome.organizationName || 'guild'],
    body: outcome.lessonsLearned || 'Lessons pending.',
    createdBy: outcome.createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responsibleReceptionist: outcome.responsibleReceptionist,
    archiveStatus: 'active'
  });
});

export const notifyOnVerificationDecision = onDocumentCreated('verifications/{verificationId}', async (event) => {
  const verification = event.data?.data();
  if (!verification || verification.decision === 'pending') return;
  const target = await db.doc(`${verification.targetCollection}/${verification.targetId}`).get();
  const targetData = target.data();
  const recipients = new Set<string>();
  if (targetData?.createdBy) recipients.add(targetData.createdBy);
  if (targetData?.memberId) recipients.add(targetData.memberId);
  await Promise.all([...recipients].map((userId) => db.collection('notifications').add({
    userId,
    title: `Verification ${verification.decision}`,
    body: verification.notes || `A ${verification.targetCollection} record was reviewed.`,
    read: false,
    channel: 'inApp',
    futureChannels: ['email', 'whatsapp', 'sms'],
    createdBy: verification.reviewer,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responsibleReceptionist: verification.responsibleReceptionist,
    archiveStatus: 'active'
  })));
});
