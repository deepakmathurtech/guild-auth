import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, limit, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { User, Organization, Need, Opportunity, Quest, RevenueEvent, GuildUser } from '../types/guild';
import {
  Building, Target, TrendingUp, Clock, Star, Gift,
  ChevronLeft, Activity, Wallet, CheckCircle, AlertTriangle,
  Users, Calendar, MapPin, Phone, Mail, Award, Globe, Crown, Network
} from 'lucide-react';

export function GuildMasterProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();

  const [guildMaster, setGuildMaster] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [receptionists, setReceptionists] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [needs, setNeeds] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [revenueEvents, setRevenueEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnerView = !id || id === currentUser?.uid;

  useEffect(() => {
    async function loadData() {
      if (!id && !currentUser) return;

      const targetId = id || currentUser!.uid;

      try {
        // Get guild master user
        const userDocs = await getDocs(query(collection(db, 'users'), where('uid', '==', targetId), limit(1)));
        if (userDocs.empty) return;
        const user = { id: userDocs.docs[0].id, ...userDocs.docs[0].data() } as User;
        setGuildMaster(user);

        // Get members in jurisdiction
        const isCentralAdmin = ['centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'].includes(user.role);
        const isStateAdmin = ['stateGuildMaster'].includes(user.role);

        let memberConstraints = [where('archiveStatus', '==', 'active')];
        if (!isCentralAdmin && user.jurisdiction) {
          if (isStateAdmin && user.jurisdiction.stateId) {
            memberConstraints.push(where('jurisdiction.stateId', '==', user.jurisdiction.stateId));
          } else if (user.jurisdiction.cityId) {
            memberConstraints.push(where('jurisdiction.cityId', '==', user.jurisdiction.cityId));
          }
        }

        // Members
        const memberDocs = await getDocs(query(collection(db, 'users'), ...memberConstraints, orderBy('createdAt', 'desc'), limit(200)));
        setMembers(memberDocs.docs.map(d => ({ id: d.id, ...d.data() } as User)));

        // Receptionists
        const recDocs = await getDocs(query(collection(db, 'users'), ...memberConstraints, where('role', '==', 'receptionist'), limit(100)));
        setReceptionists(recDocs.docs.map(d => ({ id: d.id, ...d.data() } as User)));

        // Organizations
        const isNational = ['nationalGuildMaster', 'guildFounder', 'founder'].includes(user.role);
        let orgConstraints = [where('archiveStatus', '==', 'active'), limit(100)];
        if (!isNational && user.jurisdiction) {
          if (user.jurisdiction.cityId) {
            orgConstraints = [where('jurisdiction.cityId', '==', user.jurisdiction.cityId), ...orgConstraints];
          }
        }
        const orgDocs = await getDocs(query(collection(db, 'organizations'), ...orgConstraints));
        setOrganizations(orgDocs.docs.map(d => ({ id: d.id, ...d.data() } as Organization)));

        // Quests (assigned to this GM's jurisdiction)
        let questConstraints = [where('archiveStatus', '==', 'active'), orderBy('createdAt', 'desc'), limit(50)];
        if (!isNational && user.jurisdiction?.cityId) {
          questConstraints = [where('jurisdiction.cityId', '==', user.jurisdiction.cityId), ...questConstraints];
        }
        const questDocs = await getDocs(query(collection(db, 'quests'), ...questConstraints));
        setQuests(questDocs.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));

        // Revenue attributed to GM
        const revDocs = await getDocs(query(
          collection(db, 'revenueEvents'),
          where('attributedGuildMasterId', '==', targetId),
          orderBy('date', 'desc'),
          limit(100)
        ));
        setRevenueEvents(revDocs.docs.map(d => ({ id: d.id, ...d.data() } as RevenueEvent)));

        // Also get GM's branch revenue if applicable
        if (user.branchId) {
          const branchRevDocs = await getDocs(query(
            collection(db, 'revenueEvents'),
            where('attributedBranchId', '==', user.branchId),
            orderBy('date', 'desc'),
            limit(100)
          ));
          if (branchRevDocs.docs.length > 0) {
            setRevenueEvents(prev => [...prev, ...branchRevDocs.docs.map(d => ({ id: d.id, ...d.data() } as RevenueEvent))]);
          }
        }
      } catch (err) {
        console.error('Failed to load guild master data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, currentUser]);

  const metrics = useMemo(() => {
    if (!guildMaster) return null;

    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active').length;
    const totalReceptionists = receptionists.length;
    const activeReceptionists = receptionists.filter(r => r.status === 'active').length;

    const totalOrganizations = organizations.length;
    const activeOrgs = organizations.filter(o => o.currentStatus === 'active' || o.currentStatus === 'partner').length;

    const activeQuests = quests.filter(q => ['open', 'assigned', 'inProgress'].includes(q.status)).length;
    const completedQuests = quests.filter(q => q.status === 'completed').length;

    const totalRevenue = revenueEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
    const revenueInHand = revenueEvents.reduce((sum, e) => sum + (e.amountInHand || 0), 0);

    // Trust score (calculated from member trust scores)
    const avgTrustScore = members.length > 0
      ? members.reduce((sum, m) => sum + (m.trustScore || 0), 0) / members.length
      : 0;

    // Calculate growth rate from new members in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newMembers30Days = members.filter(m => new Date(m.createdAt) >= thirtyDaysAgo).length;

    return {
      totalMembers,
      activeMembers,
      totalReceptionists,
      activeReceptionists,
      totalOrganizations,
      activeOrgs,
      activeQuests,
      completedQuests,
      totalRevenue,
      revenueInHand,
      avgTrustScore,
      newMembers30Days,
      needsProcessed: 0, // Would come from needs collection
      opportunitiesCreated: 0
    };
  }, [guildMaster, members, receptionists, organizations, quests, revenueEvents]);

  const ROLE_LABELS: Record<string, string> = {
    cityGuildMaster: 'City Guild Master',
    stateGuildMaster: 'State Guild Master',
    centralGuildMaster: 'Central Guild Master',
    nationalGuildMaster: 'National Guild Master',
    guildFounder: 'Guild Founder',
    founder: 'Founder',
    receptionist: 'Receptionist',
    contributor: 'Contributor',
    member: 'Member',
    applicant: 'Applicant'
  };
  const roleLabel = ROLE_LABELS[guildMaster?.role || ''] || guildMaster?.role || 'Guild Master';

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

  if (!guildMaster) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[var(--text-muted)]">Guild Master not found.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/members')}>
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-4"
            onClick={() => navigate('/members')}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Members Directory
          </button>
          {isOwnerView && (
            <button className="secondary flex items-center gap-2" onClick={() => navigate('/branches-hierarchy')}>
              <Network className="w-4 h-4" /> Branch Network
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-2xl font-black">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1>{guildMaster.fullName}</h1>
                <span className="role-pill !bg-amber-500/10 !text-amber-500 !border-amber-500/20">{roleLabel}</span>
              </div>
              {guildMaster.jurisdiction && (
                <p className="text-sm text-[var(--text-muted)]">
                  {guildMaster.jurisdiction.cityName || guildMaster.jurisdiction.stateName || guildMaster.jurisdiction.countryName || 'Federation'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Total Members</span>
            </div>
            <div className="text-2xl font-black">{metrics.totalMembers}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {metrics.activeMembers} active
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Receptionists</span>
            </div>
            <div className="text-2xl font-black">{metrics.totalReceptionists}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {metrics.activeReceptionists} active
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Building className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Organizations</span>
            </div>
            <div className="text-2xl font-black">{metrics.totalOrganizations}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {metrics.activeOrgs} active
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Revenue</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              ${metrics.revenueInHand.toLocaleString()} in hand
            </div>
          </div>
        </div>
      )}

      {/* Secondary Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <Star className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Avg Trust</span>
          </div>
          <div className="text-xl font-black text-amber-400">
            {metrics?.avgTrustScore.toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Growth (30d)</span>
          </div>
          <div className="text-xl font-black text-emerald-400">
            +{metrics?.newMembers30Days || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Active Quests</span>
          </div>
          <div className="text-xl font-black">
            {metrics?.activeQuests || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Completed</span>
          </div>
          <div className="text-xl font-black text-emerald-400">
            {metrics?.completedQuests || 0}
          </div>
        </div>
      </div>

      {/* Members Overview */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-lg font-bold">Members ({members.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Name</th>
                <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Role</th>
                <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Status</th>
                <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Trust</th>
                <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Rank</th>
              </tr>
            </thead>
            <tbody>
              {members.slice(0, 15).map(member => (
                <tr
                  key={member.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--card-subtle)] cursor-pointer"
                  onClick={() => navigate(`/members/${member.id}`)}
                >
                  <td className="p-3 font-medium">{member.fullName}</td>
                  <td className="p-3">
                    <span className="text-sm text-[var(--text-muted)]">{member.role}</span>
                  </td>
                  <td className="p-3">
                    <span className={`status-badge status-${member.status}`}>{member.status}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">{member.trustScore || 0}%</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold">{member.guildRank}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length > 15 && (
            <p className="p-3 text-sm text-[var(--text-muted)] text-center">
              +{members.length - 15} more members
            </p>
          )}
        </div>
      </div>

      {/* Receptionists */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-lg font-bold">Receptionists ({receptionists.length})</h2>
        </div>
        {receptionists.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No receptionists in this jurisdiction.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receptionists.map(rec => (
              <div
                key={rec.id}
                className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/members/${rec.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold">
                    {rec.fullName?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold">{rec.fullName}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Trust: {rec.trustScore || 0}% | {rec.guildRank}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizations */}
      <div className="panel">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-lg font-bold">Organizations ({organizations.length})</h2>
        </div>
        {organizations.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No organizations in this jurisdiction.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.slice(0, 9).map(org => (
              <div
                key={org.id}
                className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/organizations/${org.id}`)}
              >
                <div className="font-bold mb-1">{org.name}</div>
                <div className="text-xs text-[var(--text-muted)] mb-2">{org.category}</div>
                <div className="flex items-center gap-2">
                  <span className={`status-badge status-${org.currentStatus}`}>{org.currentStatus}</span>
                  {org.trustLevel && (
                    <span className="text-xs text-amber-500">Trust: {org.trustLevel}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}