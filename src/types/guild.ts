export type GuildRole = 'member' | 'contributor' | 'receptionist' | 'guildManager' | 'guildAdmin' | 'founder';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ArchiveStatus = 'active' | 'archived';
export type OrganizationStatus = 'new' | 'contacted' | 'active' | 'partner' | 'inactive';
export type GuildRank = 'Applicant' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type NeedStatus = 'open' | 'matching' | 'assigned' | 'inProgress' | 'completed' | 'converted' | 'archived';
export type OpportunityStatus = 'draft' | 'open' | 'matching' | 'assigned' | 'inProgress' | 'completed' | 'archived';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type LedgerCollection =
  | 'users'
  | 'organizations'
  | 'needs'
  | 'opportunities'
  | 'quests'
  | 'questSubmissions'
  | 'outcomes'
  | 'verifications'
  | 'revenueEvents'
  | 'knowledgeBase'
  | 'notifications'
  | 'interactions'
  | 'rankReviews';

export interface AuditFields {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  responsibleReceptionist?: string;
  archiveStatus: ArchiveStatus;
}

export interface GuildUser extends AuditFields {
  uid: string;
  email: string;
  fullName: string;
  photoURL?: string;
  phone?: string;
  city?: string;
  role: GuildRole;
  contactInformation?: string;
  skills: string[];
  interests: string[];
  bio?: string;
  verificationStatus: VerificationStatus;
  guildRank: GuildRank;
  reputationScore: number;
  experiencePoints: number;
  knowledgeEntriesCount: number;
  completedQuests: number;
  verifiedOutcomes: number;
  revenueEarned: number;
  activityHistory: string[];
}

export interface Organization extends AuditFields {
  id: string;
  name: string;
  category: 'Business' | 'NGO' | 'College' | 'Contractor' | 'Community Group' | 'Government Related';
  contactPerson: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  description?: string;
  needs: string[];
  opportunities: string[];
  currentStatus: OrganizationStatus;
  trustLevel: 'new' | 'verified' | 'trusted' | 'partner';
  lastContactAt?: string;
  nextFollowUpAt?: string;
  relationshipNotes: string;
}

export interface InteractionRecord {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'visit' | 'note';
  summary: string;
  createdBy: string;
  createdAt: string;
  needId?: string;
  concern?: string;
  nextAction?: string;
  dueDate?: string;
}

export interface Need extends AuditFields {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  organizationId: string;
  organizationName?: string;
  location?: string;
  city?: string;
  deadline?: string;
  estimatedValue: number;
  status: NeedStatus;
}

export interface Opportunity extends AuditFields {
  id: string;
  needId?: string;
  title: string;
  description: string;
  skillsRequired: string[];
  category: string;
  organizationId?: string;
  organizationName?: string;
  assignedMembers: string[];
  applicants: string[];
  assignedReceptionist: string;
  deadline?: string;
  estimatedRevenue: number;
  status: OpportunityStatus;
}

export type QuestStatus = 'draft' | 'open' | 'assigned' | 'inProgress' | 'underReview' | 'completed' | 'closed' | 'cancelled' | 'archived';

export type QuestClassification = 'Internal Guild' | 'External Client' | 'Community Service' | 'Revenue Generating' | 'Training' | 'Partnership' | 'Research' | 'Emergency';
export type VerificationLevel = 'Self Verified' | 'Receptionist Verified' | 'Manager Verified' | 'External Verified';

export interface QuestStakeholder {
  role: string;
  uid: string;
  name: string;
  joinedAt: string;
}

export interface Quest extends AuditFields {
  id: string; // Internal Firebase ID
  guildQuestId?: string; // e.g. GQ-2026-LDH-TECH-0001
  
  // Linkage
  opportunityId?: string;
  needId?: string;
  organizationId?: string;
  organizationName?: string;
  
  // Auditing / Health
  completenessScore?: number;
  missingActions?: string[];

  // Core Information
  title: string;
  description: string;
  category: string;
  classification?: QuestClassification;
  mode?: 'Remote' | 'Physical' | 'Hybrid';
  location?: { city?: string; state?: string; country?: string };
  
  // Source Information
  sourceType?: 'Organization' | 'Individual' | 'Guild Internal' | 'Partner Organization' | 'Government' | 'Other';
  sourceName?: string;
  sourceContactPerson?: string;
  sourcePhone?: string;
  sourceEmail?: string;

