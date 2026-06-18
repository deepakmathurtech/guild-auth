import { createLedgerRecord, updateLedgerRecord, getRecord, listRecords, logActivity } from '../lib/repository';
import type { GuildUser, Need, Opportunity, Quest, QuestSubmission, GuildRole, QuestStatus } from '../types/guild';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, getDocs, where, runTransaction } from 'firebase/firestore';
import { getStateByName, getCityCode } from '../lib/jurisdiction';
import { roleWeight } from '../lib/rbac';

/**
 * workflowService.ts
 * 
 * Centralized business logic for Guild OS operations.
 * Separates core domain logic from UI components.
 */

// 1. Need -> Opportunity
export async function convertNeedToOpportunity(
  need: Need, 
  opportunityData: Partial<Opportunity>, 
  profile: GuildUser
) {
  // Create Opportunity
  const opp = await createLedgerRecord('opportunities', {
    ...opportunityData,
    searchName: (opportunityData.title || need.title).toLowerCase(),
    needId: need.id,
    organizationId: need.organizationId,
    organizationName: need.organizationName,
    title: opportunityData.title || '',
    category: opportunityData.category || 'General',
    description: opportunityData.description || need.description || '',
    skillsRequired: opportunityData.skillsRequired || [],
    estimatedRevenue: opportunityData.estimatedRevenue || need.estimatedValue || 0,
    status: 'draft',
    applicants: [],
    assignedMembers: [],
    assignedReceptionist: profile.uid,
    jurisdiction: profile.jurisdiction
  }, profile, 'Opportunity Created from Need');

  // Update Need Status
  await updateLedgerRecord('needs', need.id, {
    status: 'converted'
  }, profile, 'Need Converted');

  return opp;
}

export async function generateGuildQuestId(
  city: string = 'LDH', 
  category: string = 'TECH',
  stateName: string = 'Punjab'
): Promise<string> {
  const counterRef = doc(db, 'system', 'counters');
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentNumber = 1;
    
    if (!counterDoc.exists()) {
      transaction.set(counterRef, { questCount: 1 });
    } else {
      currentNumber = (counterDoc.data().questCount || 0) + 1;
      transaction.update(counterRef, { questCount: currentNumber });
    }
    
    const year = new Date().getFullYear();
    const sequence = currentNumber.toString().padStart(4, '0');
    const stateCode = getStateByName(stateName)?.code || 'IN';
    const cityCode = getCityCode(city);
    return `GQ-${year}-${stateCode}-${cityCode}-${category.toUpperCase().substring(0, 4)}-${sequence}`;
  });
}

export const VALID_QUEST_TRANSITIONS: Record<QuestStatus, QuestStatus[]> = {
  draft: ['open', 'cancelled', 'archived'],
  open: ['assigned', 'cancelled', 'archived'],
  assigned: ['inProgress', 'open', 'cancelled', 'archived'], // Can go back to open if someone drops
  inProgress: ['underReview', 'cancelled', 'archived'],
  underReview: ['completed', 'assigned', 'cancelled'],
  completed: ['closed', 'archived'],
  closed: ['archived'],
  cancelled: ['archived'],
  archived: [] // Terminal
};

