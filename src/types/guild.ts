export type GuildRole = 'member' | 'contributor' | 'receptionist' | 'guildManager' | 'guildAdmin';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ArchiveStatus = 'active' | 'archived';
export type OrganizationStatus = 'new' | 'contacted' | 'active' | 'partner' | 'inactive';
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
  | 'knowledgeArchive'
  | 'notifications';

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
  guildRank: string;
  reputationScore: number;
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
  interactionHistory: InteractionRecord[];
}

export interface InteractionRecord {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'visit' | 'note';
  summary: string;
  createdBy: string;
  createdAt: string;
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

export type QuestStatus = 'active' | 'completed' | 'archived';

export interface Quest extends AuditFields {
  id: string;
  opportunityId?: string;
  needId?: string;
  organizationId?: string;
  ownerId?: string;
  isMandatory: boolean;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  rewards: string;
  reputationPoints: number;
  requirements: string;
  submissionMethod: string;
  verificationMethod: VerificationMethod;
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
  outcomeId?: string;
  organizationId?: string;
  tags: string[];
  body: string;
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
