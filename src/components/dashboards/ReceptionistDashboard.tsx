import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../StatusBadge';
import {
  Bell, BriefcaseBusiness, Calendar, CheckCircle,
  ClipboardCheck, Sparkles, AlertTriangle, PhoneCall,
  Plus, ArrowUpRight, Activity, Clock, Zap,
  Building2, MapPin, Globe, Users, TrendingUp,
  ArrowRight, Target, Flame, HandHeart
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

export function ReceptionistDashboard({ organizations, needs, opportunities, quests, submissions, outcomes, verifications }: Props) {
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
      {/* Premium Hero Header */}
      <div className="group relative overflow-hidden rounded-3xl bg-[var(--card)] border border-[var(--border)] p-8 md:p-10">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary)]/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[var(--accent)]/15 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span className="text-xs font-medium text-[var(--warning)]">Live Operations</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Command Center</h1>
            <p className="text-[var(--text-muted)] text-lg max-w-xl leading-relaxed">
              Manage guild intake, maintain organizational health, and accelerate verification workflows.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="primary" onClick={() => navigate('/organizations', { state: { showCreate: true } })}>
              <Plus className="w-4 h-4" /> New Organization
            </button>
            <button className="secondary" onClick={() => navigate('/needs', { state: { showCreate: true } })}>
               New Need
            </button>
          </div>
        </div>

        {/* Stats row overlay */}
        <div className="relative mt-8 pt-6 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-8 md:gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text)]">{organizations.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Organizations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center">
                <Target className="w-5 h-5 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text)]">{quests.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Active Quests</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text)]">{verifications.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Verifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="group relative overflow-hidden p-5 rounded-2xl bg-[var(--card-subtle)]/50 border border-[var(--border)] backdrop-blur-md text-center transition-all hover:bg-[var(--card-subtle)] hover:border-[var(--border-light)] hover:scale-[1.02] hover:shadow-xl cursor-pointer" onClick={() => {
            if (kpi.label === 'Follow-ups') navigate('/organizations');
            if (kpi.label === 'Pending Needs') navigate('/needs');
            if (kpi.label === 'Submissions') navigate('/submissions');
          }}>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className={`inline-flex p-2.5 rounded-xl mb-3 ${kpi.color.replace('text-', 'bg-')}/10`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className="text-3xl font-bold text-[var(--text)]">{kpi.value}</p>
            </div>
            <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10">
        {/* Main Work Stream */}
        <div className="space-y-8">
          
          {/* Premium Operational Alerts */}
          {healthIssues.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Operational Alerts</h3>
              </div>
              <div className="grid gap-3">
                {healthIssues.slice(0, 4).map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-rose-500/5 to-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer group" onClick={() => navigate(`/${issue.entityType}s/${issue.entityId}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50" />
                      <div>
                        <p className="text-sm font-semibold text-rose-400">{issue.message}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Recommendation: {issue.fix}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-rose-500/40 group-hover:text-rose-500 transition-all" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Premium Action Queue */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Action Queue</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block mr-1.5 animate-pulse" />
                Live
              </span>
            </div>

            <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-sm overflow-hidden divide-y divide-[var(--border)]">
              {orgsFollowUp.length > 0 && orgsFollowUp.slice(0, 3).map(org => (
                <div key={org.id} className="p-4 flex items-center justify-between hover:bg-[var(--card-subtle)] transition-all cursor-pointer group" onClick={() => navigate(`/organizations/${org.id}`)}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 ring-1 ring-amber-500/20">
                        <PhoneCall className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-[var(--text-secondary)]">Follow up with {org.name}</p>
                       <p className="text-xs text-[var(--text-muted)]">Contact: {org.contactPerson}</p>
                     </div>
                   </div>
                   <button className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium transition-all hover:bg-amber-500/20 hover:border-amber-500/40 opacity-0 group-hover:opacity-100">
                     Call Now
                   </button>
                </div>
              ))}

              {needsWaiting.length > 0 && needsWaiting.slice(0, 3).map(need => (
                <div key={need.id} className="p-4 flex items-center justify-between hover:bg-[var(--card-subtle)] transition-all cursor-pointer group" onClick={() => navigate(`/needs/${need.id}`)}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 ring-1 ring-blue-500/20">
                        <Sparkles className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-[var(--text-secondary)]">Convert Need: {need.title}</p>
                       <p className="text-xs text-[var(--text-muted)]">Org: {need.organizationName}</p>
                     </div>
                   </div>
                   <button className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium transition-all hover:bg-blue-500/20 hover:border-blue-500/40 opacity-0 group-hover:opacity-100">
                     Assign
                   </button>
                </div>
              ))}

              {pendingSubs.length > 0 && pendingSubs.slice(0, 3).map(sub => (
                <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-[var(--card-subtle)] transition-all cursor-pointer group" onClick={() => navigate(`/submissions/${sub.id}`)}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-1 ring-emerald-500/20">
                        <CheckCircle className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-[var(--text-secondary)]">Verify Submission: {sub.questTitle || 'Pending Quest'}</p>
                       <p className="text-xs text-[var(--text-muted)]">By Member ID: {sub.memberId.slice(0, 8)}</p>
                     </div>
                   </div>
                   <button className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 opacity-0 group-hover:opacity-100">
                     Review
                   </button>
                </div>
              ))}

              {(orgsFollowUp.length + needsWaiting.length + pendingSubs.length) === 0 && (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold text-[var(--text-secondary)]">All caught up</h4>
                  <p className="text-sm text-[var(--text-muted)] mt-1">The operation is running smoothly.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Premium Pipeline Sidebar */}
        <aside className="space-y-6">
          <div className="group relative overflow-hidden rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-md p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-4 h-4 text-cyan-500" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pipeline Efficiency</h3>
              </div>

              <div className="space-y-5">
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span className="text-[var(--text-secondary)]">Org Conversion</span>
                     <span className="font-bold text-[var(--text)]">84%</span>
                   </div>
                   <div className="h-1.5 w-full bg-[var(--card-subtle)] rounded-full overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: '84%' }} />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span className="text-[var(--text-secondary)]">Quest Movement</span>
                     <span className="font-bold text-[var(--text)]">62%</span>
                   </div>
                   <div className="h-1.5 w-full bg-[var(--card-subtle)] rounded-full overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: '62%' }} />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <div className="flex justify-between text-xs">
                     <span className="text-[var(--text-secondary)]">Verification Speed</span>
                     <span className="font-bold text-[var(--text)]">91%</span>
                   </div>
                   <div className="h-1.5 w-full bg-[var(--card-subtle)] rounded-full overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '91%' }} />
                   </div>
                 </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[var(--border)]">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-11 h-11 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-cyan-400 font-bold text-lg">
                     {organizations.length}
                   </div>
                   <div>
                     <p className="text-sm font-semibold text-[var(--text)]">Total Portfolios</p>
                     <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Active Organizations</p>
                   </div>
                 </div>
                 <button className="w-full py-2.5 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium transition-all hover:bg-[var(--border)]" onClick={() => navigate('/organizations')}>
                   View Directory
                 </button>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-[var(--card)] to-[var(--bg-alt)] border border-cyan-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
            <div className="relative flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-cyan-400 mb-1">PRO TIP</p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Use <strong className="text-[var(--text-secondary)]">⌘K</strong> to search for any member or organization across the national federation.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

