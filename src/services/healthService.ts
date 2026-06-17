import type { Quest, Opportunity, Organization, Need } from '../types/guild';

/**
 * healthService.ts
 * 
 * Operational Integrity Engine for Guild OS.
 * Detects missing actions, bottlenecks, and data gaps.
 */

export interface HealthIssue {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  fix: string;
  entityId: string;
  entityType: 'quest' | 'opportunity' | 'organization' | 'need';
}

export function auditQuestHealth(quest: Quest): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // 1. Missing Assignment
  if (quest.status === 'open' && (!quest.assignedMembers || quest.assignedMembers.length === 0)) {
    if (new Date(quest.createdAt).getTime() < Date.now() - (1000 * 60 * 60 * 24 * 3)) {
      issues.push({
        type: 'WARNING',
        message: 'Quest open for >3 days with no members.',
        fix: 'Assign a member or promote to top of list.',
        entityId: quest.id,
        entityType: 'quest'
      });
    }
  }

  // 2. Missing Submission
  if (quest.status === 'assigned' || quest.status === 'inProgress') {
    if (quest.timeline?.assigned && new Date(quest.timeline.assigned).getTime() < Date.now() - (1000 * 60 * 60 * 24 * 7)) {
       issues.push({
         type: 'WARNING',
         message: 'Active quest with no submission for >7 days.',
         fix: 'Check in with assigned member.',
         entityId: quest.id,
         entityType: 'quest'
       });
    }
  }

  // 3. Financial Gaps
  if (quest.isPaid && !quest.paymentAmount) {
    issues.push({
      type: 'CRITICAL',
      message: 'Quest marked as PAID but amount is zero/missing.',
      fix: 'Enter payment amount to ensure revenue tracking.',
      entityId: quest.id,
      entityType: 'quest'
    });
  }

  // 4. Verification Bottleneck
  if (quest.status === 'underReview') {
    issues.push({
      type: 'INFO',
      message: 'Quest waiting for verification.',
      fix: 'Review submission and approve/reject.',
      entityId: quest.id,
      entityType: 'quest'
    });
  }

  return issues;
}

export function auditOrganizationHealth(org: Organization, quests: Quest[]): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // 1. Follow-up passed
  if (org.nextFollowUpAt && new Date(org.nextFollowUpAt).getTime() < Date.now()) {
    issues.push({
      type: 'WARNING',
      message: 'Follow-up date has passed.',
      fix: 'Contact organization and log interaction.',
      entityId: org.id,
      entityType: 'organization'
    });
  }

  // 2. Inactive partner
  if (org.currentStatus === 'partner' && quests.filter(q => q.status !== 'completed' && q.status !== 'closed').length === 0) {
     issues.push({
       type: 'INFO',
       message: 'Active partner with no current quests.',
       fix: 'Reach out to identify new needs.',
       entityId: org.id,
       entityType: 'organization'
     });
  }

  return issues;
}

export function calculateQuestCompleteness(quest: Quest): number {
  let score = 0;
  let total = 0;

  const weights = {
    title: 10,
    description: 10,
    assignedMembers: 20,
    paymentAmount: 10,
    outcome: 20,
    knowledge: 20,
    verification: 10
  };

  if (quest.title) score += weights.title; total += weights.title;
  if (quest.description) score += weights.description; total += weights.description;
  if (quest.assignedMembers && quest.assignedMembers.length > 0) score += weights.assignedMembers; total += weights.assignedMembers;
  if (quest.isPaid ? quest.paymentAmount : true) score += weights.paymentAmount; total += weights.paymentAmount;
  if (quest.status === 'completed' || quest.status === 'closed') score += weights.outcome; total += weights.outcome;
  if (quest.knowledgeSubmitted) score += weights.knowledge; total += weights.knowledge;
  if (quest.status === 'completed') score += weights.verification; total += weights.verification;

  return Math.round((score / total) * 100);
}
