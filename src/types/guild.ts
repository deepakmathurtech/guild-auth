export type GuildRole =
  | 'applicant'
  | 'member'
  | 'contributor'
  | 'receptionistCandidate'
  | 'receptionist'
  | 'cityGuildMaster'
  | 'stateGuildMaster'
  | 'centralGuildMaster'
  | 'nationalGuildMaster'
  | 'guildFounder'
  | 'founder'
  | 'organizationRepresentative';  // PHASE 1: Added for org conversion - one account, one active role

export type UserStatus = 
  | 'active' 
  | 'onLeave' 
  | 'inactive' 
  | 'suspended' 
  | 'resigned' 
  | 'removed' 
  | 'archived';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ArchiveStatus = 'active' | 'archived';
export type OrganizationStatus = 'new' | 'contacted' | 'active' | 'partner' | 'inactive';
export type GuildRank = 'Applicant' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type NeedStatus = 'open' | 'matching' | 'assigned' | 'inProgress' | 'completed' | 'converted' | 'archived';
export type OpportunityStatus = 'draft' | 'open' | 'matching' | 'assigned' | 'inProgress' | 'completed' | 'archived';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface SuccessionPlan {
  primaryHolderId: string;
  backupHolderId?: string;
  emergencyHolderId?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Jurisdiction {
  countryId: string;
  countryName: string;
  stateId: string;
  stateName: string;
  cityId: string;
  cityName: string;
  branchId?: string;
  branchName?: string;
}

export interface Branch extends AuditFields {
  id: string;
  name: string;
  code: string; // Short code for display
  cityId: string;
  cityName: string;
  stateId: string;
  stateName: string;
  countryId: string;
  countryName: string;
  status: 'active' | 'pending' | 'inactive';
  assignedGuildMasterId?: string;
  assignedGuildMasterName?: string;
  assignedReceptionistId?: string;
  assignedReceptionistName?: string;
  memberCount?: number;
  organizationCount?: number;
  receptionistCount?: number;
  reputationScore?: number;
}

export interface BranchRequest extends AuditFields {
  id: string;
  requestedCity: string;
  requestedState: string;
  requestedCountry: string;
  requestedByUserId?: string;
  requestedByOrganizationId?: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedBy?: string;
  resolvedAt?: string;
  branchId?: string;
  notes?: string;
}

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
  | 'rankReviews'
  | 'guildRegions'
  | 'guildStates'
  | 'guildCities'
  | 'successionPlans'
  | 'transferRecords'
  | 'leaveRecords'
  | 'escalationRecords'
  | 'disputeRecords';

export interface AuditFields {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  responsibleReceptionist?: string;
  archiveStatus: ArchiveStatus;
  jurisdiction: Jurisdiction;
}

export interface GuildUser extends AuditFields {
  uid: string;
  email: string;
  fullName: string;
  photoURL?: string;
  phone?: string;
  city?: string;
  role: GuildRole;
  status: UserStatus;
  contactInformation?: string;
  skills: string[];
  skillsBeingLearned?: string[];
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
  successionPlan?: SuccessionPlan;
  recruitmentStep?: string;
  availability?: string;
  emergencyContact?: string;
  preferredRole?: string;
  referralSource?: string;
  lastActiveAt?: string;
  // Profile expansion
  certificates?: { name: string; issuer: string; date: string; url?: string }[];
  proofs?: { id: string; title: string; description: string; link?: string; skillsVerified: string[]; createdAt: string; status: 'pending' | 'approved' | 'rejected' }[];
  goals?: string[];
  branchId?: string;
  branchName?: string;
  assignedReceptionistId?: string;
  assignedGuildMasterId?: string;
  assignedGuildMasterName?: string;
  // Trust & Growth Scores (calculated)
  trustScore?: number;
  growthScore?: number;
  responseTimeAvg?: number;
  activityStreak?: number;
}

// User with firestore document ID
export type User = GuildUser & { id: string };

export interface TransferRecord extends AuditFields {
  id: string;
  sourceUserId: string;
  targetUserId: string;
  entityTypes: LedgerCollection[];
  entityIds: string[];
  reason: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface LeaveRecord extends AuditFields {
  id: string;
  userId: string;
  startDate: string;
  endDate?: string;
  type: 'sick' | 'vacation' | 'sabbatical' | 'emergency';
  delegatedToId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export interface EscalationRecord extends AuditFields {
  id: string;
  entityType: LedgerCollection;
  entityId: string;
  fromRole: GuildRole;
  toRole: GuildRole;
  reason: string;
  status: 'open' | 'resolved';
}

export interface DisputeRecord extends AuditFields {
  id: string;
  category: 'verification' | 'payment' | 'promotion' | 'ownership' | 'conduct';
  entityId?: string;
  reporterId: string;
  accusedId?: string;
  description: string;
  evidence: string[];
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: string;
}

export interface Organization extends AuditFields {
  id: string;
  name: string;
  searchName: string; // Lowercase for duplicate detection
  category: 'Business' | 'NGO' | 'College' | 'Contractor' | 'Community Group' | 'Government Related';
  industry?: string;
  contactPerson: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  description?: string;
  needs: string[];
  opportunities: string[];
  currentStatus: OrganizationStatus;
  ownerId?: string;
  ownerEmail?: string; // Email for organization representative login
  trustLevel: 'new' | 'verified' | 'trusted' | 'partner';
  lastContactAt?: string;
  nextFollowUpAt?: string;
  relationshipNotes: string;
  // Branch membership
  branchId?: string;
  branchName?: string;
  // Profile expansion
  assignedReceptionistId?: string;
  assignedGuildMasterId?: string;
  verificationStatus?: VerificationStatus;
  industrySpecialization?: string;
  // Relationship tracking
  relationshipHistory?: { date: string; action: string; description: string; by: string }[];
  // Metrics
  needsProcessed?: number;
  opportunitiesCreated?: number;
  questsCreated?: number;
  outcomesDelivered?: number;
}

export interface InteractionRecord {
  id: string;
  organizationId?: string;
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
  searchName: string; // Lowercase for duplicate detection
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
  searchName: string; // Lowercase for duplicate detection
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
  applicants?: string[];
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

export type RevenueCategory = 'donation' | 'sponsorship' | 'partnership' | 'service' | 'membership' | 'grant' | 'event' | 'quest_payout' | 'other';

export interface RevenueEvent extends AuditFields {
  id: string;
  source: string;
  sourceName?: string;
  category: RevenueCategory;
  questId?: string;
  opportunityId?: string;
  organizationId?: string;
  organizationName?: string;
  amount: number;
  amountInHand?: number; // Amount physically received
  date: string;
  dateReceived?: string;
  city?: string;
  opportunityType?: string;
  participants: string[];
  // Attribution
  attributedBranchId?: string;
  attributedReceptionistId?: string;
  attributedGuildMasterId?: string;
  // Sustainability tracking
  recurring?: boolean;
  recurringPeriod?: 'monthly' | 'quarterly' | 'annually';
  projectedNextDate?: string;
  notes?: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalInHand: number;
  totalProjected: number;
  byCategory: Record<RevenueCategory, number>;
  byBranch: Record<string, number>;
  monthlyTrend: { month: string; amount: number }[];
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
  | "quest_application"
  | "quest_accepted"
  | "quest_removed"
  | "quest_overdue"
  | "submission_verified"
  | "submission_rejected"
  | "submission_pending"
  | "opportunity_completed"
  | "revenue_recorded"
  | "application_submitted"
  | "application_approved"
  | "application_rejected"
  | "rank_promotion"
  | "role_assignment"
  | "verification_pending"
  | "organization_assigned"
  | "escalation_received"
  | "city_health_warning"
  | "inactive_receptionist"
  | "state_no_leadership"
  | "emergency_succession"
  | "critical_audit_issue"
  | "security_issue"
  | "general_alert";

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'archived';

export interface NotificationRecord extends AuditFields {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  body: string;
  read: boolean; // Keep for backward compatibility if needed, but status is preferred
  channel: 'inApp' | 'email' | 'whatsapp' | 'sms';
  futureChannels: Array<'email' | 'whatsapp' | 'sms'>;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  aggregatedCount?: number;
  lastOccurrence?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  hint?: string;
}