export function validateQuestTransition(current: QuestStatus, next: QuestStatus) {
  if (current === next) return true;
  const allowed = VALID_QUEST_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

// 2. Opportunity -> Quest
export async function spawnQuestForOpportunity(
  opportunity: Opportunity, 
  questData: Partial<Quest>, 
  profile: GuildUser
) {
  // Logic Audit: No negative money or impossible financial states
  const amount = questData.paymentAmount || 0;
  const val = questData.estimatedValue || 0;
  const commission = questData.guildCommission || 0;
  const revenue = questData.guildRevenue || 0;
  const payout = questData.memberPayout || 0;

  if (amount < 0 || val < 0 || commission < 0 || revenue < 0 || payout < 0) {
    throw new Error('Logic Error: Financial values cannot be negative.');
  }

  if (amount > 0 && amount !== (revenue + payout)) {
    // Audit: Revenue tracking check
    console.warn('Revenue Audit: Payment amount does not match Revenue + Payout sum.');
  }

  const questId = await generateGuildQuestId(
    profile.jurisdiction.cityName, 
    opportunity.category || 'GEN',
    profile.jurisdiction.stateName
  );

  const quest = await createLedgerRecord('quests', {
    ...questData,
    opportunityId: opportunity.id,
    needId: opportunity.needId,
    organizationId: opportunity.organizationId,
    title: questData.title || '',
    category: questData.category || opportunity.category || 'General',
    description: questData.description || opportunity.description || '',
    difficulty: questData.difficulty || 'medium',
    rewards: questData.rewards || '',
    requirements: questData.requirements || '',
    submissionMethod: questData.submissionMethod || 'link',
    verificationMethod: questData.verificationMethod || 'manualReview',
    reputationPoints: questData.reputationPoints || 10,
    isMandatory: questData.isMandatory !== undefined ? questData.isMandatory : true,
    guildQuestId: questId,
    status: 'open',
    assignedMembers: [],
    applicants: []
  }, profile, 'Quest Spawned');

  return quest;
}

// 2.1 Transactional Assignment
export async function assignMemberToQuest(
  questId: string,
  memberId: string,
  profile: GuildUser
) {
  return await runTransaction(db, async (transaction) => {
    const questRef = doc(db, 'quests', questId);
    const snap = await transaction.get(questRef);
    if (!snap.exists()) throw new Error('Quest not found');
    const quest = snap.data() as Quest;

    if (!validateQuestTransition(quest.status, 'assigned')) {
      throw new Error(`Invalid lifecycle transition from ${quest.status} to assigned`);
    }

    const assigned = quest.assignedMembers || [];
    if (assigned.includes(memberId)) throw new Error('Member already assigned');

    const capacity = quest.membersRequired || 1;
    if (assigned.length >= capacity) {
      throw new Error('Quest recruitment capacity reached');
    }

    const newAssigned = [...assigned, memberId];
    
    // Automatically close recruitment if capacity reached
    const isFull = newAssigned.length >= capacity;
    const newStatus: QuestStatus = isFull ? 'assigned' : 'open';

    transaction.update(questRef, {
      assignedMembers: newAssigned,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Log Activity
    await logActivity({
      userId: profile.uid,
      userName: profile.fullName,
      action: `Member ${memberId} assigned to quest ${questId}. Status: ${newStatus}`,
      relatedEntityType: 'quests',
      relatedEntityId: questId
    });
  });
}

// 3. Complete Opportunity Check
export async function checkOpportunityCompletion(opportunityId: string, profile: GuildUser) {
  if (!opportunityId) return;
  
  const opp = await getRecord('opportunities', opportunityId);
  if (!opp || opp.status === 'completed') return;

  const quests = await listRecords('quests', [
    where('opportunityId', '==', opportunityId),
    where('archiveStatus', '==', 'active')
  ]);

  const mandatoryQuests = quests.filter(q => q.isMandatory);
  const allMandatoryCompleted = mandatoryQuests.length > 0 && mandatoryQuests.every(q => q.status === 'completed');

  if (allMandatoryCompleted) {
    await updateLedgerRecord('opportunities', opportunityId, {
      status: 'completed'
    }, profile, 'Opportunity Auto-Completed');

    await createLedgerRecord('outcomes', {
      title: `${opp.title} - Outcome Draft`,
      relatedOpportunityId: opp.id,
      organizationId: opp.organizationId,
      organizationName: opp.organizationName,
      participants: [...new Set(quests.flatMap(q => q.assignedMembers || []).filter(Boolean))] as string[],
      evidence: [],
      revenueGenerated: opp.estimatedRevenue || 0,
      verificationStatus: 'pending',
      lessonsLearned: ''
    }, profile, 'Auto-Drafted Outcome');

    await createLedgerRecord('notifications', {
      userId: opp.assignedReceptionist || profile.uid,
      type: 'opportunity_completed',
      title: 'Opportunity Completed',
      body: `The opportunity "${opp.title}" has completed all mandatory quests. An outcome draft is ready.`,
      read: false,
      channel: 'inApp',
      futureChannels: ['email'],
      actionUrl: '/outcomes'
    }, profile, 'Notification Sent', true);
  }
}

// 4. Submission Review
export async function approveSubmission(
  submission: QuestSubmission, 
  profile: GuildUser, 
  notes: string
) {
  await updateLedgerRecord('questSubmissions', submission.id, { 
    status: 'approved',
    reviewerId: profile.uid,
    reviewerNotes: notes,
    reviewedAt: new Date().toISOString()
  }, profile, 'Submission Approved');

  await createLedgerRecord('verifications', {
    targetCollection: 'questSubmissions',
    targetId: submission.id,
    method: 'manualReview',
    evidence: submission.evidenceUrls || [],
    reviewer: profile.uid,
    decision: 'verified',
    timestamp: new Date().toISOString(),
    notes: notes
  }, profile, 'Verification Record Created');

  const quest = await getRecord('quests', submission.questId);
  if (quest) {
    await updateLedgerRecord('quests', quest.id, {
      status: 'completed'
    }, profile, 'Quest Completed');

    if (submission.memberId) {
      const userRef = doc(db, 'users', submission.memberId);
      await updateDoc(userRef, {
        reputationScore: increment(quest.reputationPoints || 0),
        experiencePoints: increment(quest.reputationPoints || 0),
        completedQuests: increment(1)
      });
      
      const updatedUserSnap = await getDoc(userRef);
      if (updatedUserSnap.exists()) {
        const u = updatedUserSnap.data() as GuildUser;
        let newRank = u.guildRank;
        
        if (u.guildRank === 'Applicant' && u.completedQuests >= 1 && u.reputationScore >= 10) newRank = 'F';
        else if (u.guildRank === 'F' && u.completedQuests >= 5 && u.reputationScore >= 50 && (u.knowledgeEntriesCount || 0) >= 1) newRank = 'E';
        else if (u.guildRank === 'E' && u.completedQuests >= 15 && u.reputationScore >= 150 && (u.knowledgeEntriesCount || 0) >= 5) {
          const existing = await getDocs(query(collection(db, 'rankReviews'), where('memberId', '==', u.uid), where('status', '==', 'pending')));
          if (existing.empty) {
            await createLedgerRecord('rankReviews', {
              memberId: u.uid,
              currentRank: 'E',
              requestedRank: 'D',
              status: 'pending'
            } as any, profile, 'Rank Review Ticket Auto-Generated');
          }
        }
        
        if (newRank !== u.guildRank) {
          await updateDoc(userRef, { guildRank: newRank });
        }
      }
      
      await logActivity({
        userId: profile.uid,
        userName: profile.fullName,
        action: `Reputation Awarded to ${submission.memberId}`,
        relatedEntityType: 'users',
        relatedEntityId: submission.memberId
      }); 

      await createLedgerRecord('notifications', {
        userId: submission.memberId,
        type: 'submission_verified',
        title: 'Submission Verified!',
        body: `Your submission for "${quest.title}" was approved. You earned ${quest.reputationPoints || 0} Rep.`,
        read: false,
        channel: 'inApp',
        futureChannels: ['email']
      }, profile, 'Notification Sent', true);
    }

    if (quest.opportunityId) {
      await checkOpportunityCompletion(quest.opportunityId, profile);
    }

    if (quest.isPaid && quest.paymentAmount) {
      await createLedgerRecord('revenueEvents', {
        source: `Quest Payment: ${quest.title}`,
        questId: quest.id,
        opportunityId: quest.opportunityId,
        organizationId: quest.organizationId,
        organizationName: quest.organizationName,
        amount: quest.paymentAmount,
        date: new Date().toISOString(),
        participants: [submission.memberId]
      }, profile, 'Revenue Event Auto-Generated on Approval');
    }
  }
}

// 7. User Lifecycle Approval
export async function approveUserRole(
  targetUserId: string,
  newRole: GuildRole,
  reason: string,
  profile: GuildUser
) {
  const isFounder = profile.role === 'founder' || profile.role === 'guildFounder';
  
  if (!isFounder && roleWeight[profile.role] <= roleWeight[newRole]) {
    throw new Error('Unauthorized for this role promotion (Hierarchy Violation)');
  }

  if (!isFounder && roleWeight[profile.role] < 4) {
    throw new Error('Unauthorized for role promotion');
  }
  
  await updateLedgerRecord('users', targetUserId, {
    role: newRole,
    verificationStatus: 'verified'
  } as any, profile, `Role Updated to ${newRole}: ${reason}`);

  await createLedgerRecord('notifications', {
    userId: targetUserId,
    type: 'general_alert',
    title: 'Profile Approved',
    body: `Your application has been approved. You are now a ${newRole} in the Guild Federation.`,
    read: false,
    channel: 'inApp',
    futureChannels: ['email']
  }, profile, 'Approval Notification', true);
}
