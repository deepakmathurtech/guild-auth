import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, Organization, Opportunity, Quest, GuildUser, RevenueEvent, Need, GuildRole } from '../../types/guild';
import { Shield, Target, Activity, TrendingUp, Users, BookOpen, AlertCircle, Clock, CheckCircle2, Map } from 'lucide-react';
import { auditQuestHealth, type HealthIssue } from '../../services/healthService';
import { approveUserRole } from '../../services/workflowService';

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

  if (loading) return <div className="p-10 animate-pulse text-center font-bold">Synchronizing National Guild Ledger...</div>;

  const pendingApplicants = data.users.filter(u => u.role === 'applicant');

  return (
    <div className="page-grid">
      <div className="hero-panel bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white border-none shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="eyebrow text-blue-400">National Federation Oversight</p>
            <h1 className="text-4xl">India Guild Health: {metrics.healthScore}%</h1>
            <p className="text-blue-200/60 mt-2 max-w-md">Operating across {data.states.length} States and {metrics.totalCities} Cities.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 text-center min-w-[140px]">
              <span className="block text-4xl font-black">{data.users.length}</span>
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-widest">Total Members</span>
            </div>
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 text-center min-w-[140px]">
              <span className="block text-4xl font-black">₹{(metrics.totalRev / 1000).toFixed(1)}k</span>
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-widest">Revenue Flow</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-48 -mt-48 animate-pulse-slow"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="panel bg-blue-500/5 flex flex-col justify-between border-blue-500/20">
           <div><Map size={24} className="text-blue-500 mb-4"/> <h3 className="text-sm font-black uppercase text-blue-500/50">States</h3></div>
           <span className="text-4xl font-black tracking-tighter">{data.states.length}</span>
        </div>
        <div className="panel bg-purple-500/5 flex flex-col justify-between border-purple-500/20">
           <div><Shield size={24} className="text-purple-500 mb-4"/> <h3 className="text-sm font-black uppercase text-purple-500/50">Masters</h3></div>
           <span className="text-4xl font-black tracking-tighter">{metrics.totalMasters}</span>
        </div>
        <div className="panel bg-green-500/5 flex flex-col justify-between border-green-500/20">
           <div><TrendingUp size={24} className="text-green-500 mb-4"/> <h3 className="text-sm font-black uppercase text-green-500/50">Active Quests</h3></div>
           <span className="text-4xl font-black tracking-tighter">{metrics.activeQuests}</span>
        </div>
        <div className="panel bg-yellow-500/5 flex flex-col justify-between border-yellow-500/20">
           <div><AlertCircle size={24} className="text-yellow-500 mb-4"/> <h3 className="text-sm font-black uppercase text-yellow-500/50">Risks</h3></div>
           <span className="text-4xl font-black tracking-tighter">{metrics.criticalIssues}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="panel">
          <h3 className="eyebrow mb-6">Pending Applications</h3>
          <div className="space-y-4">
             {pendingApplicants.map(u => (
               <div key={u.uid} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div>
                   <span className="block font-bold">{u.fullName}</span>
                   <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{u.jurisdiction?.cityName}, {u.jurisdiction?.stateName}</span>
                 </div>
                 <div className="flex gap-2">
                    <button className="primary text-[10px] px-4 py-2" disabled={!!approving} onClick={() => handleApprove(u.uid, 'member')}>Verify Member</button>
                    <button className="ghost text-[10px] px-4 py-2" disabled={!!approving} onClick={() => handleApprove(u.uid, 'receptionist')}>Receptionist</button>
                 </div>
               </div>
             ))}
             {pendingApplicants.length === 0 && <p className="text-center text-slate-400 py-4 italic text-sm">No pending federation applications.</p>}
          </div>
        </div>

        <div className="panel">
          <h3 className="eyebrow mb-6">State-Level Performance</h3>
          <div className="space-y-4">
            {data.states.map(state => {
              const stateUsers = data.users.filter(u => u.jurisdiction.stateId === state.id).length;
              const stateRev = data.revenue.filter(r => r.city?.includes(state.name)).reduce((s, i) => s + (i.amount || 0), 0);
              return (
                <div key={state.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="block font-bold">{state.name}</span>
                    <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest">{stateUsers} Members</span>
                  </div>
                  <span className="font-black text-blue-600">₹{stateRev.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="panel p-0 overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-slate-50">
            <h3 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest"><Activity size={16} className="text-[var(--primary)]"/> National Audit Log</h3>
          </div>
          <div className="table-wrap border-none rounded-none">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => (
                  <tr key={log.id}>
                    <td data-label="Operator" className="font-bold text-sm text-[var(--primary)]">{log.userName}</td>
                    <td data-label="Action" className="text-xs font-medium">{log.action}</td>
                    <td data-label="Target"><span className="role-pill text-[9px]">{log.relatedEntityType}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
