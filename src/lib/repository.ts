import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ActivityLog,
  AuditFields,
  GuildUser,
  KnowledgeRecord,
  LedgerCollection,
  Need,
  NotificationRecord,
  Opportunity,
  Organization,
  Outcome,
  Quest,
  QuestSubmission,
  RevenueEvent,
  VerificationRecord
} from '../types/guild';

export type EntityMap = {
  users: GuildUser;
  organizations: Organization;
  needs: Need;
  opportunities: Opportunity;
  quests: Quest;
  questSubmissions: QuestSubmission;
  outcomes: Outcome;
  verifications: VerificationRecord;
  revenueEvents: RevenueEvent;
  knowledgeArchive: KnowledgeRecord;
  notifications: NotificationRecord;
};

export const ledgerCollections: LedgerCollection[] = [
  'users',
  'organizations',
  'needs',
  'opportunities',
  'quests',
  'questSubmissions',
  'outcomes',
  'verifications',
  'revenueEvents',
  'knowledgeArchive',
  'notifications'
];

export function nowIso() {
  return new Date().toISOString();
}

export function auditFields(userId: string, responsibleReceptionist?: string): AuditFields {
  return {
    createdBy: userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    responsibleReceptionist: responsibleReceptionist || userId,
    archiveStatus: 'active'
  };
}

export async function logActivity(input: Omit<ActivityLog, 'id' | 'time'>) {
  await addDoc(collection(db, 'activityLogs'), {
    ...input,
    time: nowIso(),
    createdAtServer: serverTimestamp()
  });
}

export async function createLedgerRecord<K extends keyof EntityMap>(
  collectionName: K,
  data: Omit<EntityMap[K], 'id' | keyof AuditFields> & Partial<AuditFields>,
  actor: GuildUser,
  action: string,
  silent?: boolean
) {
  const ref = doc(collection(db, collectionName));
  const record = {
    ...data,
    ...auditFields(actor.uid, data.responsibleReceptionist || actor.uid),
    id: ref.id,
    createdAtServer: serverTimestamp()
  } as unknown as EntityMap[K];
  await setDoc(ref, record as DocumentData);
  if (!silent) {
    await logActivity({
      userId: actor.uid,
      userName: actor.fullName,
      action,
      relatedEntityType: collectionName as LedgerCollection,
      relatedEntityId: ref.id
    });
  }
  return record;
}

export async function updateLedgerRecord<K extends keyof EntityMap>(
  collectionName: K,
  id: string,
  patch: Partial<EntityMap[K]>,
  actor: GuildUser,
  action: string
) {
  await updateDoc(doc(db, collectionName, id), {
    ...patch,
    updatedAt: nowIso(),
    updatedAtServer: serverTimestamp()
  } as DocumentData);
  await logActivity({
    userId: actor.uid,
    userName: actor.fullName,
    action,
    relatedEntityType: collectionName as LedgerCollection,
    relatedEntityId: id
  });
}

export async function archiveLedgerRecord<K extends keyof EntityMap>(collectionName: K, id: string, actor: GuildUser) {
  return updateLedgerRecord(collectionName, id, { archiveStatus: 'archived' } as Partial<EntityMap[K]>, actor, `${collectionName} archived`);
}

export async function getRecord<K extends keyof EntityMap>(collectionName: K, id: string) {
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? (snapshot.data() as EntityMap[K]) : null;
}

export async function listRecords<K extends keyof EntityMap>(collectionName: K, constraints: QueryConstraint[] = []) {
  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
  return snapshot.docs.map((item) => item.data() as EntityMap[K]);
}

export function subscribeRecords<K extends keyof EntityMap>(
  collectionName: K,
  callback: (records: EntityMap[K][]) => void,
  constraints: QueryConstraint[] = [where('archiveStatus', '==', 'active'), orderBy('updatedAt', 'desc'), limit(100)]
) {
  return onSnapshot(query(collection(db, collectionName), ...constraints), (snapshot) => {
    callback(snapshot.docs.map((item) => item.data() as EntityMap[K]));
  });
}

export async function addInteraction(org: Organization, actor: GuildUser, summary: string, type: Organization['interactionHistory'][number]['type'] = 'note') {
  const interaction = {
    id: crypto.randomUUID(),
    type,
    summary,
    createdBy: actor.uid,
    createdAt: nowIso()
  };
  await updateLedgerRecord('organizations', org.id, { interactionHistory: [interaction, ...(org.interactionHistory || [])] }, actor, 'Organization interaction recorded');
}

export async function createNotification(input: Omit<NotificationRecord, 'id' | keyof AuditFields>, actor: GuildUser) {
  return createLedgerRecord('notifications', input, actor, 'Notification created');
}

