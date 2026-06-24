import { FormEvent, useEffect, useMemo, useState } from 'react';
import { limit, orderBy, where } from 'firebase/firestore';
import { archiveLedgerRecord, createLedgerRecord, subscribeRecords, updateLedgerRecord } from '../lib/repository';
import { useAuth } from '../context/AuthContext';
import type { EntityMap } from '../lib/repository';
import type { GuildRole } from '../types/guild';
import { hasRole } from '../lib/rbac';

type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'tags';
type Field = { name: string; label: string; type: FieldType; options?: string[]; required?: boolean; placeholder?: string };

type WorkbenchConfig<K extends keyof EntityMap | 'activityLogs'> = {
  collectionName: K;
  title: string;
  description: string;
  roles: GuildRole[];
  fields: Field[];
  defaults: Record<string, unknown>;
  action: string;
  searchable: string[];
};

const configs: Record<string, WorkbenchConfig<keyof EntityMap | 'activityLogs'>> = {
  organizations: {
    collectionName: 'organizations',
    title: 'Organization Management',
    description: 'Receptionists map businesses, NGOs, colleges, contractors, communities, and government-related contacts with full interaction history.',
    roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Organization Created',
    searchable: ['name', 'category', 'city', 'currentStatus'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Business', 'NGO', 'College', 'Contractor', 'Community Group', 'Government Related'], required: true },
      { name: 'contactPerson', label: 'Contact Person', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'currentStatus', label: 'Status', type: 'select', options: ['new', 'contacted', 'active', 'partner', 'inactive'], required: true }
    ],
    defaults: { needs: [], opportunities: [], interactionHistory: [], currentStatus: 'new' }
  },
  needs: {
    collectionName: 'needs',
    title: 'Needs System',
    description: 'Capture discovered problems and needs before they become opportunities.',
    roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Need Created',
    searchable: ['title', 'priority', 'city', 'status'],
    fields: [
      { name: 'title', label: 'Need Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'], required: true },
      { name: 'organizationId', label: 'Organization ID', type: 'text', required: true },
      { name: 'organizationName', label: 'Organization Name', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'deadline', label: 'Deadline', type: 'date' },
      { name: 'estimatedValue', label: 'Estimated Value', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['submitted', 'underReview', 'accepted', 'convertedToOpportunity', 'questCreationInProgress', 'inProgress', 'completed', 'closed'], required: true }
    ],
    defaults: { status: 'submitted', estimatedValue: 0 }
  },
  opportunities: {
    collectionName: 'opportunities',
    title: 'Opportunity System',
    description: 'Convert needs into assignable opportunities, collect applications, and move completed work into outcomes.',
    roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Opportunity Created',
    searchable: ['title', 'category', 'organizationName', 'status'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'skillsRequired', label: 'Skills Required', type: 'tags' },
      { name: 'category', label: 'Category', type: 'text', required: true },
      { name: 'needId', label: 'Related Need ID', type: 'text' },
      { name: 'organizationId', label: 'Organization ID', type: 'text' },
      { name: 'organizationName', label: 'Organization Name', type: 'text' },
      { name: 'assignedMembers', label: 'Assigned Member UIDs', type: 'tags' },
      { name: 'deadline', label: 'Deadline', type: 'date' },
      { name: 'estimatedRevenue', label: 'Estimated Revenue', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'open', 'matching', 'assigned', 'inProgress', 'completed', 'archived'], required: true }
    ],
    defaults: { status: 'open', applicants: [], assignedMembers: [], estimatedRevenue: 0, assignedReceptionist: '' }
  },
  quests: {
    collectionName: 'quests',
    title: 'Quest System',
    description: 'Create repeatable quests with requirements, submission methods, and verification logic.',
    roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Quest Created',
    searchable: ['title', 'category', 'difficulty'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'text', required: true },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard', 'legendary'], required: true },
      { name: 'rewards', label: 'Rewards', type: 'text' },
      { name: 'reputationPoints', label: 'Reputation Points', type: 'number' },
      { name: 'requirements', label: 'Requirements', type: 'textarea' },
      { name: 'submissionMethod', label: 'Submission Method', type: 'text' },
      { name: 'verificationMethod', label: 'Verification Method', type: 'select', options: ['reportReview', 'documentUpload', 'receiptUpload', 'organizationConfirmation', 'manualReview'] }
    ],
    defaults: { status: 'active', reputationPoints: 0, verificationMethod: 'manualReview' }
  },
  submissions: {
    collectionName: 'questSubmissions',
    title: 'Quest Submissions',
    description: 'Members submit reports, images, documents, links, and videos. Receptionists verify without losing history.',
    roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Quest Submission Created',
    searchable: ['questTitle', 'memberId', 'status'],
    fields: [
      { name: 'questId', label: 'Quest ID', type: 'text', required: true },
      { name: 'questTitle', label: 'Quest Title', type: 'text' },
      { name: 'memberId', label: 'Member UID', type: 'text' },
      { name: 'report', label: 'Report', type: 'textarea' },
      { name: 'evidenceUrls', label: 'Evidence URLs', type: 'tags' },
      { name: 'links', label: 'Links', type: 'tags' },
      { name: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'rejected'] },
      { name: 'reviewerNotes', label: 'Reviewer Notes', type: 'textarea' }
    ],
    defaults: { evidenceUrls: [], links: [], status: 'pending', memberId: '' }
  },
  verification: {
    collectionName: 'verifications',
    title: 'Verification Engine',
    description: 'Review outcomes, documents, receipts, organization confirmations, and manual evidence.',
    roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Verification Record Created',
    searchable: ['targetCollection', 'targetId', 'decision'],
    fields: [
      { name: 'targetCollection', label: 'Target Collection', type: 'select', options: ['users', 'organizations', 'needs', 'opportunities', 'quests', 'questSubmissions', 'outcomes', 'revenueEvents', 'knowledgeArchive'] },
      { name: 'targetId', label: 'Target ID', type: 'text', required: true },
      { name: 'method', label: 'Method', type: 'select', options: ['reportReview', 'documentUpload', 'receiptUpload', 'organizationConfirmation', 'manualReview'] },
      { name: 'evidence', label: 'Evidence URLs', type: 'tags' },
      { name: 'decision', label: 'Decision', type: 'select', options: ['pending', 'verified', 'rejected'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    defaults: { decision: 'pending', method: 'manualReview', reviewer: '', timestamp: '' }
  },
  outcomes: {
    collectionName: 'outcomes',
    title: 'Outcome System',
    description: 'Completed opportunities become outcomes and feed the permanent knowledge base.',
    roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Outcome Recorded',
    searchable: ['title', 'organizationName', 'verificationStatus'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'relatedOpportunityId', label: 'Related Opportunity ID', type: 'text', required: true },
      { name: 'participants', label: 'Participant UIDs', type: 'tags' },
      { name: 'organizationId', label: 'Organization ID', type: 'text' },
      { name: 'organizationName', label: 'Organization Name', type: 'text' },
      { name: 'evidence', label: 'Evidence URLs', type: 'tags' },
      { name: 'revenueGenerated', label: 'Revenue Generated', type: 'number' },
      { name: 'verificationStatus', label: 'Verification Status', type: 'select', options: ['pending', 'verified', 'rejected'] },
      { name: 'lessonsLearned', label: 'Lessons Learned', type: 'textarea' }
    ],
    defaults: { participants: [], evidence: [], revenueGenerated: 0, verificationStatus: 'pending' }
  },
  revenue: {
    collectionName: 'revenueEvents',
    title: 'Revenue Tracking',
    description: 'Manually track all value creation by receptionist, city, month, and opportunity type.',
    roles: ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Revenue Recorded',
    searchable: ['source', 'organizationName', 'city', 'opportunityType'],
    fields: [
      { name: 'source', label: 'Source', type: 'text', required: true },
      { name: 'opportunityId', label: 'Opportunity ID', type: 'text' },
      { name: 'organizationId', label: 'Organization ID', type: 'text' },
      { name: 'organizationName', label: 'Organization Name', type: 'text' },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'opportunityType', label: 'Opportunity Type', type: 'text' },
      { name: 'participants', label: 'Participant UIDs', type: 'tags' }
    ],
    defaults: { amount: 0, participants: [] }
  },
  knowledge: {
    collectionName: 'knowledgeBase',
    title: 'Knowledge Archive',
    description: 'Preserve lessons, success stories, failure reports, playbooks, templates, and organization insights.',
    roles: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Knowledge Record Created',
    searchable: ['title', 'type', 'body'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['lesson', 'successStory', 'failureReport', 'playbook', 'template', 'organizationInsight'] },
      { name: 'outcomeId', label: 'Outcome ID', type: 'text' },
      { name: 'organizationId', label: 'Organization ID', type: 'text' },
      { name: 'tags', label: 'Tags', type: 'tags' },
      { name: 'body', label: 'Body', type: 'textarea', required: true }
    ],
    defaults: { tags: [] }
  },
  ledger: {
    collectionName: 'activityLogs',
    title: 'Guild Ledger & Audit Trail',
    description: 'Permanent audit trail. Operational records are archived by status instead of deleted.',
    roles: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'Ledger Viewed',
    searchable: ['action', 'userName', 'relatedEntityType'],
    fields: [],
    defaults: {}
  },
  admin: {
    collectionName: 'users',
    title: 'Admin Panel',
    description: 'Manage users, roles, permissions, verification audits, revenue records, and global configuration.',
    roles: ['centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
    action: 'User Created',
    searchable: ['fullName', 'email', 'role', 'city'],
    fields: [
      { name: 'uid', label: 'UID', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'role', label: 'Role', type: 'select', options: ['applicant', 'member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'skills', label: 'Skills', type: 'tags' },
      { name: 'interests', label: 'Interests', type: 'tags' },
      { name: 'verificationStatus', label: 'Verification Status', type: 'select', options: ['pending', 'verified', 'rejected'] },
      { name: 'guildRank', label: 'Guild Rank', type: 'text' },
      { name: 'reputationScore', label: 'Reputation Score', type: 'number' }
    ],
    defaults: { role: 'applicant', skills: [], interests: [], verificationStatus: 'pending', guildRank: 'Applicant', reputationScore: 0, completedQuests: 0, verifiedOutcomes: 0, revenueEarned: 0, activityHistory: [] }
  }
};

function initialForm(fields: Field[], defaults: Record<string, unknown>) {
  const form: Record<string, string> = {};
  fields.forEach((field) => {
    const value = defaults[field.name];
    form[field.name] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  });
  return form;
}

function serialize(form: Record<string, string>, fields: Field[], defaults: Record<string, unknown>, actorId: string) {
  const data: Record<string, unknown> = { ...defaults };
  fields.forEach((field) => {
    const raw = form[field.name]?.trim() || '';
    if (field.type === 'number') data[field.name] = Number(raw || 0);
    else if (field.type === 'tags') data[field.name] = raw ? raw.split(',').map((x) => x.trim()).filter(Boolean) : [];
    else data[field.name] = raw;
  });
  if ('assignedReceptionist' in data && !data.assignedReceptionist) data.assignedReceptionist = actorId;
  if ('reviewer' in data && !data.reviewer) data.reviewer = actorId;
  if ('memberId' in data && !data.memberId) data.memberId = actorId;
  if ('timestamp' in data && !data.timestamp) data.timestamp = new Date().toISOString();
  return data;
}

function renderValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value ?? '');
}

