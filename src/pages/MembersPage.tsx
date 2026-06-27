import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, where, orderBy, getCountFromServer, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { NotificationService } from '../services/notificationService';
import { Search, Filter, MoreVertical, Mail, Phone, MapPin, BadgeCheck, AlertCircle, Clock, CheckCircle, XCircle, ArrowUpCircle, Star, Trash2, Eye, UserPlus, UserMinus, Send } from 'lucide-react';
import type { User } from '../types/guild';

const QUICK_ACTIONS = [
  { value: 'verified', label: 'Verify', icon: CheckCircle, class: 'text-emerald-500' },
  { value: 'pending', label: 'Pending', icon: Clock, class: 'text-amber-500' },
  { value: 'rejected', label: 'Reject', icon: XCircle, class: 'text-rose-500' }
];

const ROLE_UPGRADES = [
  { value: 'member', label: 'Member' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'cityGuildMaster', label: 'City GM' }
];

// Branch options for receptionist promotion
const BRANCH_OPTIONS = [
  { id: 'ludhiana', name: 'The Guild - Ludhiana' },
  { id: 'chandigarh', name: 'The Guild - Chandigarh' },
  { id: 'delhi', name: 'The Guild - Delhi NCR' },
  { id: 'mumbai', name: 'The Guild - Mumbai' },
];

const ROLE_LABELS: Record<string, string> = {
  applicant: 'Applicant',
  member: 'Member',
  contributor: 'Contributor',
  receptionistCandidate: 'Receptionist Candidate',
  receptionist: 'Receptionist',
  cityGuildMaster: 'City Guild Master',
  stateGuildMaster: 'State Guild Master',
  centralGuildMaster: 'Central Guild Master',
  nationalGuildMaster: 'National Guild Master',
  guildFounder: 'Guild Founder',
  founder: 'Founder'
};

