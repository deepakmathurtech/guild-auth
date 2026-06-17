import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../StatusBadge';
import { Bell, BriefcaseBusiness, Calendar, CheckCircle, ClipboardCheck, Sparkles } from 'lucide-react';
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

export function ReceptionistDashboard({ opportunities, quests, submissions, outcomes }: Props) {
  
  const navigate = useNavigate();
  
  const pendingSubs = submissions.filter(s => s.status === 'pending');
  // Overdue quests placeholder (assuming overdue if active and deadline passed. For V1.2 just showing active quests)
  const activeQuests = quests.filter(q => q.status === 'active');
  const recentOutcomes = outcomes.filter(o => o.verificationStatus === 'pending');
  const activeOpps = opportunities.filter(o => ['open', 'inProgress'].includes(o.status));
  
  return (
    <section className="workbench max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold">Command Center</h2>
          <p className="text-[var(--muted)]">Focus on today's priorities</p>
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
              <h3 className="text-yellow-700 dark:text-yellow-500 font-bold flex items-center gap-2"><Bell size={18} /> Pending Verifications</h3>
              <StatusBadge status={pendingSubs.length + ' waiting'} />
            </div>
            <div className="p-0">
              {pendingSubs.slice(0, 5).map(sub => (
                <div key={sub.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center cursor-pointer transition-colors" onClick={() => navigate(`/submissions/${sub.id}`)}>
                  <div>
                    <strong className="block text-sm">{sub.questTitle || sub.questId}</strong>
                    <span className="text-xs text-[var(--muted)]">By: {sub.memberId}</span>
                  </div>
                  <button className="primary text-xs px-3 py-1">Review</button>
                </div>
              ))}
              {pendingSubs.length === 0 && <div className="p-8 text-center text-[var(--muted)]">No pending verifications.</div>}
              {pendingSubs.length > 5 && <div className="p-3 text-center border-t border-[var(--border)]"><button className="ghost text-xs w-full" onClick={() => navigate('/submissions')}>View all {pendingSubs.length}</button></div>}
            </div>
          </section>

          <section className="panel p-0 overflow-hidden">
            <div className="bg-blue-500/10 border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h3 className="text-blue-700 dark:text-blue-400 font-bold flex items-center gap-2"><CheckCircle size={18} /> Draft Outcomes</h3>
              <StatusBadge status={recentOutcomes.length + ' pending'} />
            </div>
            <div className="p-0">
              {recentOutcomes.slice(0, 5).map(out => (
                <div key={out.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center cursor-pointer transition-colors" onClick={() => navigate(`/outcomes`)}>
                  <div>
                    <strong className="block text-sm">{out.title}</strong>
                    <span className="text-xs text-[var(--muted)]">{out.organizationName}</span>
                  </div>
                  <button className="primary bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1">Finalize</button>
                </div>
              ))}
              {recentOutcomes.length === 0 && <div className="p-8 text-center text-[var(--muted)]">No draft outcomes.</div>}
            </div>
          </section>
        </div>

        {/* Right Column: Tracking */}
        <div className="space-y-6">
          <section className="panel p-0 overflow-hidden">
            <div className="bg-purple-500/10 border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h3 className="text-purple-700 dark:text-purple-400 font-bold flex items-center gap-2"><ClipboardCheck size={18} /> Active Quests</h3>
              <StatusBadge status={activeQuests.length + ' active'} />
            </div>
            <div className="p-0">
              {activeQuests.slice(0, 5).map(q => (
                <div key={q.id} className="border-b border-[var(--border)] last:border-0 p-4 flex justify-between items-center">
                  <div>
                    <strong className="block text-sm truncate max-w-[200px]">{q.title}</strong>
                    <span className="text-xs text-[var(--muted)]">{q.ownerId ? `Owner: ${q.ownerId}` : 'Unassigned'}</span>
                  </div>
                  <StatusBadge status="active" />
                </div>
              ))}
              {activeQuests.length === 0 && <div className="p-8 text-center text-[var(--muted)]">No active quests.</div>}
            </div>
          </section>

          <section className="panel p-0 overflow-hidden">
            <div className="bg-[var(--card)] border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Calendar size={18} /> Today's Pipeline</h3>
            </div>
            <div className="p-4 space-y-4">
               {/* Very simple progress summary */}
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Opportunities In Progress</span>
                 <strong className="text-lg">{activeOpps.length}</strong>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Pending Verifications</span>
                 <strong className="text-lg">{pendingSubs.length}</strong>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Draft Outcomes</span>
                 <strong className="text-lg">{recentOutcomes.length}</strong>
               </div>
               <button className="w-full ghost text-sm mt-2" onClick={() => navigate('/')}>View Full Dashboard &rarr;</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