export function WorkbenchPage({ kind }: { kind: keyof typeof configs }) {
  const config = configs[kind];
  const { profile } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState(() => initialForm(config.fields, config.defaults));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const constraints = config.collectionName === 'activityLogs' ? [orderBy('time', 'desc'), limit(100)] : [where('archiveStatus', '==', 'active'), orderBy('updatedAt', 'desc'), limit(100)];
    return subscribeRecords(config.collectionName as any, setRecords, constraints as any);
  }, [config.collectionName]);

  const canCreate = profile && config.fields.length > 0 && hasRole(profile.role, config.roles);
  const visible = useMemo(() => records.filter((record) => {
    const haystack = config.searchable.map((key) => renderValue(record[key])).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [records, search, config.searchable]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile || !canCreate) return;
    setStatus('Saving...');
    try {
      const data = serialize(form, config.fields, config.defaults, profile.uid);
      await createLedgerRecord(config.collectionName as any, data as any, profile, config.action);
      setForm(initialForm(config.fields, config.defaults));
      setStatus('Saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed.');
    }
  }

  async function archive(id: string) {
    if (!profile) return;
    await archiveLedgerRecord(config.collectionName as any, id, profile);
  }

  async function quickUpdate(id: string, key: string, value: string, currentUpdatedAt?: string) {
    if (!profile) return;
    try {
      await updateLedgerRecord(config.collectionName as any, id, { [key]: value } as any, profile, `${config.title} updated`, { checkUpdatedAt: currentUpdatedAt });
    } catch (err: any) {
      alert(`Concurrency Error: ${err.message}. Please refresh.`);
    }
  }

  return (
    <section className="workbench">
      <div className="panel intro">
        <p className="eyebrow">{config.title}</p>
        <h2>{config.description}</h2>
        <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search and filter..." />
      </div>
      {canCreate && (
        <form className="panel form-grid" onSubmit={submit}>
          {config.fields.map((field) => (
            <label key={field.name} className={field.type === 'textarea' ? 'span-2' : ''}>{field.label}
              {field.type === 'textarea' ? <textarea value={form[field.name] || ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} required={field.required} placeholder={field.placeholder} /> : field.type === 'select' ? <select value={form[field.name] || ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} required={field.required}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} value={form[field.name] || ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} required={field.required} placeholder={field.type === 'tags' ? 'Comma separated' : field.placeholder} />}
            </label>
          ))}
          <button className="primary span-2" type="submit">Save to Guild Ledger</button>
          {status && <p className="muted span-2">{status}</p>}
        </form>
      )}
      <div className="records-grid">
        {visible.map((record) => <article className="record-card" key={record.id || record.uid || record.time}>
          <div className="record-head"><strong>{record.title || record.name || record.fullName || record.action || record.id}</strong><small>{record.status || record.currentStatus || record.role || record.decision || record.type}</small></div>
          {Object.entries(record).filter(([key]) => !['createdAtServer', 'updatedAtServer'].includes(key)).slice(0, 12).map(([key, value]) => <p key={key}><span>{key}</span>{renderValue(value)}</p>)}
          <div className="record-actions">
            {'status' in record && <select value={record.status} onChange={(e) => quickUpdate(record.id, 'status', e.target.value, record.updatedAt)}><option>{record.status}</option><option value="open">open</option><option value="matching">matching</option><option value="assigned">assigned</option><option value="inProgress">inProgress</option><option value="completed">completed</option><option value="archived">archived</option></select>}
            {'currentStatus' in record && <select value={record.currentStatus} onChange={(e) => quickUpdate(record.id, 'currentStatus', e.target.value, record.updatedAt)}><option>{record.currentStatus}</option><option value="new">new</option><option value="contacted">contacted</option><option value="active">active</option><option value="partner">partner</option><option value="inactive">inactive</option></select>}
            {record.id && config.collectionName !== 'activityLogs' && <button className="ghost" type="button" onClick={() => archive(record.id)}>Archive</button>}
          </div>
        </article>)}
      </div>
    </section>
  );
}
