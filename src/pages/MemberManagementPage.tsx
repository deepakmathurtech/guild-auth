import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { GuildUser, GuildRole } from '../types/guild';
import { Search, Filter, Plus, MoreVertical, MapPin, Users, Shield, Edit, Trash2, X, Check, AlertTriangle, UserCheck, UserMinus, Crown } from 'lucide-react';
import { roleLabels } from '../lib/rbac';

const ROLE_OPTIONS: { value: GuildRole; label: string; weight: number }[] = [
  { value: 'applicant', label: 'Applicant', weight: 0 },
  { value: 'member', label: 'Member', weight: 1 },
  { value: 'contributor', label: 'Contributor', weight: 2 },
  { value: 'receptionistCandidate', label: 'Receptionist Candidate', weight: 2.5 },
  { value: 'receptionist', label: 'Receptionist', weight: 3 },
  { value: 'cityGuildMaster', label: 'City Guild Master', weight: 4 },
  { value: 'stateGuildMaster', label: 'State Guild Master', weight: 5 },
  { value: 'centralGuildMaster', label: 'Central Guild Master', weight: 6 },
  { value: 'nationalGuildMaster', label: 'National Guild Master', weight: 6 },
  { value: 'guildFounder', label: 'Guild Founder', weight: 7 },
];

export function MemberManagementPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<GuildUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState<GuildUser | null>(null);
  const [editingRole, setEditingRole] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<GuildRole>('member');

  useEffect(() => {
    async function loadMembers() {
      if (!profile) return;
      try {
        let q;
        // Founders see all, others see their jurisdiction
        if (profile.role === 'founder' || profile.role === 'guildFounder' || profile.role === 'centralGuildMaster') {
          q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200));
        } else {
          q = query(
            collection(db, 'users'),
            where('jurisdiction.cityId', '==', profile.jurisdiction?.cityId),
            orderBy('createdAt', 'desc'),
            limit(200)
          );
        }
        const snap = await getDocs(q);
        setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser)));
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, [profile]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (roleFilter && m.role !== roleFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          m.fullName?.toLowerCase().includes(s) ||
          m.email?.toLowerCase().includes(s) ||
          m.role?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [members, search, roleFilter]);

  async function handleRoleUpdate() {
    if (!selectedMember || !selectedRole) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', selectedMember.uid), {
        role: selectedRole,
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: profile?.uid,
        activityHistory: [
          ...(selectedMember.activityHistory || []),
          `ROLE_CHANGE: ${selectedMember.role} → ${selectedRole} on ${new Date().toISOString()} by ${profile?.fullName}`
        ],
        updatedAt: serverTimestamp()
      });
      setMembers(prev =>
        prev.map(m =>
          m.uid === selectedMember.uid
            ? { ...m, role: selectedRole, activityHistory: [...(m.activityHistory || []), `ROLE_CHANGE: ${m.role} → ${selectedRole}`] }
            : m
        )
      );
      setEditingRole(false);
      setSelectedMember(null);
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setUpdating(false);
    }
  }

  if (!profile) return null;

  // Only founders and central leadership can access
  const canManageMembers = ['founder', 'guildFounder', 'centralGuildMaster', 'nationalGuildMaster', 'stateGuildMaster'].includes(profile.role);

  if (!canManageMembers) {
    return (
      <div className="p-12 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-[var(--text-muted)] mt-2">Member management requires leadership privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">User Management</p>
          <h1>Member Directory</h1>
          <p className="text-[var(--text-secondary)]">
            View and manage member roles, verification status, and access levels.
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="input md:w-48"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Members Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
            <p className="text-sm text-[var(--text-muted)]">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No members found</p>
            {search && (
              <button onClick={() => { setSearch(''); setRoleFilter(''); }} className="text-xs text-[var(--primary)] mt-2">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map(member => (
            <button
              key={member.uid}
              onClick={() => setSelectedMember(member)}
              className={`panel p-5 rounded-xl border text-left transition-all hover:border-[var(--primary)]/50 ${
                selectedMember?.uid === member.uid ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold">
                  {member.fullName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{member.fullName}</h3>
                  <p className="text-xs text-[var(--text-muted)] truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${
                  member.role === 'founder' || member.role === 'guildFounder' ? 'badge-purple' :
                  member.role?.includes('Master') ? 'badge-blue' :
                  member.role === 'receptionist' ? 'badge-cyan' :
                  member.role === 'contributor' ? 'badge-green' :
                  member.role === 'member' ? 'badge-gray' :
                  'badge-amber'
                }`}>
                  {roleLabels[member.role as GuildRole] || member.role}
                </span>
                <span className={`badge ${
                  member.status === 'active' ? 'badge-green' :
                  member.status === 'inactive' ? 'badge-red' : 'badge-amber'
                }`}>
                  {member.status}
                </span>
              </div>

              <div className="text-xs text-[var(--text-muted)]">
                {member.jurisdiction?.cityName}, {member.jurisdiction?.stateName}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedMember.fullName}</h2>
                <p className="text-sm text-[var(--text-muted)]">{selectedMember.email}</p>
              </div>
              <button onClick={() => { setSelectedMember(null); setEditingRole(false); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Role */}
              <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Current Role</div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    selectedMember.role === 'founder' || selectedMember.role === 'guildFounder' ? 'badge-purple' :
                    selectedMember.role?.includes('Master') ? 'badge-blue' :
                    selectedMember.role === 'receptionist' ? 'badge-cyan' : 'badge-green'
                  }`}>
                    {roleLabels[selectedMember.role as GuildRole] || selectedMember.role}
                  </span>
                  {['founder', 'guildFounder'].includes(profile.role) && (
                    <button
                      onClick={() => { setSelectedRole(selectedMember.role as GuildRole); setEditingRole(true); }}
                      className="text-xs text-[var(--primary)] flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Change Role
                    </button>
                  )}
                </div>
              </div>

              {/* Role Selection (when editing) */}
              {editingRole && (
                <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                  <div className="text-xs font-bold text-[var(--primary)] uppercase mb-3">Select New Role</div>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setSelectedRole(r.value)}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                          selectedRole === r.value
                            ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]'
                            : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setEditingRole(false)} className="secondary flex-1">Cancel</button>
                    <button
                      onClick={handleRoleUpdate}
                      disabled={updating || selectedRole === selectedMember.role}
                      className="primary flex-1 flex items-center justify-center gap-2"
                    >
                      {updating ? 'Updating...' : <><Check className="w-4 h-4" /> Update Role</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Member Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Status</span>
                  <span className="font-medium">{selectedMember.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Verification</span>
                  <span className="font-medium">{selectedMember.verificationStatus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">City</span>
                  <span className="font-medium">{selectedMember.jurisdiction?.cityName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Joined</span>
                  <span className="font-medium">{selectedMember.createdAt ? new Date(selectedMember.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>

              {/* Activity History */}
              {selectedMember.activityHistory && selectedMember.activityHistory.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Recent Activity</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedMember.activityHistory.slice(-5).reverse().map((activity, i) => (
                      <div key={i} className="text-xs text-[var(--text-secondary)] p-2 rounded bg-[var(--card-subtle)]">
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}