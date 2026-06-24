import { createLedgerRecord, updateLedgerRecord, getRecord, listRecords, logActivity } from '../lib/repository';
import type { GuildUser, Need, Opportunity, Quest, QuestSubmission, GuildRole, QuestStatus, SubmissionStatus } from '../types/guild';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, getDocs, where, runTransaction } from 'firebase/firestore';
import { getStateByName, getCityCode } from '../lib/jurisdiction';
import { roleWeight } from '../lib/rbac';
import { NotificationService } from './notificationService';

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
  underReview: ['paymentPending', 'completed', 'assigned', 'cancelled'], // paymentPending for paid quests, completed for unpaid
  paymentPending: ['completed', 'underReview', 'cancelled'], // Back to review if payment fails
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
    applicants: [],
    assignedReceptionistId: profile.uid,
    assignedReceptionistName: profile.fullName
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

    // Notify Member
    await NotificationService.notify(
      memberId,
      'quest_accepted',
      'Accepted to Quest',
      `You have been accepted to the quest: ${quest.title}. Status: ${newStatus}`,
      'medium',
      profile,
      { actionUrl: `/quests/${questId}` }
    );
  });
}

export async function removeMemberFromQuest(
  questId: string,
  memberId: string,
  profile: GuildUser
) {
  const quest = await getRecord('quests', questId);
  if (!quest) throw new Error('Quest not found');

  const newAssigned = (quest.assignedMembers || []).filter(id => id !== memberId);
  const newStatus: QuestStatus = newAssigned.length > 0 ? quest.status : 'open';

  await updateLedgerRecord('quests', questId, {
    assignedMembers: newAssigned,
    status: newStatus
  }, profile, `Member ${memberId} removed from quest`);

  await NotificationService.notify(
    memberId,
    'quest_removed',
    'Removed from Quest',
    `You have been removed from the quest: ${quest.title}.`,
    'high',
    profile,
    { actionUrl: `/quests/${questId}` }
  );
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

    await NotificationService.notify(
      opp.assignedReceptionist || profile.uid,
      'opportunity_completed',
      'Opportunity Completed',
      `The opportunity "${opp.title}" has completed all mandatory quests. An outcome draft is ready.`,
      'high',
      profile,
      { actionUrl: '/outcomes' }
    );
  }
}

