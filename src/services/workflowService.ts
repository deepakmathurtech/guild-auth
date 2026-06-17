import { createLedgerRecord, updateLedgerRecord, getRecord, listRecords, logActivity } from '../lib/repository';
import type { GuildUser, Need, Opportunity, Quest, QuestSubmission, GuildRole } from '../types/guild';
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

// 2. Opportunity -> Quest
export async function spawnQuestForOpportunity(
  opportunity: Opportunity, 
  questData: Partial<Quest>, 
  profile: GuildUser
) {
  // Validation: No negative money
  if ((questData.paymentAmount || 0) < 0 || (questData.estimatedValue || 0) < 0) {
    throw new Error('Financial values cannot be negative.');
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

    if (quest.status === 'completed' || quest.status === 'closed' || quest.status === 'archived') {
      throw new Error(`Cannot assign to quest in status: ${quest.status}`);
    }

    const assigned = quest.assignedMembers || [];
    if (assigned.includes(memberId)) throw new Error('Member already assigned');

    if (quest.membersRequired && assigned.length >= quest.membersRequired) {
      throw new Error('Quest capacity reached');
    }

    const newAssigned = [...assigned, memberId];
    const newStatus = quest.status === 'open' ? 'assigned' : quest.status;

    transaction.update(questRef, {
      assignedMembers: newAssigned,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Log Activity
    await logActivity({
      userId: profile.uid,
      userName: profile.fullName,
      action: `Member ${memberId} assigned to quest ${questId}`,
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
  if (roleWeight[profile.role] < 4) throw new Error('Unauthorized for role promotion');
  
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
