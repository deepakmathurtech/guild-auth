import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, Organization, Opportunity, Quest, GuildUser, RevenueEvent, Need } from '../../types/guild';
import { Shield, Target, Activity, TrendingUp, Users, BookOpen, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { auditQuestHealth, type HealthIssue } from '../../services/healthService';

export function FounderDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<{
    users: GuildUser[],
    orgs: Organization[],
    opps: Opportunity[],
    needs: Need[],
    quests: Quest[],
    revenue: RevenueEvent[],
    logs: ActivityLog[]
  }>({
    users: [],
    orgs: [],
    opps: [],
    needs: [],
    quests: [],
    revenue: [],
    logs: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFounderData() {
      const [u, o, opp, n, q, r, l] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'organizations')),
        getDocs(collection(db, 'opportunities')),
        getDocs(collection(db, 'needs')),
        getDocs(collection(db, 'quests')),
        getDocs(collection(db, 'revenueEvents')),
        getDocs(query(collection(db, 'activityLogs'), orderBy('time', 'desc'), limit(20)))
      ]);

      setData({
        users: u.docs.map(d => d.data() as GuildUser),
        orgs: o.docs.map(d => d.data() as Organization),
        opps: opp.docs.map(d => d.data() as Opportunity),
        needs: n.docs.map(d => d.data() as Need),
        quests: q.docs.map(d => d.data() as Quest),
        revenue: r.docs.map(d => d.data() as RevenueEvent),
        logs: l.docs.map(d => d.data() as ActivityLog)
      });
      setLoading(false);
    }
    loadFounderData();
  }, []);

  const metrics = useMemo(() => {
    const totalRev = data.revenue.reduce((s, i) => s + (i.amount || 0), 0);
    const activeQuests = data.quests.filter(q => q.status !== 'completed' && q.status !== 'closed' && q.status !== 'archived').length;
    const completedQuests = data.quests.filter(q => q.status === 'completed').length;
    const totalKnowledge = data.users.reduce((s, i) => s + (i.knowledgeEntriesCount || 0), 0);
    
    // Bottleneck detection
    const issues: HealthIssue[] = [];
    data.quests.forEach(q => issues.push(...auditQuestHealth(q)));
    
    return {
      totalRev,
      activeQuests,
      completedQuests,
      totalKnowledge,
      healthScore: Math.max(0, 100 - (issues.filter(i => i.type === 'CRITICAL').length * 5)),
      criticalIssues: issues.filter(i => i.type === 'CRITICAL').length,
      warningIssues: issues.filter(i => i.type === 'WARNING').length
    };
  }, [data]);

  const performance = useMemo(() => {
    const receptionists = data.users.filter(u => u.role === 'receptionist' || u.role === 'guildManager');
    return receptionists.map(r => {
      const orgsOwned = data.orgs.filter(o => o.ownerId === r.uid || o.responsibleReceptionist === r.uid).length;
      const questsManaged = data.quests.filter(q => q.assignedReceptionistId === r.uid).length;
      return { name: r.fullName, orgsOwned, questsManaged };
    }).sort((a, b) => b.orgsOwned - a.orgsOwned).slice(0, 5);
  }, [data]);

  if (loading) return <div className="p-10 animate-pulse text-center font-bold">Synchronizing Human Network Ledger...</div>;

  return (
    <div className="page-grid">
      <div className="hero-panel bg-gradient-to-br from-slate-900 to-blue-950 text-white border-none">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="eyebrow text-blue-400">Strategic Oversight</p>
            <h1 className="text-4xl">Guild Health: {metrics.healthScore}%</h1>
            <p className="text-blue-200/60 mt-2 max-w-md">System-wide operational audit across all cities and organizations.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
              <span className="block text-3xl font-black">{data.orgs.length}</span>
              <span className="text-[10px] uppercase font-bold text-blue-300">Total Orgs</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
              <span className="block text-3xl font-black">₹{(metrics.totalRev / 1000).toFixed(1)}k</span>
              <span className="text-[10px] uppercase font-bold text-blue-300">Revenue Flow</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="panel bg-red-500/5 border-red-500/20">
          <div className="flex justify-between items-start mb-6">
            <h3 className="flex items-center gap-2 text-red-500"><AlertCircle size={20}/> Critical Risks</h3>
            <span className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">{metrics.criticalIssues}</span>
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">Operational failures requiring immediate intervention.</p>
          <div className="space-y-3">
             {metrics.criticalIssues > 0 ? (
               <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-xs font-bold text-red-600">
                 Multiple quests missing financial data or stalled for &gt; 14 days.
               </div>
             ) : <div className="text-sm font-bold text-green-500 flex items-center gap-2"><CheckCircle2 size={16}/> All systems nominal</div>}
          </div>
        </div>

        <div className="panel">
          <h3 className="flex items-center gap-2 mb-6"><TrendingUp size={20} className="text-blue-500"/> Growth & Value</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Completed Quests</span>
              <span className="font-bold">{metrics.completedQuests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Knowledge Assets</span>
              <span className="font-bold">{metrics.totalKnowledge}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Members</span>
              <span className="font-bold">{data.users.length}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 className="flex items-center gap-2 mb-6"><Users size={20} className="text-purple-500"/> Best Performers</h3>
          <div className="space-y-4">
            {performance.map((r, i) => (
              <div key={r.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] grid place-items-center font-bold">{i+1}</span>
                  <span className="text-sm font-medium">{r.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-md font-bold">{r.orgsOwned} Orgs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="flex items-center gap-2"><Activity size={20} className="text-[var(--primary)]"/> Live Audit Trail</h3>
          <span className="role-pill">Last 20 Actions</span>
        </div>
        <div className="table-wrap border-none rounded-none">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map(log => (
                <tr key={log.id}>
                  <td data-label="Time" className="text-xs text-[var(--muted)]">{new Date(log.time).toLocaleTimeString()}</td>
                  <td data-label="Operator" className="font-bold text-sm text-[var(--primary)]">{log.userName}</td>
                  <td data-label="Action" className="text-sm font-medium">{log.action}</td>
                  <td data-label="Target"><span className="role-pill">{log.relatedEntityType}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