// 4. Submission Review
export async function approveSubmission(
  submission: QuestSubmission,
  profile: GuildUser,
  notes: string
) {
  // Approve the submission first
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
    decision: 'approved',
    timestamp: new Date().toISOString(),
    notes: notes
  }, profile, 'Verification Record Created');

  // Get the quest and track approved members
  const quest = await getRecord('quests', submission.questId);
  if (quest) {
    const currentAccepted = quest.acceptedMembers || [];
    const newAccepted = currentAccepted.includes(submission.memberId)
      ? currentAccepted
      : [...currentAccepted, submission.memberId];

    const requiredCount = quest.membersRequired || 1;

    // Update the participation record to completed directly via Firestore
    const partsQuery = query(
      collection(db, 'questParticipations'),
      where('questId', '==', submission.questId),
      where('userId', '==', submission.memberId)
    );
    const partsSnap = await getDocs(partsQuery);
    const partDoc = partsSnap.docs.find(d => d.data().status !== 'completed');
    if (partDoc) {
      await updateDoc(doc(db, 'questParticipations', partDoc.id), {
        status: 'completed',
        reviewerId: profile.uid,
        reviewerNotes: notes,
        completedAt: new Date().toISOString()
      });

      // Give experiencePoints to the member IMMEDIATELY when their submission is approved
      const userRef = doc(db, 'users', submission.memberId);
      await updateDoc(userRef, {
        reputationScore: increment(quest.reputationPoints || 0),
        experiencePoints: increment(quest.reputationPoints || 0)
      });

      console.log(`✓ Awarded ${quest.reputationPoints || 0} XP to member ${submission.memberId} for completing quest ${quest.title}`);
    }

    // Check if all required members have submitted
    if (newAccepted.length >= requiredCount) {
      // Determine next status based on paid/unpaid
      const nextStatus: QuestStatus = quest.isPaid ? 'paymentPending' : 'inProgress';

      // Update quest status
      await updateLedgerRecord('quests', quest.id, {
        status: nextStatus,
        acceptedMembers: newAccepted,
        completedMembers: [...(quest.completedMembers || []), ...newAccepted],
        startedAt: nextStatus === 'inProgress' ? new Date().toISOString() : undefined
      }, profile, nextStatus === 'paymentPending' ? 'Quest Now Payment Pending' : 'Quest Now Under Working Session');

      if (nextStatus === 'inProgress') {
        // Update activeQuest count only - XP already given when individual submission was approved
        for (const memberId of newAccepted) {
          if (memberId) {
            const userRef = doc(db, 'users', memberId);
            await updateDoc(userRef, {
              activeQuests: increment(1)
            });
          }
        }
      }
    } else {
      // Not all members approved yet - keep quest open
      await updateLedgerRecord('quests', quest.id, {
        acceptedMembers: newAccepted
      }, profile, 'Member Added to Accepted List');
    }

    if (quest.opportunityId) {
      await checkOpportunityCompletion(quest.opportunityId, profile);
    }

    if (quest.isPaid && quest.paymentAmount) {
      await createLedgerRecord('revenueEvents', {
        source: `Quest Payment: ${quest.title}`,
        category: 'quest_payout',
        questId: quest.id,
        opportunityId: quest.opportunityId,
        organizationId: quest.organizationId,
        organizationName: quest.organizationName,
        amount: quest.paymentAmount,
        date: new Date().toISOString(),
        participants: [submission.memberId]
      }, profile, 'Revenue Event Auto-Generated on Approval');
      
      await NotificationService.notify(
        submission.memberId,
        'revenue_recorded',
        'Payment Recorded',
        `A payment event for "${quest.title}" has been recorded.`,
        'medium',
        profile
      );
    }
  }
}

export async function rejectSubmission(
  submission: QuestSubmission,
  profile: GuildUser,
  notes: string
) {
  await updateLedgerRecord('questSubmissions', submission.id, {
    status: 'rejected',
    reviewerId: profile.uid,
    reviewerNotes: notes,
    reviewedAt: new Date().toISOString()
  }, profile, 'Submission Rejected');

  const quest = await getRecord('quests', submission.questId);
  
  await NotificationService.notify(
    submission.memberId,
    'submission_rejected',
    'Submission Rejected',
    `Your submission for "${quest?.title || 'Quest'}" was rejected. Reason: ${notes}`,
    'high',
    profile,
    { actionUrl: `/quests/${submission.questId}` }
  );
}

