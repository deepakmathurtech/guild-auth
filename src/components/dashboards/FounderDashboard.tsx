import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, getDocs, where, limit, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, Organization, Opportunity, Quest, GuildUser, RevenueEvent, Need, GuildRole } from '../../types/guild';
import {
  Shield, Target, Activity, TrendingUp, Users, BookOpen,
  AlertCircle, Clock, CheckCircle2, Map, Plus, ArrowUpRight,
  Globe, UserCheck, BarChart3, HardHat, MapPin, UsersRound,
  AlertTriangle, Crown, Building2, Zap, Bell, Search, Filter,
  ArrowRight, Check, X, Eye, Edit, Trash2, Send, Award, Star,
  ArrowRightLeft, HandHeart, Sparkles, BriefcaseBusiness,
  ClipboardList, IndianRupee, Gauge, Flag, Settings, Link2,
  Calendar, TrendingDown, ShieldCheck, UserPlus, Building
} from 'lucide-react';
import { auditQuestHealth, type HealthIssue } from '../../services/healthService';
import { StatsService } from '../../services/statsService';
import { approveUserRole } from '../../services/workflowService';
import { StatusBadge } from '../StatusBadge';
import { roleLabels } from '../../lib/rbac';
import { useNavigate } from 'react-router-dom';

// Quick action types
type QuickAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  action: () => void;
};

// Pending item that needs attention
type PendingItem = {
  id: string;
  type: 'applicant' | 'verification' | 'submission' | 'revenue' | 'need';
  title: string;
  description: string;
  entityId: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
};

