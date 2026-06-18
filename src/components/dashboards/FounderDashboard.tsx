import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, Organization, Opportunity, Quest, GuildUser, RevenueEvent, Need, GuildRole } from '../../types/guild';
import { 
  Shield, Target, Activity, TrendingUp, Users, BookOpen, 
  AlertCircle, Clock, CheckCircle2, Map, Plus, ArrowUpRight,
  Globe, UserCheck, BarChart3, HardHat
} from 'lucide-react';
import { auditQuestHealth, type HealthIssue } from '../../services/healthService';
import { approveUserRole } from '../../services/workflowService';
import { StatusBadge } from '../StatusBadge';

export function FounderDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<{
    users: GuildUser[],
    orgs: Organization[],
    opps: Opportunity[],
    needs: Need[],
    quests: Quest[],
    revenue: RevenueEvent[],
    logs: ActivityLog[],
    states: any[]
  }>({
    users: [],
    orgs: [],
    opps: [],
    needs: [],
    quests: [],
    revenue: [],
    logs: [],
    states: []
  });

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    async function loadFounderData() {
      const [u, o, opp, n, q, r, l, s] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'organizations')),
        getDocs(collection(db, 'opportunities')),
        getDocs(collection(db, 'needs')),
        getDocs(collection(db, 'quests')),
        getDocs(collection(db, 'revenueEvents')),
        getDocs(query(collection(db, 'activityLogs'), orderBy('time', 'desc'), limit(20))),
        getDocs(collection(db, 'guildStates'))
      ]);

      setData({
        users: u.docs.map(d => d.data() as GuildUser),
        orgs: o.docs.map(d => d.data() as Organization),
        opps: opp.docs.map(d => d.data() as Opportunity),
        needs: n.docs.map(d => d.data() as Need),
        quests: q.docs.map(d => d.data() as Quest),
        revenue: r.docs.map(d => d.data() as RevenueEvent),
        logs: l.docs.map(d => d.data() as ActivityLog),
        states: s.docs.map(d => d.data())
      });
      setLoading(false);
    }
    loadFounderData();
  }, []);

  async function handleApprove(userId: string, role: GuildRole) {
    if (!profile) return;
    setApproving(userId);
    try {
      await approveUserRole(userId, role, 'National Federation Approval', profile);
      const u = await getDocs(collection(db, 'users'));
      setData(prev => ({ ...prev, users: u.docs.map(d => d.data() as GuildUser) }));
    } catch (err: any) {
      alert(err.message);
    }
    setApproving(null);
  }

  const metrics = useMemo(() => {
    const totalRev = data.revenue.reduce((s, i) => s + (i.amount || 0), 0);
    const activeQuests = data.quests.filter(q => q.status !== 'completed' && q.status !== 'closed' && q.status !== 'archived').length;
    const completedQuests = data.quests.filter(q => q.status === 'completed').length;
    const totalKnowledge = data.users.reduce((s, i) => s + (i.knowledgeEntriesCount || 0), 0);
    const totalCities = new Set(data.users.map(u => u.jurisdiction?.cityId).filter(Boolean)).size;
    const totalMasters = data.users.filter(u => ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'].includes(u.role)).length;
    const issues: HealthIssue[] = [];
    data.quests.forEach(q => issues.push(...auditQuestHealth(q)));
    
    return {
      totalRev,
      activeQuests,
      completedQuests,
      totalKnowledge,
      totalCities,
      totalMasters,
      healthScore: Math.max(0, 100 - (issues.filter(i => i.type === 'CRITICAL').length * 5)),
      criticalIssues: issues.filter(i => i.type === 'CRITICAL').length,
      warningIssues: issues.filter(i => i.type === 'WARNING').length
    };
  }, [data]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
    </div>
  );

  const pendingApplicants = data.users.filter(u => u.role === 'applicant');

  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      {/* National Oversight Hero */}
      <div className="hero-panel bg-black border-none shadow-none text-white !p-12 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
          background: 'radial-gradient(circle at 70% 20%, var(--glow-gold) 0%, transparent 60%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div>
            <p className="eyebrow text-[var(--primary)]">National Federation Oversight</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">India Guild Health: {metrics.healthScore}%</h1>
            <p className="text-[var(--text-muted)] max-w-lg text-lg leading-relaxed">
              Managing operations across {data.states.length} States and {metrics.totalCities} Cities with decentralized verification.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md text-center min-w-[160px]">
              <span className="block text-4xl font-bold tracking-tighter mb-1">{data.users.length}</span>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Total Members</span>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md text-center min-w-[160px]">
              <span className="block text-4xl font-bold tracking-tighter mb-1">₹{(metrics.totalRev / 1000).toFixed(1)}k</span>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Revenue Flow</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="metrics-grid">
        <div className="metric-card bg-blue-500/5 border-blue-500/10">
           <div className="flex justify-between items-start">
             <span className="text-blue-500/60 font-bold">Active States</span>
             <Globe className="w-4 h-4 text-blue-500" />
           </div>
           <strong className="text-blue-500">{data.states.length}</strong>
        </div>
        <div className="metric-card bg-purple-500/5 border-purple-500/10">
           <div className="flex justify-between items-start">
             <span className="text-purple-500/60 font-bold">Guild Masters</span>
             <Shield className="w-4 h-4 text-purple-500" />
           </div>
           <strong className="text-purple-500">{metrics.totalMasters}</strong>
        </div>
        <div className="metric-card bg-emerald-500/5 border-emerald-500/10">
           <div className="flex justify-between items-start">
             <span className="text-emerald-500/60 font-bold">Live Quests</span>
             <BarChart3 className="w-4 h-4 text-emerald-500" />
           </div>
           <strong className="text-emerald-500">{metrics.activeQuests}</strong>
        </div>
        <div className="metric-card bg-rose-500/5 border-rose-500/10">
           <div className="flex justify-between items-start">
             <span className="text-rose-500/60 font-bold">Critical Risks</span>
             <AlertCircle className="w-4 h-4 text-rose-500" />
           </div>
           <strong className="text-rose-500">{metrics.criticalIssues}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-10">
        <div className="space-y-10">
          {/* Applications Queue */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold tracking-tight">Pending Command Appointments</h2>
            </div>
            
            <div className="space-y-4">
               {pendingApplicants.map(u => (
                 <div key={u.uid} className="panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-[var(--primary)]/30 transition-all group">
                   <div>
                     <p className="font-bold text-base mb-1">{u.fullName}</p>
                     <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                       <MapPin className="w-3 h-3" /> {u.jurisdiction?.cityName}, {u.jurisdiction?.stateName}
                     </div>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      <button className="secondary !py-2 !px-4 text-[10px]" disabled={!!approving} onClick={() => handleApprove(u.uid, 'member')}>Member</button>
                      <button className="secondary !py-2 !px-4 text-[10px]" disabled={!!approving} onClick={() => handleApprove(u.uid, 'receptionist')}>Receptionist</button>
                      <button className="primary !py-2 !px-4 text-[10px]" disabled={!!approving} onClick={() => handleApprove(u.uid, 'cityGuildMaster')}>City Master</button>
                      <button className="primary !py-2 !px-4 text-[10px] !bg-purple-500 !text-white" disabled={!!approving} onClick={() => handleApprove(u.uid, 'stateGuildMaster')}>State Master</button>
                   </div>
                 </div>
               ))}
               {pendingApplicants.length === 0 && (
                 <div className="panel p-12 text-center border-dashed">
                   <p className="text-[var(--text-muted)] italic">No pending command applications at the national level.</p>
                 </div>
               )}
            </div>
          </section>

          {/* Audit Log */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold tracking-tight">National Operational Audit</h2>
            </div>
            <div className="table-wrap">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th className="pl-6">Operator</th>
                    <th>Action Executed</th>
                    <th>Entity Type</th>
                    <th className="pr-6 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.logs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--card-subtle)]/50 transition-all">
                      <td className="pl-6 py-4">
                        <span className="font-bold text-sm">{log.userName}</span>
                      </td>
                      <td className="text-sm font-medium text-[var(--text-secondary)]">{log.action}</td>
                      <td><StatusBadge status={log.relatedEntityType} /></td>
                      <td className="pr-6 text-right text-[10px] text-[var(--text-muted)] font-mono">
                        {new Date(log.time).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-10">
          {/* State Performance */}
          <section className="space-y-6">
            <h2 className="text-lg font-bold tracking-tight">State Performance</h2>
            <div className="grid gap-3">
              {data.states.map(state => {
                const stateUsers = data.users.filter(u => u.jurisdiction.stateId === state.id).length;
                const stateRev = data.revenue.filter(r => r.city?.includes(state.name)).reduce((s, i) => s + (i.amount || 0), 0);
                return (
                  <div key={state.id} className="panel p-5 flex justify-between items-center group hover:bg-[var(--card-subtle)] transition-all">
                    <div>
                      <p className="font-bold text-sm mb-1">{state.name}</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{stateUsers} Members</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--primary)]">₹{stateRev.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-emerald-500 font-bold">Revenue Flow</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* National Resources */}
          <section className="panel p-8 bg-gradient-to-br from-[var(--primary)]/5 to-transparent border-[var(--primary)]/10">
             <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-4 text-[var(--primary)]">National Resources</h3>
             <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer transition-colors">
                   <BookOpen className="w-4 h-4" /> Guild Constitution
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer transition-colors">
                   <Shield className="w-4 h-4" /> Security Protocols
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer transition-colors">
                   <UsersRound className="w-4 h-4" /> Master Directory
                </li>
             </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