export function MembersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const membersRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [promoteDialogFor, setPromoteDialogFor] = useState<string | null>(null);
  const [messageDialogFor, setMessageDialogFor] = useState<{ userId: string; name: string } | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [actioning, setActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  const jurisConstraints = useMemo(() => {
    if (!profile) return [];
    if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) return [];

    if (profile.role === 'stateGuildMaster') {
      return [where('jurisdiction.stateId', '==', profile.jurisdiction.stateId)];
    }

    return [where('jurisdiction.cityId', '==', profile.jurisdiction.cityId)];
  }, [profile]);

  useEffect(() => {
    async function fetchMembers() {
      if (!profile) return;

      try {
        // NOTE: Firestore requires composite indexes for complex queries
        // For now, fetch with simple filter and filter in memory instead of requiring index

        // Get counts by role - use single where instead of multiple
        const roleCounts: Record<string, number> = {};
        const roles = ['member', 'contributor', 'receptionist', 'cityGuildMaster', 'stateGuildMaster'];

        // Simple single-query approach - fetch first then count
        const allUsersSnap = await getDocs(query(collection(db, 'users'), where('archiveStatus', '==', 'active'), limit(500)));
        const allUsers = allUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // Count in memory
        roles.forEach(role => {
          roleCounts[role] = allUsers.filter(u => u.role === role).length;
        });
        setCounts(roleCounts);

        // Filter by jurisdiction and role - receptionist only sees members, not staff
        let membersToSet = allUsers;
        const isAdmin = ['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role);
        const isStateAdmin = profile.role === 'stateGuildMaster';
        const isReceptionist = profile.role === 'receptionist';

        if (isReceptionist) {
          // Receptionists only see non-staff members, never other staff
          membersToSet = allUsers.filter((u: any) => u.role === 'member' || u.role === 'contributor');
        } else if (!isAdmin && !isStateAdmin) {
          // cityGuildMaster: show their city + all members
          membersToSet = allUsers.filter((u: any) => {
            if (u.role === 'member' || u.role === 'contributor') return true;
            return u.jurisdiction?.cityId === profile.jurisdiction.cityId;
          });
        } else if (isStateAdmin) {
          // State GM: show their state + all members
          membersToSet = allUsers.filter((u: any) => u.jurisdiction?.stateId === profile.jurisdiction.stateId || u.role === 'member' || u.role === 'contributor');
        }

        // Sort by createdAt desc in memory
        membersToSet.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        setMembers(membersToSet.map((u: any) => ({ id: u.id, ...u } as User)));
      } catch (err) {
        console.error('Failed to fetch members:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [profile]);

  const filteredMembers = useMemo(() => {
    // Apply role and status filters first
    let result = members;

    // Apply tab filter first
    if (activeTab === 'pending') {
      result = result.filter(m => m.verificationStatus === 'pending');
    }

    if (roleFilter !== 'all') {
      result = result.filter(m => m.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(m => m.verificationStatus === statusFilter);
    }

    // Then apply search if there's a search term
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(m => {
        const haystack = [
          m.fullName || '',
          m.email || '',
          m.city || '',
          m.phone || '',
          m.role || '',
          (m as any).username || '',
          m.jurisdiction?.cityName || '',
          m.jurisdiction?.stateName || ''
        ].join(' ').toLowerCase();

        return haystack.includes(s);
      });
    }

    return result;
  }, [members, search, roleFilter, statusFilter, activeTab]);

  const totalMembers = Object.values(counts).reduce((a, b) => a + b, 0);

  async function handleQuickAction(memberId: string, action: string, value: string, branchId?: string, branchName?: string) {
    if (!profile || actioning) return;

    // Find the target member
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    // RBAC: Receptionists cannot modify other staff roles
    const isTargetStaff = ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'].includes(targetMember.role);
    if (profile.role === 'receptionist' && isTargetStaff) {
      alert('You cannot modify staff user roles');
      return;
    }

    // RBAC: Cannot promote to equal or higher role
    const roleHierarchy = ['founder', 'guildFounder', 'centralGuildMaster', 'stateGuildMaster', 'cityGuildMaster', 'receptionist', 'contributor', 'member'];
    if (action === 'role' && roleHierarchy.indexOf(value) <= roleHierarchy.indexOf(profile.role)) {
      alert('You cannot assign this role');
      return;
    }

    setActioning(true);

    try {
      const ref = doc(db, 'users', memberId);
      const updates: Record<string, any> = { updatedAt: serverTimestamp() };

      if (action === 'status') {
        updates.verificationStatus = value;
      } else if (action === 'role') {
        updates.role = value;
        updates.guildRank = ROLE_LABELS[value] || value;
        // For receptionist, include branch assignment
        if (value === 'receptionist' && branchId) {
          updates.branchId = branchId;
          updates.branchName = branchName;
        }
      }

      await updateDoc(ref, updates);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } as User : m));
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActioning(false);
      setActionMenuFor(null);
      setPromoteDialogFor(null);
      setSelectedBranch('');
    }
  }

  function toggleSelect(memberId: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function selectAll() {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    }
  }

  async function handleBulkStatus(status: string) {
    if (!profile || selectedMembers.size === 0) return;
    setActioning(true);

    try {
      // Use batched writes for efficiency
      const { writeBatch } = await import('firebase/firestore');
      const batchOps = writeBatch(db);
      const updates = { verificationStatus: status, updatedAt: serverTimestamp() };

      Array.from(selectedMembers).forEach(id => {
        batchOps.update(doc(db, 'users', id), updates);
      });

      await batchOps.commit();
      setMembers(prev => prev.map(m => selectedMembers.has(m.id) ? { ...m, verificationStatus: status } as User : m));
      setSelectedMembers(new Set());
    } catch (err) {
      console.error('Bulk update failed:', err);
      alert('Bulk update failed. Please try again.');
    } finally {
      setActioning(false);
    }
  }

  async function handleBulkRole(role: string) {
    if (!profile || selectedMembers.size === 0) return;
    if (!confirm(`Assign ${role} to ${selectedMembers.size} member(s)?`)) return;
    setActioning(true);

    try {
      const { writeBatch } = await import('firebase/firestore');
      const batchOps = writeBatch(db);
      const updates = {
        role,
        guildRank: ROLE_LABELS[role] || role,
        updatedAt: serverTimestamp()
      };

      Array.from(selectedMembers).forEach(id => {
        batchOps.update(doc(db, 'users', id), updates);
      });

      await batchOps.commit();
      setMembers(prev => prev.map(m => selectedMembers.has(m.id) ? { ...m, role, guildRank: ROLE_LABELS[role] } as User : m));
      setSelectedMembers(new Set());
    } catch (err) {
      console.error('Bulk role assignment failed:', err);
      alert('Role assignment failed. Please try again.');
    } finally {
      setActioning(false);
    }
  }

  async function handleBulkNotify(message: string) {
    if (!profile || selectedMembers.size === 0 || !message.trim()) return;
    setActioning(true);

    try {
      // Send notifications to selected members
      const { collection, addDoc } = await import('firebase/firestore');
      const notifRef = collection(db, 'notifications');

      await Promise.all(
        Array.from(selectedMembers).map(memberId =>
          addDoc(notifRef, {
            userId: memberId,
            title: 'Bulk Notification',
            body: message,
            type: 'bulk_alert',
            priority: 'normal',
            status: 'unread',
            createdAt: new Date().toISOString()
          })
        )
      );
      alert(`Notification sent to ${selectedMembers.size} member(s)`);
      setSelectedMembers(new Set());
    } catch (err) {
      console.error('Bulk notification failed:', err);
      alert('Notification failed. Please try again.');
    } finally {
      setActioning(false);
    }
  }

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (membersRef.current && !membersRef.current.contains(event.target as Node)) {
        setActionMenuFor(null);
      }
    }
    if (actionMenuFor) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionMenuFor]);

  // Count pending requests
  const pendingCount = useMemo(() => members.filter(m => m.verificationStatus === 'pending').length, [members]);

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Federation Directory</p>
          <h1>Member Management</h1>
          <p className="text-[var(--text-secondary)]">
            Manage guild members, roles, and access permissions.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="text-2xl font-black">{totalMembers}</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Members</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{counts.member || 0}</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Members</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{counts.contributor || 0}</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Contributors</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{counts.receptionist || 0}</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Receptionists</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-black">{(counts.cityGuildMaster || 0) + (counts.stateGuildMaster || 0)}</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Leadership</div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeTab === 'all'
              ? 'bg-[var(--primary)] text-black'
              : 'bg-[var(--card-subtle)] text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/80'
          }`}
        >
          All Members
        </button>
        <button
          onClick={() => { setActiveTab('pending'); setStatusFilter('all'); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-[var(--primary)] text-black'
              : 'bg-[var(--card-subtle)] text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/80'
          }`}
        >
          Pending Requests
          {pendingCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'pending' ? 'bg-black/20 text-black' : 'bg-amber-500 text-black'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedMembers.size > 0 && (
        <div className="space-y-3 p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 animate-fade-up">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-[var(--primary)]">
              {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatus('verified')}
                disabled={actioning}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-3 h-3" /> Verify
              </button>
              <button
                onClick={() => handleBulkStatus('pending')}
                disabled={actioning}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3 h-3" /> Pending
              </button>
              <button
                onClick={() => handleBulkStatus('rejected')}
                disabled={actioning}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </div>
            <button
              onClick={() => setSelectedMembers(new Set())}
              className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Clear
            </button>
          </div>

          {/* Additional Bulk Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--primary)]/10">
            <span className="text-xs text-[var(--text-muted)]">Role:</span>
            <button
              onClick={() => handleBulkRole('member')}
              disabled={actioning}
              className="px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-600 hover:bg-blue-500/30"
            >
              Member
            </button>
            <button
              onClick={() => handleBulkRole('contributor')}
              disabled={actioning}
              className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-600 hover:bg-green-500/30"
            >
              Contributor
            </button>
            {profile?.role === 'founder' && (
              <>
                <button
                  onClick={() => handleBulkRole('receptionist')}
                  disabled={actioning}
                  className="px-2 py-1 rounded text-xs font-bold bg-purple-500/20 text-purple-600 hover:bg-purple-500/30"
                >
                  Receptionist
                </button>
                <button
                  onClick={() => handleBulkRole('cityGuildMaster')}
                  disabled={actioning}
                  className="px-2 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-600 hover:bg-amber-500/30"
                >
                  City GM
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--primary)]/10">
            <input
              type="text"
              placeholder="Quick notification message..."
              id="bulkNotify"
              className="input flex-1 text-xs py-1.5"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const input = document.getElementById('bulkNotify') as HTMLInputElement;
                  handleBulkNotify(input.value);
                  input.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('bulkNotify') as HTMLInputElement;
                handleBulkNotify(input.value);
                input.value = '';
              }}
              disabled={actioning}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-600 hover:bg-sky-500/30 flex items-center gap-1"
            >
              <Mail className="w-3 h-3" /> Notify
            </button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Loading Members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <p className="text-sm">No members found</p>
          </div>
        ) : (
          <div ref={membersRef} className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card-subtle)]">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                      onChange={selectAll}
                      className="rounded border-[var(--border)]"
                    />
                  </th>
                  <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Member</th>
                  <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                  <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Location</th>
                  <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Activity</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                  <tr key={member.id} className="border-b border-[var(--border)] hover:bg-[var(--card-subtle)]/50 group">
                    <td className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => toggleSelect(member.id)}
                        className="rounded border-[var(--border)]"
                      />
                    </td>
                    <td className="p-4">
                      <Link to={`/members/${member.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold">
                          {member.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text)] hover:text-[var(--primary)] transition-colors">{member.fullName || 'Unknown'}</div>
                          <div className="text-xs text-[var(--text-muted)]">{member.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        member.role?.includes('Founder') || member.role === 'founder' ? 'badge-purple' :
                        member.role?.includes('GuildMaster') ? 'badge-amber' :
                        member.role === 'receptionist' ? 'badge-blue' :
                        member.role === 'contributor' ? 'badge-green' :
                        'badge-gray'
                      }`}>
                        {ROLE_LABELS[member.role || 'member'] || member.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                      {member.city || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        member.verificationStatus === 'verified' ? 'badge-green' :
                        member.verificationStatus === 'rejected' ? 'badge-red' :
                        'badge-amber'
                      }`}>
                        {member.verificationStatus || 'pending'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">
                      <div className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3 text-emerald-500" />
                        <span>{member.reputationScore || 0} rep</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{member.completedQuests || 0} quests</span>
                      </div>
                    </td>
                    <td className="p-4 relative">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActionMenuFor(actionMenuFor === member.id ? null : member.id); }}
                          className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>

                        {/* Action Dropdown */}
                        {actionMenuFor === member.id && (
                          <div className="absolute right-4 top-8 z-20 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden animate-fade-up">
                            <Link
                              to={`/members/${member.id}`}
                              onClick={() => setActionMenuFor(null)}
                              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-subtle)] transition-colors"
                            >
                              <Eye className="w-4 h-4 text-[var(--primary)]" />
                              View Profile
                            </Link>
                            {/* Only show approve/reject for non-staff target OR if current user can manage staff */}
                            {member.verificationStatus === 'pending' && (!profile?.role || profile.role === 'receptionist' ? member.role === 'member' || member.role === 'contributor' : true) && (
                              <button
                                onClick={() => { handleQuickAction(member.id, 'status', 'verified'); setActionMenuFor(null); }}
                                disabled={actioning}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-subtle)] transition-colors text-emerald-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                            )}
                            {member.verificationStatus !== 'rejected' && (!profile?.role || profile.role === 'receptionist' ? member.role === 'member' || member.role === 'contributor' : true) && (
                              <button
                                onClick={() => { handleQuickAction(member.id, 'status', 'rejected'); setActionMenuFor(null); }}
                                disabled={actioning}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-subtle)] transition-colors text-rose-600"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            )}
                            <div className="border-t border-[var(--border)]" />
                            {/* Promote to Receptionist - use existing branch or show dialog */}
                            {(member.role === 'member' || member.role === 'contributor') && (
                              member.branchId ? (
                                <button
                                  onClick={() => {
                                    // Use existing branch directly - promote immediately
                                    const branch = BRANCH_OPTIONS.find(b => b.id === member.branchId);
                                    handleQuickAction(member.id, 'role', 'receptionist', member.branchId, branch?.name);
                                    setActionMenuFor(null);
                                  }}
                                  disabled={actioning}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-subtle)] transition-colors text-purple-600"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Promote (uses {member.branchName})
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPromoteDialogFor(member.id);
                                    setSelectedBranch(BRANCH_OPTIONS[0]?.id || '');
                                    setActionMenuFor(null);
                                  }}
                                  disabled={actioning}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-subtle)] transition-colors text-purple-600"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Promote to Receptionist
                                </button>
                              )
                            )}
                            <button
                              onClick={() => { setActionMenuFor(null); setMessageDialogFor({ userId: member.id, name: member.fullName || 'Unknown' }); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--card-subtle)] transition-colors"
                            >
                              <Send className="w-4 h-4" />
                              Send Message
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>

      {/* Promote to Receptionist Dialog */}
      {promoteDialogFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold mb-4">Promote to Receptionist</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Select the branch this receptionist will be assigned to:
            </p>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="input w-full mb-4"
            >
              {BRANCH_OPTIONS.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => { setPromoteDialogFor(null); setSelectedBranch(''); }}
                className="secondary flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const branch = BRANCH_OPTIONS.find(b => b.id === selectedBranch);
                  handleQuickAction(promoteDialogFor, 'role', 'receptionist', selectedBranch, branch?.name);
                }}
                disabled={actioning || !selectedBranch}
                className="primary flex-1 py-3"
              >
                {actioning ? 'Promoting...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Dialog */}
      {messageDialogFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold mb-2">Send Message</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Sending to: {messageDialogFor.name}
            </p>
            <input
              type="text"
              value={messageTitle}
              onChange={e => setMessageTitle(e.target.value)}
              placeholder="Message title..."
              className="input w-full mb-3"
            />
            <textarea
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              placeholder="Message body..."
              rows={4}
              className="input w-full mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setMessageDialogFor(null); setMessageTitle(''); setMessageBody(''); }}
                className="secondary flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!messageTitle.trim() || !messageBody.trim() || !profile) return;
                  setSendingMessage(true);
                  try {
                    await NotificationService.notify(
                      messageDialogFor.userId,
                      'general_alert',
                      messageTitle.trim(),
                      messageBody.trim(),
                      'medium',
                      profile,
                      { deduplicate: false, aggregate: false }
                    );
                    setMessageDialogFor(null);
                    setMessageTitle('');
                    setMessageBody('');
                  } catch (err) {
                    console.error('Failed to send message:', err);
                  } finally {
                    setSendingMessage(false);
                  }
                }}
                disabled={sendingMessage || !messageTitle.trim() || !messageBody.trim()}
                className="primary flex-1 py-3"
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}