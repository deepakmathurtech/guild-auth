import { createLedgerRecord, updateLedgerRecord, getRecord, listRecords, logActivity } from '../lib/repository';
import type { GuildUser, Need, Opportunity, Quest, QuestSubmission } from '../types/guild';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, getDocs, where, runTransaction } from 'firebase/firestore';

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
    assignedReceptionist: profile.uid
  }, profile, 'Opportunity Created from Need');

  // Update Need Status
  await updateLedgerRecord('needs', need.id, {
    status: 'converted'
  }, profile, 'Need Converted');

  return opp;
}

export async function generateGuildQuestId(city: string = 'LDH', category: string = 'TECH'): Promise<string> {
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
    return `GQ-${year}-${city}-${category.toUpperCase().substring(0, 4)}-${sequence}`;
  });
}

// 2. Opportunity -> Quest
export async function spawnQuestForOpportunity(
  opportunity: Opportunity, 
  questData: Partial<Quest>, 
  profile: GuildUser
) {
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
    guildQuestId: await generateGuildQuestId('LDH', opportunity.category || 'GEN'),
    status: 'open'
  }, profile, 'Quest Spawned');

  if (quest.ownerId) {
    await createLedgerRecord('notifications', {
      userId: quest.ownerId,
      type: 'quest_assigned',
      title: 'New Quest Assigned',
      body: `You have been assigned to: ${quest.title}`,
      read: false,
      channel: 'inApp',
      futureChannels: ['email'],
      actionUrl: `/quests/${quest.id}`
    }, profile, 'Notification Sent', true);
  }

  return quest;
}

// 3. Complete Opportunity Check
// FUTURE: Move to Cloud Function (Triggered when Quest changes to 'completed')
export async function checkOpportunityCompletion(opportunityId: string, profile: GuildUser) {
  if (!opportunityId) return;
  
  const opp = await getRecord('opportunities', opportunityId);
  if (!opp || opp.status === 'completed') return;

  const quests = await listRecords('quests', [
    where('opportunityId', '==', opportunityId),
    where('archiveStatus', '==', 'active')
  ]);

  // If no mandatory quests, or all mandatory quests are completed
  const mandatoryQuests = quests.filter(q => q.isMandatory);
  const allMandatoryCompleted = mandatoryQuests.length > 0 && mandatoryQuests.every(q => q.status === 'completed');

  if (allMandatoryCompleted) {
    // 1. Complete Opportunity
    await updateLedgerRecord('opportunities', opportunityId, {
      status: 'completed'
    }, profile, 'Opportunity Auto-Completed');

    // 2. Draft Outcome
    await createLedgerRecord('outcomes', {
      title: `${opp.title} - Outcome Draft`,
      relatedOpportunityId: opp.id,
      organizationId: opp.organizationId,
      organizationName: opp.organizationName,
      participants: [...new Set(quests.map(q => q.ownerId).filter(Boolean))] as string[],
      evidence: [],
      revenueGenerated: opp.estimatedRevenue || 0,
      verificationStatus: 'pending',
      lessonsLearned: ''
    }, profile, 'Auto-Drafted Outcome');

    // Notify the Receptionist who created it, or whoever is managing it
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
  // FUTURE: Move to Cloud Function (Handles Verification, Rep, and Opportunity Cascades securely)
  
  // 1. Update Submission
  await updateLedgerRecord('questSubmissions', submission.id, { 
    status: 'approved',
    reviewerId: profile.uid,
    reviewerNotes: notes,
    reviewedAt: new Date().toISOString()
  }, profile, 'Submission Approved');

  // 2. Create Verification Record
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

  // 3. Update Quest Status
  const quest = await getRecord('quests', submission.questId);
  if (quest) {
    await updateLedgerRecord('quests', quest.id, {
      status: 'completed'
    }, profile, 'Quest Completed');

    // 4. Award Reputation
    // We use a direct firestore update to utilize `increment` which is safer for concurrent writes
    if (submission.memberId) {
      const userRef = doc(db, 'users', submission.memberId);
      await updateDoc(userRef, {
        reputationScore: increment(quest.reputationPoints || 0),
        experiencePoints: increment(quest.reputationPoints || 0),
        completedQuests: increment(1)
      });
      
      // Rank Evaluation Logic
      const updatedUserSnap = await getDoc(userRef);
      if (updatedUserSnap.exists()) {
        const u = updatedUserSnap.data() as GuildUser;
        let newRank = u.guildRank;
        
        // Automatic F
        if (u.guildRank === 'Applicant' && u.completedQuests >= 1 && u.reputationScore >= 10) {
          newRank = 'F';
        }
        // Automatic E
        else if (u.guildRank === 'F' && u.completedQuests >= 5 && u.reputationScore >= 50 && (u.knowledgeEntriesCount || 0) >= 1) {
          newRank = 'E';
        }
        // D Candidate Trigger
        else if (u.guildRank === 'E' && u.completedQuests >= 15 && u.reputationScore >= 150 && (u.knowledgeEntriesCount || 0) >= 5) {
          // Check if pending review exists
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
          await createLedgerRecord('notifications', {
            userId: u.uid,
            type: 'general_alert',
            title: 'Rank Up!',
            body: `Congratulations! You have been promoted to ${newRank} Rank.`,
            read: false,
            channel: 'inApp',
            futureChannels: ['email']
          }, profile, 'Rank Up Notification', true);
        }
      }
      // We also log this manually since we bypassed the standard updateLedgerRecord to use increment
      await logActivity({
        userId: profile.uid,
        userName: profile.fullName,
        action: `Reputation Awarded to ${submission.memberId}`,
        relatedEntityType: 'users',
        relatedEntityId: submission.memberId
      }); 

      // Notify the member
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

    // 5. Check Opportunity Completion
    if (quest.opportunityId) {
      await checkOpportunityCompletion(quest.opportunityId, profile);
    }

    // 6. Automated Revenue Event (if quest is paid)
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
