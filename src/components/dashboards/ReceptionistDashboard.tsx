import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../StatusBadge';
import { 
  Bell, BriefcaseBusiness, Calendar, CheckCircle, 
  ClipboardCheck, Sparkles, AlertTriangle, PhoneCall,
  Plus, ArrowUpRight, Activity, Clock
} from 'lucide-react';
import type { ActivityLog, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord, Quest, Outcome } from '../../types/guild';
import { auditQuestHealth, auditOrganizationHealth, type HealthIssue } from '../../services/healthService';

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
  const incompleteQuests = quests.filter(q => (q.completenessScore || 0) < 100 && q.status !== 'archived');

  const healthIssues = useMemo(() => {
    const issues: HealthIssue[] = [];
    quests.forEach(q => issues.push(...auditQuestHealth(q)));
    organizations.forEach(o => issues.push(...auditOrganizationHealth(o, quests.filter(q => q.organizationId === o.id))));
    return issues.sort((a, b) => {
      const priority = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority];
    });
  }, [quests, organizations]);

  const kpis = [
    { label: 'Follow-ups', value: orgsFollowUp.length, color: 'text-amber-500', icon: PhoneCall },
    { label: 'Pending Needs', value: needsWaiting.length, color: 'text-blue-500', icon: Sparkles },
    { label: 'Submissions', value: pendingSubs.length, color: 'text-emerald-500', icon: CheckCircle },
    { label: 'Health Alerts', value: healthIssues.length, color: 'text-rose-500', icon: AlertTriangle },
  ];
  
  return (
    <div className="space-y-10 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Command Center</p>
          <h1>Operational Dashboard</h1>
          <p className="text-[var(--text-secondary)] max-w-lg">
            Manage guild intake, maintain organizational health, and accelerate verification workflows.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="primary" onClick={() => navigate('/organizations', { state: { showCreate: true } })}>
            <Plus className="w-4 h-4" /> New Organization
          </button>
          <button className="secondary" onClick={() => navigate('/needs', { state: { showCreate: true } })}>
             New Need
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="metrics-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="metric-card group hover:border-[var(--primary)]/30 transition-all cursor-pointer" onClick={() => {
            if (kpi.label === 'Follow-ups') navigate('/organizations');
            if (kpi.label === 'Pending Needs') navigate('/needs');
            if (kpi.label === 'Submissions') navigate('/submissions');
          }}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-[var(--card-subtle)] ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div>
              <span>{kpi.label}</span>
              <strong className="block text-3xl font-bold">{kpi.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10">
        {/* Main Work Stream */}
        <div className="space-y-8">
          
          {/* Priority Alerts */}
          {healthIssues.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Operational Alerts</h3>
              </div>
              <div className="grid gap-3">
                {healthIssues.slice(0, 4).map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer group" onClick={() => navigate(`/${issue.entityType}s/${issue.entityId}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <div>
                        <p className="text-sm font-bold text-rose-500/90">{issue.message}</p>
                        <p className="text-xs text-[var(--text-muted)]">Recommendation: {issue.fix}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-rose-500/40 group-hover:text-rose-500 transition-all" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Task Queue */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Action Queue</h3>
              </div>
              <StatusBadge status="Live Updates" className="!bg-transparent !border-transparent !text-[var(--primary)]" />
            </div>
            
            <div className="panel p-0 overflow-hidden divide-y divide-[var(--border)]">
              {orgsFollowUp.length > 0 && orgsFollowUp.slice(0, 3).map(org => (
                <div key={org.id} className="p-5 flex items-center justify-between hover:bg-[var(--card-subtle)]/50 transition-all cursor-pointer group" onClick={() => navigate(`/organizations/${org.id}`)}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <PhoneCall className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-bold">Follow up with {org.name}</p>
                       <p className="text-xs text-[var(--text-muted)]">Contact: {org.contactPerson}</p>
                     </div>
                   </div>
                   <button className="secondary !py-2 !px-4 !rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all">
                     Call Now
                   </button>
                </div>
              ))}

              {needsWaiting.length > 0 && needsWaiting.slice(0, 3).map(need => (
                <div key={need.id} className="p-5 flex items-center justify-between hover:bg-[var(--card-subtle)]/50 transition-all cursor-pointer group" onClick={() => navigate(`/needs/${need.id}`)}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Sparkles className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-bold">Convert Need: {need.title}</p>
                       <p className="text-xs text-[var(--text-muted)]">Org: {need.organizationName}</p>
                     </div>
                   </div>
                   <button className="primary !py-2 !px-4 !rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all">
                     Assign
                   </button>
                </div>
              ))}

              {pendingSubs.length > 0 && pendingSubs.slice(0, 3).map(sub => (
                <div key={sub.id} className="p-5 flex items-center justify-between hover:bg-[var(--card-subtle)]/50 transition-all cursor-pointer group" onClick={() => navigate(`/submissions/${sub.id}`)}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-bold">Verify Submission: {sub.questTitle || 'Pending Quest'}</p>
                       <p className="text-xs text-[var(--text-muted)]">By Member ID: {sub.memberId.slice(0, 8)}</p>
                     </div>
                   </div>
                   <button className="primary !py-2 !px-4 !rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all">
                     Review
                   </button>
                </div>
              ))}

              {(orgsFollowUp.length + needsWaiting.length + pendingSubs.length) === 0 && (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--card-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                    <CheckCircle className="w-8 h-8 text-[var(--primary)]/40" />
                  </div>
                  <h4 className="font-bold">All caught up</h4>
                  <p className="text-sm text-[var(--text-muted)]">The operation is running smoothly.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Side Stats/Pipeline */}
        <aside className="space-y-8">
          <section className="panel p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pipeline Efficiency</h3>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                   <span className="text-[var(--text-secondary)]">Org Conversion</span>
                   <span className="font-bold">84%</span>
                 </div>
                 <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                   <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: '84%' }} />
                 </div>
               </div>

               <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                   <span className="text-[var(--text-secondary)]">Quest Movement</span>
                   <span className="font-bold">62%</span>
                 </div>
                 <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 rounded-full" style={{ width: '62%' }} />
                 </div>
               </div>

               <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                   <span className="text-[var(--text-secondary)]">Verification Speed</span>
                   <span className="font-bold">91%</span>
                 </div>
                 <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 rounded-full" style={{ width: '91%' }} />
                 </div>
               </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[var(--border)]">
               <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-[var(--primary)] font-bold text-xl">
                   {organizations.length}
                 </div>
                 <div>
                   <p className="text-sm font-bold">Total Portfolios</p>
                   <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Active Organizations</p>
                 </div>
               </div>
               <button className="w-full ghost !py-2.5 !text-xs" onClick={() => navigate('/organizations')}>
                 View Directory
               </button>
            </div>
          </section>

          <div className="p-6 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/10">
            <p className="text-xs font-bold text-[var(--primary)] mb-2">PRO TIP</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Use <strong>Command + K</strong> to search for any member or organization across the national federation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

