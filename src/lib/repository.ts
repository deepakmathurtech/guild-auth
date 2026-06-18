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
  runTransaction,
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
  VerificationRecord,
  InteractionRecord,
  RankReviewTicket,
  SuccessionPlan,
  TransferRecord,
  LeaveRecord,
  EscalationRecord,
  DisputeRecord
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
  knowledgeBase: KnowledgeRecord;
  notifications: NotificationRecord;
  interactions: InteractionRecord;
  rankReviews: RankReviewTicket;
  successionPlans: SuccessionPlan & { userId: string; id: string }; // Extended for repository use
  transferRecords: TransferRecord;
  leaveRecords: LeaveRecord;
  escalationRecords: EscalationRecord;
  disputeRecords: DisputeRecord;
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
  'knowledgeBase',
  'notifications',
  'interactions',
  'rankReviews',
  'guildRegions',
  'guildStates',
  'guildCities',
  'successionPlans',
  'transferRecords',
  'leaveRecords',
  'escalationRecords',
  'disputeRecords'
];

export function nowIso() {
  return new Date().toISOString();
}

export function auditFields(actor: GuildUser, responsibleReceptionist?: string): AuditFields {
  return {
    createdBy: actor.uid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    responsibleReceptionist: responsibleReceptionist || actor.uid,
    archiveStatus: 'active',
    jurisdiction: actor.jurisdiction
  };
}

export async function logActivity(input: Omit<ActivityLog, 'id' | 'time'>) {
  await addDoc(collection(db, 'activityLogs'), {
    ...input,
    time: nowIso(),
    createdAtServer: serverTimestamp()
  });
}

export async function detectDuplicates<K extends keyof EntityMap>(
  collectionName: K,
  field: string,
  value: string,
  jurisdictionFilter?: boolean
) {
  const searchField = field === 'name' || field === 'title' ? 'searchName' : field;
  const searchValue = (field === 'name' || field === 'title') ? value.toLowerCase() : value;

  const constraints: QueryConstraint[] = [
    where(searchField, '==', searchValue),
    where('archiveStatus', '==', 'active'),
    limit(5)
  ];

  const snapshot = await getDocs(query(
    collection(db, collectionName),
    ...constraints
  ));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntityMap[K]));
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
    ...auditFields(actor, data.responsibleReceptionist || actor.uid),
    id: ref.id,
    ownerId: (data as any).ownerId || actor.uid,
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
  action: string,
  options: { checkUpdatedAt?: string } = {}
) {
  const ref = doc(db, collectionName, id);
  
  try {
    if (options.checkUpdatedAt) {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('Record not found');
        const data = snapshot.data() as any;
        if (data.updatedAt !== options.checkUpdatedAt) {
          throw new Error('CONCURRENCY_ERROR: Record was modified by another user. Please refresh and try again.');
        }
        transaction.update(ref, {
          ...patch,
          updatedAt: nowIso(),
          updatedAtServer: serverTimestamp()
        } as DocumentData);
      });
    } else {
      await updateDoc(ref, {
        ...patch,
        updatedAt: nowIso(),
        updatedAtServer: serverTimestamp()
      } as DocumentData);
    }

    await logActivity({
      userId: actor.uid,
      userName: actor.fullName,
      action,
      relatedEntityType: collectionName as LedgerCollection,
      relatedEntityId: id
    });
  } catch (err: any) {
    console.error('Update Ledger Error:', err);
    throw err;
  }
}

export async function runInTransaction<T>(work: (transaction: any) => Promise<T>) {
  return runTransaction(db, work);
}

export async function archiveLedgerRecord<K extends keyof EntityMap>(collectionName: K, id: string, actor: GuildUser) {
  return updateLedgerRecord(collectionName, id, { archiveStatus: 'archived' } as unknown as Partial<EntityMap[K]>, actor, `${collectionName} archived`);
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

export async function addInteraction(orgId: string, actor: GuildUser, summary: string, type: InteractionRecord['type'] = 'note', nextAction?: string, dueDate?: string) {
  return createLedgerRecord('interactions', {
    organizationId: orgId,
    type,
    summary,
    nextAction,
    dueDate,
  } as any, actor, 'Interaction recorded');
}

export async function searchRecords<K extends keyof EntityMap>(
  collectionName: K,
  constraints: QueryConstraint[] = [],
  pageSize: number = 20,
  startAfterDoc?: any
) {
  const finalConstraints = [...constraints];
  if (startAfterDoc) finalConstraints.push(startAfterDoc);
  finalConstraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, collectionName), ...finalConstraints));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];
  const items = snapshot.docs.map((item) => item.data() as EntityMap[K]);
  
  return { items, lastVisible };
}