  // Requirements
  requiredRank?: GuildRank | 'Applicant';
  requiredSkills?: string[];
  estimatedHours?: number;
  priority?: Priority;
  questNature?: 'Volunteer' | 'Paid' | 'Internship' | 'Guild Duty' | 'Training' | 'Research' | 'Community Service' | 'Other';
  isMandatory: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';

  // Members & Stakeholders
  stakeholders?: QuestStakeholder[];
  ownerId?: string; // Legacy field, eventually mapped to stakeholders
  membersRequired?: number;
  assignedMembers?: string[];
  acceptedMembers?: string[];
  completedMembers?: string[];
  rejectedMembers?: string[];
  assignedReceptionistId?: string;
  assignedReceptionistName?: string;

  // Financial Section
  isPaid?: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentType?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Guild Treasury' | 'External Organization' | 'Other';
  whoPays?: 'Organization' | 'Guild' | 'Partner' | 'Government' | 'Individual' | 'Other';
  paymentStatus?: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  paymentNotes?: string;
  estimatedValue?: number;
  actualValue?: number;
  guildCommission?: number;
  guildRevenue?: number;
  memberPayout?: number;
  outstandingAmount?: number;

  // Verification
  verificationMethod: VerificationMethod;
  verificationLevel?: VerificationLevel;
  verifierId?: string;
  verifierName?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  outcomeStatus?: 'Success' | 'Partial Success' | 'Failed';
  impactSummary?: string;
  lessonsLearned?: string;

  // Knowledge & Rewards
  rewards: string;
  reputationPoints: number;
  experienceReward?: number;
  knowledgeRequired?: boolean;
  knowledgeSubmitted?: boolean;
  knowledgeApproved?: boolean;
  knowledgeLink?: string;
  knowledgeReviewer?: string;
  portfolioEligible?: boolean;
  certificateEligible?: boolean;

  // Revenue Status
  revenueStatus?: 'Pending' | 'Approved' | 'Rejected';
  submissionMethod?: string;
  requirements?: string;

  // Timeline
  timeline?: {
    created?: string;
    assigned?: string;
    accepted?: string;
    submitted?: string;
    verified?: string;
    completed?: string;
    outcomeRecorded?: string;
    knowledgeSubmitted?: string;
    revenueRecorded?: string;
  };

  status: QuestStatus;
}

export type VerificationMethod = 'reportReview' | 'documentUpload' | 'receiptUpload' | 'organizationConfirmation' | 'manualReview';

export interface QuestSubmission extends AuditFields {
  id: string;
  questId: string;
  questTitle?: string;
  memberId: string;
  report?: string;
  evidenceUrls: string[];
  links: string[];
  status: SubmissionStatus;
  reviewerId?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface VerificationRecord extends AuditFields {
  id: string;
  targetCollection: LedgerCollection;
  targetId: string;
  method: VerificationMethod;
  evidence: string[];
  reviewer: string;
  decision: VerificationStatus;
  timestamp: string;
  notes?: string;
}

export interface Outcome extends AuditFields {
  id: string;
  title: string;
  questId?: string;
  relatedOpportunityId: string;
  participants: string[];
  organizationId?: string;
  organizationName?: string;
  evidence: string[];
  revenueGenerated: number;
  verificationStatus: VerificationStatus;
  lessonsLearned: string;
}

export interface RevenueEvent extends AuditFields {
  id: string;
  source: string;
  questId?: string;
  opportunityId?: string;
  organizationId?: string;
  organizationName?: string;
  amount: number;
  date: string;
  city?: string;
  opportunityType?: string;
  participants: string[];
}

export interface KnowledgeRecord extends AuditFields {
  id: string;
  title: string;
  type: 'lesson' | 'successStory' | 'failureReport' | 'playbook' | 'template' | 'organizationInsight';
  authorId: string;
  questId?: string;
  opportunityId?: string;
  outcomeId?: string;
  organizationId?: string;
  tags: string[];
  lessonsLearned: string;
  whatWorked: string;
  whatFailed: string;
  advice: string;
  status: 'draft' | 'published';
}

export interface RankReviewTicket extends AuditFields {
  id: string;
  memberId: string;
  currentRank: GuildRank;
  requestedRank: GuildRank;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  time: string;
  relatedEntityType?: LedgerCollection | 'auth' | 'system';
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

export type NotificationType = 
  | "quest_assigned"
  | "submission_verified"
  | "opportunity_completed"
  | "revenue_recorded"
  | "general_alert";

export interface NotificationRecord extends AuditFields {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  channel: 'inApp' | 'email' | 'whatsapp' | 'sms';
  futureChannels: Array<'email' | 'whatsapp' | 'sms'>;
  actionUrl?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  hint?: string;
}