// 5. Payment Verification for Paid Quests
export async function verifyPayment(
  questId: string,
  verificationData: {
    paymentReceived: boolean;
    paymentMethod: 'UPI' | 'Bank Transfer' | 'Razorpay' | 'Stripe' | 'Cash Receipt' | 'Custom' | 'Guild Treasury';
    paymentReferenceId?: string;
    transactionId?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
    paymentDate?: string;
    verificationNotes?: string;
    whoPaid?: string;
  },
  profile: GuildUser
) {
  const quest = await getRecord('quests', questId);
  if (!quest) throw new Error('Quest not found');

  if (!quest.isPaid || !quest.paymentAmount) {
    throw new Error('This quest is not a paid quest');
  }

  const guildPercentage = quest.guildCommission || 5;
  const { calculateGuildShare } = await import('../lib/financials');
  const payout = calculateGuildShare(quest.paymentAmount, guildPercentage);

  // Create payment verification record
  const paymentVerification = await createLedgerRecord('paymentVerifications', {
    questId,
    questTitle: quest.title,
    organizationId: quest.organizationId || '',
    organizationName: quest.organizationName || '',
    memberId: quest.assignedMembers?.[0] || '',
    memberName: '',
    grossAmount: payout.grossAmount,
    paymentAmount: payout.grossAmount,
    currency: quest.paymentCurrency || 'INR',
    guildRevenue: payout.guildRevenue,
    memberRevenue: payout.memberRevenue,
    baseGuildPercentage: payout.baseGuildPercentage,
    roundingAdjustment: payout.roundingAdjustment,
    paymentMethod: verificationData.paymentMethod,
    paymentReferenceId: verificationData.paymentReferenceId,
    transactionId: verificationData.transactionId,
    invoiceNumber: verificationData.invoiceNumber,
    receiptNumber: verificationData.receiptNumber,
    paymentReceived: verificationData.paymentReceived,
    verifiedBy: profile.uid,
    verifiedByName: profile.fullName,
    verifiedAt: new Date().toISOString(),
    verificationNotes: verificationData.verificationNotes,
    whoPaid: verificationData.whoPaid,
    paymentDate: verificationData.paymentDate
  }, profile, verificationData.paymentReceived ? 'Payment Verified' : 'Payment Verification Failed');

  // Update quest status
  if (verificationData.paymentReceived) {
    await updateLedgerRecord('quests', questId, {
      status: 'inProgress',
      paymentStatus: 'Paid',
      verifiedBy: profile.uid,
      verifiedAt: new Date().toISOString(),
      guildRevenue: payout.guildRevenue,
      memberPayout: payout.memberRevenue
    }, profile, 'Payment Verified - Quest Now In Progress');

    // Notify member
    if (quest.assignedMembers?.length) {
      for (const memberId of quest.assignedMembers) {
        await NotificationService.notify(
          memberId,
          'payment_verified',
          'Payment Verified',
          `Payment for "${quest.title}" has been verified. Your payout: ₹${payout.memberRevenue}`,
          'high',
          profile
        );
      }
    }
  } else {
    // Payment not received - notify but keep in paymentPending
    await updateLedgerRecord('quests', questId, {
      paymentStatus: 'Pending',
      verificationNotes: verificationData.verificationNotes
    }, profile, 'Payment Not Received');
  }

  // Create revenue event only if payment received
  if (verificationData.paymentReceived && quest.organizationId) {
    await createLedgerRecord('revenueEvents', {
      source: `Quest Payment: ${quest.title}`,
      category: 'quest_payout',
      questId: quest.id,
      opportunityId: quest.opportunityId,
      organizationId: quest.organizationId,
      organizationName: quest.organizationName,
      amount: payout.guildRevenue,
      date: verificationData.paymentDate || new Date().toISOString(),
      participants: quest.assignedMembers || []
    }, profile, 'Guild Revenue from Quest');
  }

  return paymentVerification;
}

// 6. Complete Quest After Payment Verified
export async function completeQuestAfterPayment(
  questId: string,
  profile: GuildUser
) {
  const quest = await getRecord('quests', questId);
  if (!quest) throw new Error('Quest not found');

  if (quest.isPaid && quest.paymentStatus !== 'Paid') {
    throw new Error('Cannot complete paid quest until payment is verified');
  }

  await updateLedgerRecord('quests', questId, {
    status: 'completed',
    completedAt: new Date().toISOString()
  }, profile, 'Quest Completed');
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

  await NotificationService.notify(
    targetUserId,
    'application_approved',
    'Profile Approved',
    `Your application has been approved. You are now a ${newRole} in the Guild Federation.`,
    'high',
    profile,
    { actionUrl: '/dashboard' }
  );
}

export async function rejectUserRole(
  targetUserId: string,
  reason: string,
  profile: GuildUser
) {
  await updateLedgerRecord('users', targetUserId, {
    status: 'removed',
    verificationStatus: 'rejected'
  } as any, profile, `Application Rejected: ${reason}`);

  await NotificationService.notify(
    targetUserId,
    'application_rejected',
    'Application Rejected',
    `Your application to the Guild has been rejected. Reason: ${reason}`,
    'high',
    profile
  );
}

