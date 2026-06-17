import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../StatusBadge';
import { Bell, BriefcaseBusiness, Calendar, CheckCircle, ClipboardCheck, Sparkles, AlertTriangle, PhoneCall } from 'lucide-react';
import type { ActivityLog, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord, Quest, Outcome } from '../../types/guild';

interface Props {
  organizations: Organization[];
  needs: Need[];
  opportunities: Opportunity[];
  quests: Quest[];
  submissions: QuestSubmission[];
  outcomes: Outcome[];
  revenue: RevenueEvent[];
  verifications: VerificationRecord[];
  logs: ActivityLog[];
}

export function ReceptionistDashboard({ organizations, needs, opportunities, quests, submissions, outcomes }: Props) {
  const navigate = useNavigate();
  
  const pendingSubs = submissions.filter(s => s.status === 'pending');
  const needsWaiting = needs.filter(n => ['open', 'matching'].includes(n.status));
  const orgsFollowUp = organizations.filter(o => o.nextFollowUpAt && new Date(o.nextFollowUpAt).getTime() <= new Date().getTime());
  const draftOutcomes = outcomes.filter(o => o.verificationStatus === 'pending');
  
  return (
    <section className="workbench max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold">Command Center</h2>
          <p className="text-[var(--muted)]">Your next actions to keep The Guild moving.</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button className="panel flex flex-col items-center justify-center p-4 hover:border-[var(--primary)] transition-colors group" onClick={() => navigate('/organizations', { state: { showCreate: true } })}>
          <BriefcaseBusiness className="text-[var(--muted)] group-hover:text-[var(--primary)] mb-2" />
          <span className="font-semibold text-sm">New Org</span>
        </button>
        <button className="panel flex flex-col items-center justify-center p-4 hover:border-blue-500 transition-colors group" onClick={() => navigate('/needs', { state: { showCreate: true } })}>
          <Sparkles className="text-[var(--muted)] group-hover:text-blue-500 mb-2" />
          <span className="font-semibold text-sm">Log Need</span>
        </button>
        <button className="panel flex flex-col items-center justify-center p-4 hover:border-purple-500 transition-colors group" onClick={() => navigate('/opportunities', { state: { showCreate: true } })}>
          <ClipboardCheck className="text-[var(--muted)] group-hover:text-purple-500 mb-2" />
          <span className="font-semibold text-sm">Opportunity</span>
        </button>
        <button className="panel flex flex-col items-center justify-center p-4 hover:border-green-500 transition-colors group" onClick={() => navigate('/submissions')}>
          <CheckCircle className="text-[var(--muted)] group-hover:text-green-500 mb-2" />
          <span className="font-semibold text-sm">Verify ({pendingSubs.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Immediate Actions */}
        <div className="space-y-6">
          
          <section className="panel p-0 overflow-hidden">
            <div className="bg-yellow-500/10 border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h3 className="text-yellow-700 dark:text-yellow-500 font-bold flex items-center gap-2"><Bell size={18} /> My Next Actions</h3>
              <StatusBadge status={(pendingSubs.length + needsWaiting.length + orgsFollowUp.length + draftOutcomes.length) + ' tasks'} />
            </div>
            <div className="p-0">
              {orgsFollowUp.slice(0, 3).map(org => (
                <div key={org.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center cursor-pointer transition-colors" onClick={() => navigate(`/organizations/${org.id}`)}>
                  <div>
                    <strong className="block text-sm">Call {org.name}</strong>
                    <span className="text-xs text-[var(--muted)]">Contact: {org.contactPerson}</span>
                  </div>
                  <button className="secondary bg-[var(--bg-alt)] text-xs px-3 py-1 flex items-center gap-1"><PhoneCall size={12}/> Follow Up</button>
                </div>
              ))}
              {needsWaiting.slice(0, 3).map(need => (
                <div key={need.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center cursor-pointer transition-colors" onClick={() => navigate(`/needs/${need.id}`)}>
                  <div>
                    <strong className="block text-sm">Convert: {need.title}</strong>
                    <span className="text-xs text-[var(--muted)]">{need.organizationName}</span>
                  </div>
                  <button className="primary bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1">Assign</button>
                </div>
              ))}
              {pendingSubs.slice(0, 3).map(sub => (
                <div key={sub.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center cursor-pointer transition-colors" onClick={() => navigate(`/submissions/${sub.id}`)}>
                  <div>
                    <strong className="block text-sm">Verify: {sub.questTitle || sub.questId}</strong>
                    <span className="text-xs text-[var(--muted)]">By: {sub.memberId}</span>
                  </div>
                  <button className="primary bg-green-600 hover:bg-green-700 text-xs px-3 py-1">Review</button>
                </div>
              ))}
              {draftOutcomes.slice(0, 3).map(out => (
                <div key={out.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center cursor-pointer transition-colors" onClick={() => navigate(`/outcomes/${out.id}`)}>
                  <div>
                    <strong className="block text-sm">Record: {out.title}</strong>
                    <span className="text-xs text-[var(--muted)]">{out.organizationName}</span>
                  </div>
                  <button className="primary text-xs px-3 py-1">Finalize</button>
                </div>
              ))}

              {(pendingSubs.length + needsWaiting.length + orgsFollowUp.length + draftOutcomes.length) === 0 && (
                <div className="p-8 text-center text-[var(--muted)]">Inbox Zero! You are all caught up.</div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Tracking */}
        <div className="space-y-6">
          <section className="panel p-0 overflow-hidden">
            <div className="bg-[var(--card)] border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Calendar size={18} /> Today's Pipeline Overview</h3>
            </div>
            <div className="p-4 space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Organizations to Contact</span>
                 <strong className="text-lg text-yellow-500">{orgsFollowUp.length}</strong>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Needs Waiting</span>
                 <strong className="text-lg text-blue-500">{needsWaiting.length}</strong>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Pending Verifications</span>
                 <strong className="text-lg text-green-500">{pendingSubs.length}</strong>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Draft Outcomes</span>
                 <strong className="text-lg">{draftOutcomes.length}</strong>
               </div>
               <button className="w-full ghost text-sm mt-2" onClick={() => navigate('/organizations')}>View Organizations Directory &rarr;</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
