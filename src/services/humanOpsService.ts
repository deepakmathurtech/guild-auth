import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { 
  GuildUser, 
  SuccessionPlan, 
  TransferRecord, 
  LeaveRecord, 
  EscalationRecord, 
  DisputeRecord, 
  LedgerCollection 
} from '../types/guild';

function nowIso() {
  return new Date().toISOString();
}

export const HumanOpsService = {
  // Succession System
  async updateSuccessionPlan(userId: string, plan: Omit<SuccessionPlan, 'updatedAt' | 'updatedBy'>, updatedBy: string) {
    const userRef = doc(db, 'users', userId);
    const fullPlan: SuccessionPlan = {
      ...plan,
      updatedAt: nowIso(),
      updatedBy
    };
    await updateDoc(userRef, { successionPlan: fullPlan });
    
    // Also record in a separate collection for history
    await addDoc(collection(db, 'successionPlans'), {
      userId,
      ...fullPlan,
      createdAt: nowIso()
    });
  },

  // Ownership Transfer System
  async bulkTransfer(record: Omit<TransferRecord, 'id' | 'createdAt' | 'updatedAt' | 'archiveStatus'>) {
    const batch = writeBatch(db);
    const transferRef = doc(collection(db, 'transferRecords'));
    const transferId = transferRef.id;

    const fullRecord: TransferRecord = {
      ...record,
      id: transferId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archiveStatus: 'active'
    };

    batch.set(transferRef, fullRecord);

    // Perform the transfers
    for (let i = 0; i < record.entityTypes.length; i++) {
      const type = record.entityTypes[i];
      const id = record.entityIds[i];
      
      const entityRef = doc(db, type, id);
      
      // We assume most entities have an 'ownerId' or similar field. 
      // In a real system, we'd need to map fields per collection.
      // For now, we update 'ownerId' or 'assignedMembers' depending on type.
      if (type === 'organizations') {
        batch.update(entityRef, { ownerId: record.targetUserId, updatedAt: nowIso() });
      } else if (type === 'quests') {
        batch.update(entityRef, { ownerId: record.targetUserId, updatedAt: nowIso() });
      } else if (type === 'needs' || type === 'opportunities') {
        batch.update(entityRef, { createdBy: record.targetUserId, updatedAt: nowIso() });
      }
    }

    await batch.commit();
    return transferId;
  },

  // Leave Management
  async requestLeave(leave: Omit<LeaveRecord, 'id' | 'createdAt' | 'updatedAt' | 'archiveStatus' | 'status'>) {
    const leaveRef = doc(collection(db, 'leaveRecords'));
    const fullLeave: LeaveRecord = {
      ...leave,
      id: leaveRef.id,
      status: 'pending',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archiveStatus: 'active'
    };
    await setDoc(leaveRef, fullLeave);
    return leaveRef.id;
  },

  async approveLeave(leaveId: string, approvedBy: string) {
    const leaveRef = doc(db, 'leaveRecords', leaveId);
    const snapshot = await getDoc(leaveRef);
    if (!snapshot.exists()) throw new Error('Leave record not found');
    
    const leave = snapshot.data() as LeaveRecord;
    await updateDoc(leaveRef, { 
      status: 'approved', 
      updatedAt: nowIso(),
      responsibleReceptionist: approvedBy 
    });

    // If leave is approved, update user status
    const userRef = doc(db, 'users', leave.userId);
    await updateDoc(userRef, { status: 'onLeave', updatedAt: nowIso() });
  },

  // Escalation Framework
  async escalate(escalation: Omit<EscalationRecord, 'id' | 'createdAt' | 'updatedAt' | 'archiveStatus' | 'status'>) {
    const escRef = doc(collection(db, 'escalationRecords'));
    const fullEscalation: EscalationRecord = {
      ...escalation,
      id: escRef.id,
      status: 'open',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archiveStatus: 'active'
    };
    await setDoc(escRef, fullEscalation);
    return escRef.id;
  },

  // Dispute Resolution
  async fileDispute(dispute: Omit<DisputeRecord, 'id' | 'createdAt' | 'updatedAt' | 'archiveStatus' | 'status'>) {
    const disputeRef = doc(collection(db, 'disputeRecords'));
    const fullDispute: DisputeRecord = {
      ...dispute,
      id: disputeRef.id,
      status: 'open',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archiveStatus: 'active'
    };
    await setDoc(disputeRef, fullDispute);
    return disputeRef.id;
  },

  async resolveDispute(disputeId: string, resolution: string, resolvedBy: string) {
    const disputeRef = doc(db, 'disputeRecords', disputeId);
    await updateDoc(disputeRef, {
      status: 'resolved',
      resolution,
      updatedAt: nowIso(),
      responsibleReceptionist: resolvedBy
    });
  },

  // Disaster Recovery & Scaling: City Merge
  async mergeCities(sourceCityId: string, targetCityId: string, targetJuris: any, actor: GuildUser) {
    const collectionsToMigrate: LedgerCollection[] = ['users', 'organizations', 'needs', 'opportunities', 'quests'];
    
    for (const col of collectionsToMigrate) {
      const q = query(collection(db, col), where('jurisdiction.cityId', '==', sourceCityId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, {
          'jurisdiction.cityId': targetCityId,
          'jurisdiction.cityName': targetJuris.cityName,
          'jurisdiction.stateId': targetJuris.stateId,
          'jurisdiction.stateName': targetJuris.stateName,
          updatedAt: nowIso()
        });
      });
      await batch.commit();
    }
    
    await addDoc(collection(db, 'activityLogs'), {
      userId: actor.uid,
      userName: actor.fullName,
      action: `City Merge: ${sourceCityId} -> ${targetCityId}`,
      time: nowIso()
    });
  }
};
