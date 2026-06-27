import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, limit, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { User, Organization, Need, Opportunity, Quest, RevenueEvent } from '../types/guild';
import {
  User as UserIcon, Building, Target, TrendingUp, Clock, Star, Gift,
  ChevronLeft, Activity, Wallet, CheckCircle, AlertTriangle,
  Users, Calendar, MapPin, Phone, Mail, Award, Network,
  BarChart3, Zap, TrendingDown, Eye, Play, Check, XCircle, Send
} from 'lucide-react';

export function ReceptionistProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();

  const [receptionist, setReceptionist] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [needs, setNeeds] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [revenueEvents, setRevenueEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  const isOwnerView = !id || id === currentUser?.uid;

  // Helper to filter by time
  const filterByTime = (items: any[], dateField: string) => {
    if (timeFilter === 'all') return items;
    const now = new Date();
    const cutoff = new Date();
    if (timeFilter === 'week') cutoff.setDate(now.getDate() - 7);
    if (timeFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= cutoff;
    });
  };

  useEffect(() => {
    async function loadData() {
      if (!id && !currentUser) return;

      const targetId = id || currentUser!.uid;

      try {
        // Get receptionist user
        const userDocs = await getDocs(query(collection(db, 'users'), where('uid', '==', targetId), limit(1)));
        if (userDocs.empty) return;
        const user = { id: userDocs.docs[0].id, ...userDocs.docs[0].data() } as User;
        setReceptionist(user);

        // Get assigned organizations - both by direct assignment and by branch
        let orgQuery = query(
          collection(db, 'organizations'),
          where('archiveStatus', '==', 'active'),
          limit(100)
        );
        const allOrgDocs = await getDocs(orgQuery);
        const targetBranchId = user.branchId;

        // Filter locally: match by assignedReceptionistId OR branchId
        const filteredOrgs = allOrgDocs.docs
          .map(d => ({ id: d.id, ...d.data() } as Organization))
          .filter(org =>
            org.assignedReceptionistId === targetId ||
            (targetBranchId && org.branchId === targetBranchId)
          );
        setOrganizations(filteredOrgs);

        // Get needs processed by this receptionist
        const needDocs = await getDocs(query(
          collection(db, 'needs'),
          where('responsibleReceptionist', '==', targetId),
          where('archiveStatus', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(100)
        ));
        setNeeds(needDocs.docs.map(d => ({ id: d.id, ...d.data() } as Need)));

        // Get opportunities created
        const oppDocs = await getDocs(query(
          collection(db, 'opportunities'),
          where('assignedReceptionist', '==', targetId),
          where('archiveStatus', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(50)
        ));
        setOpportunities(oppDocs.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity)));

        // Get quests handled
        const questDocs = await getDocs(query(
          collection(db, 'quests'),
          where('assignedReceptionistId', '==', targetId),
          where('archiveStatus', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(50)
        ));
        setQuests(questDocs.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));

        // Get revenue events attributed
        const revDocs = await getDocs(query(
          collection(db, 'revenueEvents'),
          where('attributedReceptionistId', '==', targetId),
          orderBy('date', 'desc'),
          limit(100)
        ));
        setRevenueEvents(revDocs.docs.map(d => ({ id: d.id, ...d.data() } as RevenueEvent)));
      } catch (err) {
        console.error('Failed to load receptionist data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, currentUser]);

  const filteredNeeds = useMemo(() => filterByTime(needs, 'createdAt'), [needs, timeFilter]);
  const filteredOpportunities = useMemo(() => filterByTime(opportunities, 'createdAt'), [opportunities, timeFilter]);
  const filteredRevenue = useMemo(() => filterByTime(revenueEvents, 'date'), [revenueEvents, timeFilter]);

  const metrics = useMemo(() => {
    if (!receptionist) return null;

    // Needs breakdown by status
    const needsOpen = needs.filter(n => n.status === 'open').length;
    const needsInProgress = needs.filter(n => n.status === 'in_progress').length;
    const needsResolved = needs.filter(n => n.status === 'resolved' || n.status === 'completed').length;
    const needsClosed = needs.filter(n => n.status === 'closed').length;

    // Filtered metrics
    const needsProcessedFiltered = filteredNeeds.filter(n => n.status !== 'open').length;
    const opportunitiesCreatedFiltered = filteredOpportunities.length;
    const totalRevenueFiltered = filteredRevenue.reduce((sum, e) => sum + (e.amount || 0), 0);
    const revenueInHandFiltered = filteredRevenue.reduce((sum, e) => sum + (e.amountInHand || 0), 0);
    const recurringRevenueFiltered = filteredRevenue.filter(e => e.recurring).reduce((sum, e) => sum + (e.amount || 0), 0);

    // Opportunity stages
    const oppNew = opportunities.filter(o => o.stage === 'new').length;
    const oppQualified = opportunities.filter(o => o.stage === 'qualified').length;
    const oppProposal = opportunities.filter(o => o.stage === 'proposal').length;
    const oppWon = opportunities.filter(o => o.stage === 'won').length;

    // Quests breakdown
    const questsActive = quests.filter(q => q.status === 'active').length;
    const questsCompleted = quests.filter(q => q.status === 'completed').length;

    // All-time totals
    const needsProcessed = needs.filter(n => n.status !== 'open').length;
    const opportunitiesCreated = opportunities.length;
    const questsAssigned = quests.length;
    const totalRevenue = revenueEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
    const revenueInHand = revenueEvents.reduce((sum, e) => sum + (e.amountInHand || 0), 0);
    const recurringRevenue = revenueEvents.filter(e => e.recurring).reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate activity streak
    const activityStreak = receptionist.activityStreak || 0;
    const trustScore = receptionist.trustScore || 0;
    const growthScore = receptionist.growthScore || 0;
    const responseTimeAvg = receptionist.responseTimeAvg || 0;

    return {
      needsProcessed,
      needsOpen,
      needsInProgress,
      needsResolved,
      needsClosed,
      needsProcessedFiltered,
      opportunitiesCreated,
      opportunitiesCreatedFiltered,
      questsAssigned,
      questsActive,
      questsCompleted,
      totalRevenue,
      totalRevenueFiltered,
      revenueInHand,
      revenueInHandFiltered,
      recurringRevenue,
      recurringRevenueFiltered,
      activityStreak,
      trustScore,
      growthScore,
      responseTimeAvg,
      organizationsCount: organizations.length,
      // Opportunity stages
      oppNew,
      oppQualified,
      oppProposal,
      oppWon
    };
  }, [receptionist, needs, opportunities, quests, revenueEvents, organizations, filteredNeeds, filteredOpportunities, filteredRevenue]);

  if (!currentUser) return null;
  if (!isOwnerView && !['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'].includes(currentUser.role)) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[var(--text-muted)]">You don't have permission to view this profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!receptionist) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[var(--text-muted)]">Receptionist not found.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/members')}>
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Premium Hero Header */}
      <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--card)] via-[var(--bg-alt)] to-[var(--card)] border border-[var(--border)] p-6 md:p-8">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[var(--primary)]/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/15 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <button
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-2"
              onClick={() => navigate('/members')}
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Members Directory
            </button>

            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black text-3xl font-black shadow-xl shadow-[var(--primary)]/25">
                  {receptionist.fullName?.charAt(0) || 'R'}
                </div>
                {/* Online Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--card)] ${receptionist.lastActiveAt && new Date(receptionist.lastActiveAt).getTime() > Date.now() - 300000 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">{receptionist.fullName}</h1>
                  <span className="role-chip">{receptionist.role}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Member since {receptionist.createdAt?.slice(0, 10)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {receptionist.branchName || receptionist.jurisdiction?.cityName || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {(isOwnerView || ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'].includes(currentUser?.role)) && (
            <div className="flex gap-3">
              <button className="primary" onClick={() => navigate(`/members/${receptionist.id}/edit`)}>
                <UserIcon className="w-4 h-4" /> Edit Profile
              </button>
              <button className="secondary" onClick={() => navigate('/branches-hierarchy')}>
                <Network className="w-4 h-4" /> Branch
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="relative mt-6 pt-6 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-6 md:gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text)]">{metrics?.needsProcessed || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Needs Processed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text)]">${(metrics?.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-[var(--text-muted)]">Total Revenue</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text)]">{metrics?.trustScore || 0}%</p>
                <p className="text-xs text-[var(--text-muted)]">Trust Score</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text)]">{metrics?.activityStreak || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Day Streak</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text)]">Performance Overview</h2>
        <div className="flex gap-1 bg-[var(--card-subtle)] p-1 rounded-lg">
          {(['all', 'week', 'month'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeFilter === filter
                  ? 'bg-[var(--primary)] text-black'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metric-card group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs uppercase tracking-wider">Needs</span>
            </div>
            <div className="text-3xl font-bold text-[var(--text)]">
              {timeFilter === 'all' ? metrics.needsProcessed : metrics.needsProcessedFiltered}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-blue-400">
                <Eye className="w-3 h-3" /> {metrics.needsOpen} open
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Play className="w-3 h-3" /> {metrics.needsInProgress} active
              </span>
            </div>
          </div>

          <div className="metric-card group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs uppercase tracking-wider">Opportunities</span>
            </div>
            <div className="text-3xl font-bold text-[var(--text)]">
              {timeFilter === 'all' ? metrics.opportunitiesCreated : metrics.opportunitiesCreatedFiltered}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-3">
              <span className="text-blue-400">{metrics.oppNew} new</span>
              <span className="text-amber-400">{metrics.oppQualified} qualified</span>
              <span className="text-emerald-400">{metrics.oppWon} won</span>
            </div>
          </div>

          <div className="metric-card group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-xs uppercase tracking-wider">Revenue {timeFilter !== 'all' && `(${timeFilter})`}</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              ${(timeFilter === 'all' ? metrics.totalRevenue : metrics.totalRevenueFiltered).toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              <span className="text-cyan-400">${(timeFilter === 'all' ? metrics.recurringRevenue : metrics.recurringRevenueFiltered).toLocaleString()}</span> recurring
            </div>
          </div>

          <div className="metric-card group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs uppercase tracking-wider">Trust</span>
            </div>
            <div className="text-3xl font-bold text-amber-400">
              {metrics.trustScore}%
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">+{metrics.growthScore}%</span> growth
            </div>
          </div>
        </div>
      )}

      {/* Premium Info Panels */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Activity Panel */}
        <div className="panel group">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-bold">Activity</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Activity Streak</span>
              <span className="font-bold flex items-center gap-1 text-amber-400">
                <Zap className="w-4 h-4" />
                {metrics?.activityStreak || 0} days
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Avg Response</span>
              <span className="font-bold">{metrics?.responseTimeAvg ? `${metrics.responseTimeAvg}h` : '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Last Active</span>
              <span className="font-bold text-[var(--text-secondary)]">{receptionist.lastActiveAt?.slice(0, 10) || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Member Since</span>
              <span className="font-bold text-[var(--text-secondary)]">{receptionist.createdAt?.slice(0, 10) || '-'}</span>
            </div>
          </div>
        </div>

        {/* Rank Panel */}
        <div className="panel group">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold">Rank</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Current Rank</span>
              <span className="font-bold text-[var(--text)]">{receptionist.guildRank || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">XP</span>
              <span className="font-bold text-[var(--text)]">{receptionist.experiencePoints?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Reputation</span>
              <span className="font-bold text-[var(--text)]">{receptionist.reputationScore || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Quests Active</span>
              <span className="font-bold text-purple-400">{metrics?.questsActive || 0}</span>
            </div>
          </div>
        </div>

        {/* Assignment Panel */}
        <div className="panel group">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold">Assignment</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[var(--card-subtle)] p-2 rounded-lg">
              <span className="text-xs font-medium text-[var(--text-muted)]">Branch</span>
              <span className="font-bold text-[var(--primary)] text-sm">{receptionist.branchName || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">City</span>
              <span className="font-bold text-[var(--text-secondary)]">{receptionist.jurisdiction?.cityName || receptionist.city || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">State</span>
              <span className="font-bold text-[var(--text-secondary)]">{receptionist.jurisdiction?.stateName || receptionist.state || '-'}</span>
            </div>
            {receptionist.branchId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Branch ID</span>
                <span className="font-bold text-xs text-[var(--text-muted)]">{receptionist.branchId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Panel */}
        <div className="panel group">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold">Contact</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm truncate text-[var(--text-secondary)]">{receptionist.email || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm">{receptionist.phone || '-'}</span>
            </div>
            {receptionist.alternatePhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">{receptionist.alternatePhone}</span>
              </div>
            )}
            <div className="border-t border-[var(--border)] pt-3 mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Organizations</span>
                <span className="font-bold">{metrics?.organizationsCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Quests Done</span>
                <span className="font-bold text-emerald-400">{metrics?.questsCompleted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Needs Open</span>
                <span className="font-bold text-amber-400">{metrics?.needsOpen || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Activity Timeline */}
      {needs.length > 0 || opportunities.length > 0 || quests.length > 0 ? (
        <div className="panel">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-bold">Recent Activity</h2>
          </div>
          <div className="relative pl-4">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--primary)] to-transparent rounded-full" />
            <div className="space-y-4">
              {[
                ...needs.slice(0, 5).map(n => ({ type: 'need', data: n, date: n.createdAt })),
                ...opportunities.slice(0, 3).map(o => ({ type: 'opportunity', data: o, date: o.createdAt })),
                ...quests.slice(0, 3).map(q => ({ type: 'quest', data: q, date: q.createdAt })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 8)
                .map((item, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 group">
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110 ${
                      item.type === 'need' ? 'bg-blue-500' :
                      item.type === 'opportunity' ? 'bg-purple-500' :
                      'bg-amber-500'
                    }`}>
                      {item.type === 'need' && <Eye className="w-3 h-3 text-white" />}
                      {item.type === 'opportunity' && <Target className="w-3 h-3 text-white" />}
                      {item.type === 'quest' && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <span className={`text-xs font-bold uppercase ${
                        item.type === 'need' ? 'text-blue-400' :
                        item.type === 'opportunity' ? 'text-purple-400' :
                        'text-amber-400'
                      }`}>{item.type}</span>
                      <p className="text-sm font-medium truncate">{item.data.title || item.data.name}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {item.date?.slice(0, 10)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Assigned Organizations */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-6">
          <Building className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold">Organizations</h2>
          <span className="ml-auto text-xs text-[var(--text-muted)]">{organizations.length} assigned</span>
        </div>
        {organizations.length === 0 ? (
          <div className="empty-state">
            <Building className="w-8 h-8 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">No organizations assigned.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map(org => (
              <div
                key={org.id}
                className="record-card group cursor-pointer hover:border-purple-500/30"
                onClick={() => navigate(`/organizations/${org.id}`)}
              >
                <div className="record-head">
                  <div className="font-bold">{org.name}</div>
                  <span className={`status-badge status-${org.currentStatus}`}>{org.currentStatus}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{org.category}</p>
                {org.trustLevel && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-500">Trust: {org.trustLevel}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Revenue Events */}
      {revenueEvents.length > 0 && (
        <div className="panel">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold">Attributed Revenue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Date</th>
                  <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Source</th>
                  <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Category</th>
                  <th className="text-right p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Amount</th>
                  <th className="text-right p-3 text-xs font-bold text-[var(--text-muted)] uppercase">In Hand</th>
                </tr>
              </thead>
              <tbody>
                {revenueEvents.slice(0, 10).map(event => (
                  <tr key={event.id} className="border-b border-[var(--border)] hover:bg-[var(--card-subtle)]">
                    <td className="p-3 text-sm">{event.date?.slice(0, 10)}</td>
                    <td className="p-3 text-sm">{event.sourceName || event.source}</td>
                    <td className="p-3">
                      <span className="badge badge-gray">{event.category}</span>
                    </td>
                    <td className="p-3 text-sm text-right font-bold text-emerald-400">
                      ${(event.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-right">
                      ${(event.amountInHand || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}