export function FounderDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'health' | 'structure'>('overview');

  // Data state
  const [data, setData] = useState<{
    users: GuildUser[];
    organizations: Organization[];
    opportunities: Opportunity[];
    needs: Need[];
    quests: Quest[];
    revenue: RevenueEvent[];
    logs: ActivityLog[];
    states: any[];
    cities: any[];
  }>({
    users: [],
    organizations: [],
    opportunities: [],
    needs: [],
    quests: [],
    revenue: [],
    logs: [],
    states: [],
    cities: []
  });

  useEffect(() => {
    async function loadFounderData() {
      try {
        setLoading(true);
        const fetchAll = async (coll: string, ...constraints: any[]) => {
          const q = query(collection(db, coll), ...constraints);
          const snap = await getDocs(q);
          return snap.docs.map(d => d.data());
        };

        const [u, o, opp, n, q, r, l, s, c] = await Promise.all([
          fetchAll('users'),
          fetchAll('organizations', [where('archiveStatus', '==', 'active'), limit(200)]),
          fetchAll('opportunities', [where('archiveStatus', '==', 'active'), limit(200)]),
          fetchAll('needs', [where('archiveStatus', '==', 'active'), limit(200)]),
          fetchAll('quests', [where('archiveStatus', '==', 'active'), limit(200)]),
          fetchAll('revenueEvents', [where('archiveStatus', '==', 'active'), limit(200)]),
          getDocs(query(collection(db, 'activityLogs'), orderBy('time', 'desc'), limit(30))),
          getDocs(query(collection(db, 'guildStates'))),
          getDocs(query(collection(db, 'guildCities')))
        ]);

        setData({
          users: u as GuildUser[],
          organizations: o as Organization[],
          opportunities: opp as Opportunity[],
          needs: n as Need[],
          quests: q as Quest[],
          revenue: r as RevenueEvent[],
          logs: l.docs.map(d => d.data() as ActivityLog),
          states: s.docs.map(d => d.data()),
          cities: c.docs.map(d => d.data())
        });
      } catch (err) {
        console.error('Failed to load founder data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFounderData();
  }, []);

  // Computed metrics
  const metrics = useMemo(() => {
    const totalRev = data.revenue.reduce((s, i) => s + (i.amount || 0), 0);
    const activeQuests = data.quests.filter(q => q.status !== 'completed' && q.status !== 'closed' && q.status !== 'archived').length;
    const completedQuests = data.quests.filter(q => q.status === 'completed').length;
    const totalKnowledge = data.users.reduce((s, i) => s + (i.knowledgeEntriesCount || 0), 0);
    const totalCities = new Set(data.users.map(u => u.jurisdiction?.cityId).filter(Boolean)).size;
    const totalMasters = data.users.filter(u => ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'].includes(u.role)).length;
    const issues: HealthIssue[] = [];
    data.quests.forEach(q => issues.push(...auditQuestHealth(q)));

    // New pending items
    const pendingApplicants = data.users.filter(u => u.role === 'applicant').length;
    const pendingVerifications = data.users.filter(u => u.verificationStatus === 'pending').length;
    const pendingNeeds = data.needs.filter(n => n.status === 'submitted').length;
    const pendingSubmissions = data.quests.filter(q => q.status === 'underReview').length;

    return {
      totalRev,
      activeQuests,
      completedQuests,
      totalKnowledge,
      totalCities,
      totalMasters,
      healthScore: Math.max(0, 100 - (issues.filter(i => i.type === 'CRITICAL').length * 5)),
      criticalIssues: issues.filter(i => i.type === 'CRITICAL').length,
      warningIssues: issues.filter(i => i.type === 'WARNING').length,
      pendingApplicants,
      pendingVerifications,
      pendingNeeds,
      pendingSubmissions,
      totalPending: pendingApplicants + pendingVerifications + pendingNeeds + pendingSubmissions
    };
  }, [data]);

  // Get pending items that need founder attention
  const pendingItems = useMemo((): PendingItem[] => {
    const items: PendingItem[] = [];

    // Pending applicants
    data.users.filter(u => u.role === 'applicant').forEach(u => {
      items.push({
        id: `app-${u.uid}`,
        type: 'applicant',
        title: u.fullName,
        description: `New applicant from ${u.jurisdiction?.cityName}, ${u.jurisdiction?.stateName}`,
        entityId: u.uid,
        priority: 'high',
        createdAt: u.createdAt
      });
    });

    // Pending verifications
    data.users.filter(u => u.verificationStatus === 'pending').forEach(u => {
      items.push({
        id: `ver-${u.uid}`,
        type: 'verification',
        title: u.fullName,
        description: `Verification pending for ${u.email}`,
        entityId: u.uid,
        priority: 'medium',
        createdAt: u.createdAt
      });
    });

    // Submissions needing review
    data.quests.filter(q => q.status === 'underReview').forEach(q => {
      items.push({
        id: `sub-${q.id}`,
        type: 'submission',
        title: q.title,
        description: `Quest submission awaiting verification`,
        entityId: q.id,
        priority: 'high',
        createdAt: q.updatedAt || q.createdAt
      });
    });

    // Revenue pending (not yet received)
    data.revenue.filter(r => !r.dateReceived).forEach(r => {
      items.push({
        id: `rev-${r.id}`,
        type: 'revenue',
        title: r.source,
        description: `₹${r.amount.toLocaleString()} - ${r.sourceName || 'Pending verification'}`,
        entityId: r.id,
        priority: 'medium',
        createdAt: r.createdAt
      });
    });

    // Pending needs
    data.needs.filter(n => n.status === 'submitted').slice(0, 5).forEach(n => {
      items.push({
        id: `need-${n.id}`,
        type: 'need',
        title: n.title,
        description: `${n.priority} priority - ${n.organizationName || 'Unassigned'}`,
        entityId: n.id,
        priority: n.priority === 'urgent' ? 'high' : n.priority === 'high' ? 'high' : 'low',
        createdAt: n.createdAt
      });
    });

    return items.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    });
  }, [data]);

  // Quick actions
  const quickActions: QuickAction[] = [
    { id: 'new-member', label: 'Invite Member', icon: UserPlus, roles: ['founder', 'guildFounder'], action: () => navigate('/admin?action=invite') },
    { id: 'new-org', label: 'Add Organization', icon: Building, roles: ['founder', 'guildFounder', 'centralGuildMaster'], action: () => navigate('/organizations?action=create') },
    { id: 'new-quest', label: 'Create Quest', icon: Target, roles: ['founder', 'guildFounder', 'receptionist'], action: () => navigate('/quests/register') },
    { id: 'revenue', label: 'Record Revenue', icon: IndianRupee, roles: ['founder', 'guildFounder', 'receptionist'], action: () => navigate('/revenue?action=create') },
    { id: 'ledger', label: 'View Ledger', icon: BookOpen, roles: ['founder', 'guildFounder', 'cityGuildMaster'], action: () => navigate('/ledger') },
    { id: 'health', label: 'Health Check', icon: Gauge, roles: ['founder', 'guildFounder'], action: () => setActiveTab('health') },
  ];

  async function handleApprove(userId: string, role: GuildRole) {
    if (!profile) return;
    setApproving(userId);
    try {
      await approveUserRole(userId, role, 'National Federation Approval', profile);
      // Refresh data
      const u = await getDocs(query(collection(db, 'users')));
      setData(prev => ({ ...prev, users: u.docs.map(d => d.data() as GuildUser) }));
    } catch (err: any) {
      alert(err.message);
    }
    setApproving(null);
  }

  function getStateHealth(stateId: string) {
    const stateUsers = data.users.filter(u => u.jurisdiction?.stateId === stateId).length;
    const stateOrgs = data.organizations.filter(o => o.jurisdiction?.stateId === stateId).length;
    const stateRev = data.revenue.filter(r => r.jurisdiction?.stateId === stateId).reduce((s, i) => s + (i.amount || 0), 0);
    return { users: stateUsers, orgs: stateOrgs, revenue: stateRev };
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
    </div>
  );

  const pendingApplicants = data.users.filter(u => u.role === 'applicant');

  return (
    <div className="space-y-8 pb-20 animate-fade-up">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {[
          { id: 'overview', label: 'Overview', icon: Globe },
          { id: 'pending', label: `Pending (${metrics.totalPending})`, icon: Bell },
          { id: 'health', label: 'Health', icon: Gauge },
          { id: 'structure', label: 'Structure', icon: Building2 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* National Oversight Hero */}
          <div className="hero-panel bg-black border-none shadow-none text-white !p-10 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 70% 20%, var(--glow-gold) 0%, transparent 60%)' }} />
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div>
                <p className="eyebrow text-[var(--primary)]">National Federation Command</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">India Guild Health: {metrics.healthScore}%</h1>
                <p className="text-[var(--text-muted)] max-w-lg text-base">
                  Overseeing {data.states.length} States, {metrics.totalCities} Cities, {data.users.length} Members, and {data.organizations.length} Organizations
                </p>
              </div>
              <div className="flex gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center min-w-[140px]">
                  <span className="block text-3xl font-bold tracking-tighter mb-1">{data.users.length}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Members</span>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center min-w-[140px]">
                  <span className="block text-3xl font-bold tracking-tighter mb-1">₹{(metrics.totalRev / 1000).toFixed(1)}k</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Revenue</span>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center min-w-[140px]">
                  <span className={`block text-3xl font-bold tracking-tighter mb-1 ${metrics.criticalIssues > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{metrics.criticalIssues}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.filter(a => a.roles.includes(profile?.role || '')).map(action => {
              const Icon = action.icon;
              return (
                <button key={action.id} onClick={action.action}
                  className="panel p-4 rounded-xl border hover:border-[var(--primary)]/50 transition-all group text-center">
                  <Icon className="w-6 h-6 mx-auto mb-2 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                  <span className="text-xs font-bold">{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* KPIs */}
          <div className="metrics-grid">
            <div className="metric-card bg-blue-500/5 border-blue-500/10">
              <div className="flex justify-between items-start">
                <span className="text-blue-500/60 font-bold">States</span>
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
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <strong className="text-emerald-500">{metrics.activeQuests}</strong>
            </div>
            <div className="metric-card bg-amber-500/5 border-amber-500/10">
              <div className="flex justify-between items-start">
                <span className="text-amber-500/60 font-bold">Pending</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <strong className="text-amber-500">{metrics.totalPending}</strong>
            </div>
            <div className="metric-card bg-cyan-500/5 border-cyan-500/10">
              <div className="flex justify-between items-start">
                <span className="text-cyan-500/60 font-bold">Organizations</span>
                <Building2 className="w-4 h-4 text-cyan-500" />
              </div>
              <strong className="text-cyan-500">{data.organizations.length}</strong>
            </div>
            <div className="metric-card bg-rose-500/5 border-rose-500/10">
              <div className="flex justify-between items-start">
                <span className="text-rose-500/60 font-bold">Critical Issues</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <strong className="text-rose-500">{metrics.criticalIssues}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">
            {/* Main Column */}
            <div className="space-y-8">
              {/* Pending Applicants */}
              {pendingApplicants.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-[var(--primary)]" />
                    <h2 className="text-lg font-bold tracking-tight">Pending Applications ({pendingApplicants.length})</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {pendingApplicants.slice(0, 6).map(u => (
                      <div key={u.uid} className="panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:border-[var(--primary)]/30 transition-all">
                        <div>
                          <p className="font-bold text-sm mb-1">{u.fullName}</p>
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {u.jurisdiction?.cityName}, {u.jurisdiction?.stateName}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button className="secondary !py-1.5 !px-2 text-[10px]" disabled={!!approving} onClick={() => handleApprove(u.uid, 'member')}>Member</button>
                          <button className="primary !py-1.5 !px-2 text-[10px]" disabled={!!approving} onClick={() => handleApprove(u.uid, 'receptionist')}>Receptionist</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Activity */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[var(--primary)]" />
                  <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
                </div>
                <div className="table-wrap">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th className="pl-4">Operator</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th className="pr-4 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {data.logs.slice(0, 10).map((log, i) => (
                        <tr key={i} className="hover:bg-[var(--card-subtle)]/50">
                          <td className="pl-4 py-3"><span className="font-bold text-sm">{log.userName}</span></td>
                          <td className="text-sm text-[var(--text-secondary)]">{log.action}</td>
                          <td><StatusBadge status={log.relatedEntityType || 'system'} /></td>
                          <td className="pr-4 text-right text-xs text-[var(--text-muted)] font-mono">
                            {new Date(log.time).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* State Performance */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold tracking-tight">State Performance</h2>
                <div className="grid gap-2">
                  {data.states.slice(0, 10).map(state => {
                    const stats = getStateHealth(state.id);
                    return (
                      <div key={state.id} className="panel p-3 flex justify-between items-center group hover:bg-[var(--card-subtle)]">
                        <div>
                          <p className="font-bold text-sm">{state.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{stats.users} Members</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-[var(--primary)]">₹{stats.revenue.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* System Health */}
              <section className="panel p-5 bg-gradient-to-br from-[var(--primary)]/5 to-transparent border-[var(--primary)]/10">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-3 text-[var(--primary)]">System Health</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Health Score</span>
                    <span className={`font-bold ${metrics.healthScore >= 70 ? 'text-emerald-500' : metrics.healthScore >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {metrics.healthScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Active Quests</span>
                    <span className="font-bold">{metrics.activeQuests}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Revenue</span>
                    <span className="font-bold">₹{metrics.totalRev.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-bold tracking-tight">Items Requiring Attention</h2>
          </div>

          {pendingItems.length === 0 ? (
            <div className="panel p-12 text-center border-dashed">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
              <p className="font-bold">All caught up!</p>
              <p className="text-sm text-[var(--text-muted)]">No pending items need your attention.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map(item => (
                <div key={item.id} className={`panel p-4 flex items-center gap-4 border-l-4 ${item.priority === 'high' ? 'border-l-rose-500' : item.priority === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {item.type === 'applicant' && (
                      <>
                        <button className="secondary !py-2 !px-3 text-xs" onClick={() => handleApprove(item.entityId, 'member')}>Member</button>
                        <button className="primary !py-2 !px-3 text-xs" onClick={() => handleApprove(item.entityId, 'receptionist')}>Receptionist</button>
                      </>
                    )}
                    {item.type === 'verification' && (
                      <button className="secondary !py-2 !px-3 text-xs" onClick={() => navigate(`/members/${item.entityId}`)}>Review</button>
                    )}
                    {item.type === 'submission' && (
                      <button className="secondary !py-2 !px-3 text-xs" onClick={() => navigate(`/quests/${item.entityId}`)}>Verify</button>
                    )}
                    {item.type === 'need' && (
                      <button className="secondary !py-2 !px-3 text-xs" onClick={() => navigate(`/needs/${item.entityId}`)}>View</button>
                    )}
                    {item.type === 'revenue' && (
                      <button className="secondary !py-2 !px-3 text-xs" onClick={() => navigate(`/revenue`)}>Verify</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HEALTH TAB */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-bold tracking-tight">Operational Health</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`panel p-6 rounded-xl border-2 ${metrics.healthScore >= 70 ? 'border-emerald-500/30 bg-emerald-500/5' : metrics.healthScore >= 40 ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
              <p className="text-sm font-bold text-[var(--text-muted)] mb-2">Health Score</p>
              <p className={`text-4xl font-bold ${metrics.healthScore >= 70 ? 'text-emerald-500' : metrics.healthScore >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                {metrics.healthScore}%
              </p>
            </div>
            <div className="panel p-6 rounded-xl">
              <p className="text-sm font-bold text-[var(--text-muted)] mb-2">Critical Issues</p>
              <p className="text-4xl font-bold text-rose-500">{metrics.criticalIssues}</p>
            </div>
            <div className="panel p-6 rounded-xl">
              <p className="text-sm font-bold text-[var(--text-muted)] mb-2">Warnings</p>
              <p className="text-4xl font-bold text-amber-500">{metrics.warningIssues}</p>
            </div>
          </div>

          {/* Quest Health Issues */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold">Quest Issues</h3>
            <div className="space-y-2">
              {data.quests.flatMap(q => auditQuestHealth(q)).slice(0, 10).map((issue, i) => (
                <div key={i} className={`panel p-3 flex items-center gap-3 border-l-4 ${issue.type === 'CRITICAL' ? 'border-l-rose-500' : issue.type === 'WARNING' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                  <AlertCircle className={`w-4 h-4 ${issue.type === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm">{issue.message}</p>
                    <p className="text-xs text-[var(--text-muted)]">Fix: {issue.fix}</p>
                  </div>
                  <button className="secondary !py-1.5 !px-3 text-xs" onClick={() => navigate(`/quests/${issue.entityId}`)}>View</button>
                </div>
              ))}
            </div>
          </section>

          {/* Organization Health */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold">Organization Alerts</h3>
            <div className="space-y-2">
              {data.organizations.filter(org => {
                if (org.nextFollowUpAt && new Date(org.nextFollowUpAt).getTime() < Date.now()) return true;
                if (org.currentStatus === 'inactive' && org.verificationStatus === 'verified') return true;
                return false;
              }).slice(0, 5).map(org => (
                <div key={org.id} className="panel p-3 flex items-center gap-3 border-l-4 border-l-amber-500">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{org.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{org.city} - {org.currentStatus}</p>
                  </div>
                  <button className="secondary !py-1.5 !px-3 text-xs" onClick={() => navigate(`/organizations/${org.id}`)}>View</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* STRUCTURE TAB */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-bold tracking-tight">Federation Structure</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* States */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold">States ({data.states.length})</h3>
              <div className="space-y-2">
                {data.states.map(state => {
                  const stats = getStateHealth(state.id);
                  return (
                    <div key={state.id} className="panel p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{state.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{stats.users} members</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{stats.orgs} orgs</p>
                        <p className="text-xs text-emerald-500">₹{stats.revenue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Guild Masters */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold">Leadership ({metrics.totalMasters})</h3>
              <div className="space-y-2">
                {data.users.filter(u => u.role?.includes('GuildMaster')).map(master => (
                  <div key={master.uid} className="panel p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold text-sm">
                      {master.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{master.fullName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{master.jurisdiction?.cityName}, {master.jurisdiction?.stateName}</p>
                    </div>
                    <span className="badge badge-purple">{roleLabels[master.role]}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}