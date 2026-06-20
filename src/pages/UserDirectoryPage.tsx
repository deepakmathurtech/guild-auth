import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { GuildUser, GuildRole, Organization } from '../types/guild';
import { Search, Filter, Plus, MoreVertical, MapPin, Users, Shield, Edit, Trash2, X, Check, AlertTriangle, UserCheck, UserMinus, Crown, ChevronRight, ArrowRight, Building2, Globe, Clock, Activity, Target, Star, TrendingUp, Award } from 'lucide-react';
import { roleLabels } from '../lib/rbac';

type TrustLevel = 'new' | 'verified' | 'trusted' | 'partner';

type DirectoryQuery = {
  searchText: string;
  role: '' | GuildRole;
  trust: '' | TrustLevel;
  verification: '' | 'pending' | 'verified' | 'rejected';
  branch: '' | string;
  organization: '' | string;
};

type WizardStep = 'search' | 'review' | 'action' | 'confirm';

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
  { value: 'founder', label: 'Founder', weight: 7 },
];

const ACTION_TYPES = [
  { id: 'promote', label: 'Promote User', description: 'Elevate user to a higher role', icon: TrendingUp },
  { id: 'demote', label: 'Demote User', description: 'Reduce user to a lower role', icon: ArrowRight },
  { id: 'transfer', label: 'Transfer User', description: 'Move user to different jurisdiction', icon: MapPin },
  { id: 'receptionist', label: 'Assign Receptionist', description: 'Assign as organization receptionist', icon: Building2 },
  { id: 'guildmaster', label: 'Assign Guild Master', description: 'Assign as city/state guild master', icon: Crown },
] as const;

function safeString(v: unknown) {
  return (typeof v === 'string' ? v : '')?.toString();
}

function computeProfileCompletion(u: GuildUser) {
  const checks: Array<boolean> = [
    Boolean(u.fullName),
    Boolean(u.email),
    Boolean(u.phone),
    Boolean(u.skills?.length),
    Boolean(u.interests?.length),
    Boolean(u.bio),
    Boolean(u.branchId),
    Boolean(u.jurisdiction?.cityId)
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function getActivityLevel(u: GuildUser): string {
  if (!u.lastActiveAt) return 'Unknown';
  const daysSince = (Date.now() - new Date(u.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 1) return 'Active';
  if (daysSince < 7) return 'Recent';
  if (daysSince < 30) return 'Moderate';
  return 'Inactive';
}

function getTrustLevel(u: GuildUser): TrustLevel {
  if (u.verificationStatus === 'verified') return 'verified';
  if ((u.trustScore ?? 0) >= 70) return 'trusted';
  if (u.branchId) return 'verified';
  return 'new';
}

export function UserDirectoryPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GuildUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState<DirectoryQuery>({
    searchText: '',
    role: '',
    trust: '',
    verification: '',
    branch: '',
    organization: ''
  });

  // PHASE 2: Quick Profile View state
  const [selected, setSelected] = useState<GuildUser | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);

  // PHASE 3: Role Assignment Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('search');
  const [wizardUser, setWizardUser] = useState<GuildUser | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<GuildRole>('member');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [confirming, setConfirming] = useState(false);

  const canAccess = useMemo(() => {
    if (!profile) return false;
    return ['founder', 'guildFounder', 'centralGuildMaster'].includes(profile.role);
  }, [profile]);

  // Load users
  useEffect(() => {
    if (!profile || !canAccess) return;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Guard for TypeScript
        if (!profile) return;

        // NOTE: Firestore requires composite indexes for where + orderBy
        // Fetch simple data and filter/sort in memory instead
        const snap = await getDocs(query(collection(db, 'users'), limit(500)));

        let users = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) })) as GuildUser[];

        // Filter by jurisdiction in memory
        if (!['founder', 'guildFounder', 'centralGuildMaster'].includes(profile.role)) {
          if (profile.role === 'stateGuildMaster') {
            users = users.filter((u: any) => u.jurisdiction?.stateId === profile.jurisdiction?.stateId);
          } else {
            users = users.filter((u: any) => u.jurisdiction?.cityId === profile.jurisdiction?.cityId);
          }
        }

        // Sort by createdAt desc in memory
        users.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        setMembers(users.slice(0, 200));
      } catch (e) {
        console.error(e);
        setError('Failed to load user directory.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile, canAccess]);

  // Load organizations
  useEffect(() => {
    if (!canAccess) return;
    const unsub = onSnapshot(
      query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'), limit(100)),
      (snap) => setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() as any })) as Organization[])
    );
    return unsub;
  }, [canAccess]);

  const filtered = useMemo(() => {
    // Apply filters step by step
    let result = members;

    if (q.role) {
      result = result.filter(u => u.role === q.role);
    }
    if (q.verification) {
      result = result.filter(u => u.verificationStatus === q.verification);
    }
    if (q.trust) {
      result = result.filter(u => getTrustLevel(u) === q.trust);
    }
    if (q.branch) {
      result = result.filter(u => safeString(u.branchId) === q.branch);
    }
    if (q.organization) {
      const orgLower = q.organization.toLowerCase();
      result = result.filter(u => {
        const hay = `${safeString((u as any).organizationName)} ${safeString((u as any).organization)} ${(u as any).assignedReceptionistId || ''}`.toLowerCase();
        return hay.includes(orgLower);
      });
    }
    if (q.searchText.trim()) {
      const s = q.searchText.toLowerCase();
      result = result.filter(u => {
        const hay = `${u.fullName || ''} ${u.email || ''} ${(u as any).username || ''} ${u.phone || ''} ${u.role || ''} ${u.city || ''} ${u.jurisdiction?.cityName || ''} ${u.jurisdiction?.stateName || ''}`.toLowerCase();
        return hay.includes(s);
      });
    }

    return result;
  }, [members, q]);

  async function handleWizardConfirm() {
    if (!wizardUser || !selectedAction) return;
    setConfirming(true);
    try {
      const updates: any = {
        updatedAt: serverTimestamp(),
        activityHistory: [
          ...(wizardUser.activityHistory || []),
          `ACTION: ${selectedAction} on ${new Date().toISOString()} by ${profile?.fullName}`
        ]
      };
      if (selectedAction === 'promote' || selectedAction === 'demote') {
        updates.role = selectedRole;
        updates.roleUpdatedAt = serverTimestamp();
      }
      if (selectedAction === 'receptionist') {
        updates.assignedReceptionistId = selectedOrganization;
      }
      await updateDoc(doc(db, 'users', wizardUser.uid), updates);
      setMembers(prev => prev.map(m => m.uid === wizardUser.uid ? { ...m, ...updates } : m));
      setWizardOpen(false);
      setWizardStep('search');
      setWizardUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  }

  function startWizard(user: GuildUser) {
    setWizardUser(user);
    setWizardStep('review');
    setWizardOpen(true);
  }

  if (!profile) return null;
  if (!canAccess) {
    return (
      <div className="p-12 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-[var(--text-muted)] mt-2">Founder directory access requires leadership privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">People Directory</p>
          <h1>User Directory</h1>
          <p className="text-[var(--text-secondary)]">Founder-first search, profile cards, and role assignment wizard.</p>
        </div>
        {canAccess && (
          <button className="primary" onClick={() => { setWizardUser(null); setWizardStep('search'); setWizardOpen(true); }}>
            <Crown className="w-4 h-4" /> Role Assignment Wizard
          </button>
        )}
      </div>

      {error && <div className="panel border border-rose-500/30 bg-rose-500/5 text-rose-700 p-4">{error}</div>}

      {/* PHASE 1: Global Search Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by name, email, username, phone, role..." value={q.searchText} onChange={e => setQ(prev => ({ ...prev, searchText: e.target.value }))} className="input pl-10 w-full" />
        </div>
        <select value={q.role} onChange={e => setQ(prev => ({ ...prev, role: e.target.value as any }))} className="input md:w-48">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
        </select>
        <select value={q.verification} onChange={e => setQ(prev => ({ ...prev, verification: e.target.value as any }))} className="input md:w-40">
          <option value="">All Verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={q.trust} onChange={e => setQ(prev => ({ ...prev, trust: e.target.value as any }))} className="input md:w-40">
          <option value="">All Trust</option>
          <option value="new">New</option>
          <option value="verified">Verified</option>
          <option value="trusted">Trusted</option>
        </select>
      </div>

      {/* Directory Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="panel p-5 rounded-xl border border-[var(--border)]">
              <div className="h-4 bg-[var(--card-subtle)] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[var(--card-subtle)] rounded w-1/2 mb-6" />
              <div className="h-8 bg-[var(--card-subtle)] rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          filtered.map(u => {
            const completion = computeProfileCompletion(u);
            const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : '-';
            const activity = getActivityLevel(u);
            const trust = getTrustLevel(u);
            return (
              <button key={u.uid} onClick={() => { setSelected(u); setShowQuickView(true); }}
                className="panel p-4 rounded-xl border text-left transition-all hover:border-[var(--primary)]/50 hover:shadow-lg group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold">
                    {u.fullName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate text-sm">{u.fullName}</h3>
                    <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className={`badge text-[10px] ${u.role === 'founder' || u.role === 'guildFounder' ? 'badge-purple' : u.role?.includes('Master') ? 'badge-blue' : u.role === 'receptionist' ? 'badge-cyan' : u.role === 'contributor' ? 'badge-green' : 'badge-gray'}`}>
                    {roleLabels[u.role] || u.role}
                  </span>
                  <span className={`badge text-[10px] ${u.status === 'active' ? 'badge-green' : 'badge-amber'}`}>{u.status}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {u.jurisdiction?.cityName}</div>
                  <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Trust: {trust}</div>
                  <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> {activity}</div>
                </div>
                {canAccess && (
                  <button onClick={(e) => { e.stopPropagation(); startWizard(u); }} className="mt-3 w-full py-1.5 text-xs secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage
                  </button>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* PHASE 2: Quick View Modal */}
      {showQuickView && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selected.fullName}</h2>
                <p className="text-sm text-[var(--text-muted)]">{selected.email}</p>
              </div>
              <button onClick={() => { setShowQuickView(false); setSelected(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-purple">{roleLabels[selected.role] || selected.role}</span>
                <span className={`badge ${selected.status === 'active' ? 'badge-green' : 'badge-amber'}`}>{selected.status}</span>
                <span className="badge badge-gray">Verification: {selected.verificationStatus}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-[var(--text-muted)] uppercase">Branch</div><div className="font-medium">{selected.branchId || '-'}</div></div>
                <div><div className="text-xs text-[var(--text-muted)] uppercase">Trust</div><div className="font-medium">{getTrustLevel(selected)}</div></div>
                <div><div className="text-xs text-[var(--text-muted)] uppercase">Last Active</div><div className="font-medium">{selected.lastActiveAt ? new Date(selected.lastActiveAt).toLocaleDateString() : '-'}</div></div>
                <div><div className="text-xs text-[var(--text-muted)] uppercase">Profile</div><div className="font-medium">{computeProfileCompletion(selected)}%</div></div>
                <div><div className="text-xs text-[var(--text-muted)] uppercase">Jurisdiction</div><div className="font-medium">{selected.jurisdiction?.cityName}, {selected.jurisdiction?.stateName}</div></div>
                <div><div className="text-xs text-[var(--text-muted)] uppercase">Activity</div><div className="font-medium">{getActivityLevel(selected)}</div></div>
              </div>
              {selected.skills?.length > 0 && (
                <div><div className="text-xs text-[var(--text-muted)] uppercase mb-2">Skills</div><div className="flex flex-wrap gap-1">{selected.skills.map(s => <span key={s} className="badge badge-blue">{s}</span>)}</div></div>
              )}
              <div className="flex gap-2 pt-4">
                <button className="primary flex-1" onClick={() => { setShowQuickView(false); startWizard(selected); }}>
                  <Edit className="w-4 h-4" /> Assign Role
                </button>
                <button className="secondary flex-1" onClick={() => setShowQuickView(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: Role Assignment Wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Role Assignment Wizard</h2>
                <p className="text-sm text-[var(--text-muted)]">Step {wizardStep === 'search' ? '1' : wizardStep === 'review' ? '2' : wizardStep === 'action' ? '3' : '4'} of 4</p>
              </div>
              <button onClick={() => { setWizardOpen(false); setWizardStep('search'); setWizardUser(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Progress */}
            <div className="flex items-center gap-2 p-4 bg-[var(--card-subtle)]">
              {[{ step: 'search', label: 'Search' }, { step: 'review', label: 'Review' }, { step: 'action', label: 'Action' }, { step: 'confirm', label: 'Confirm' }].map((s, i) => (
                <div key={s.step} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep === s.step ? 'bg-[var(--primary)] text-black' : 'bg-[var(--border)]'}`}>{i + 1}</div>
                  <span className={`text-xs ${wizardStep === s.step ? 'font-bold' : 'text-[var(--text-muted)]'}`}>{s.label}</span>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
                </div>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {/* STEP 1: Search User */}
              {wizardStep === 'search' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input type="text" placeholder="Search user by name, email, or role..." value={q.searchText} onChange={e => setQ(prev => ({ ...prev, searchText: e.target.value }))} className="input pl-10 w-full" />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filtered.slice(0, 10).map(u => (
                      <button key={u.uid} onClick={() => { setWizardUser(u); setWizardStep('review'); }}
                        className="w-full p-3 rounded-lg border flex items-center gap-3 hover:border-[var(--primary)] text-left">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold text-sm">{u.fullName?.charAt(0)}</div>
                        <div className="flex-1"><p className="font-bold text-sm">{u.fullName}</p><p className="text-xs text-[var(--text-muted)]">{roleLabels[u.role]}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Review Profile */}
              {wizardStep === 'review' && wizardUser && (
                <div className="space-y-4">
                  <div className="panel p-4 rounded-xl bg-[var(--card-subtle)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold">{wizardUser.fullName?.charAt(0)}</div>
                      <div>
                        <p className="font-bold">{wizardUser.fullName}</p>
                        <p className="text-sm text-[var(--text-muted)]">{wizardUser.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-[var(--text-muted)]">Role</span><p className="font-bold">{roleLabels[wizardUser.role]}</p></div>
                      <div><span className="text-[var(--text-muted)]">Branch</span><p className="font-bold">{wizardUser.branchId || '-'}</p></div>
                      <div><span className="text-[var(--text-muted)]">Trust</span><p className="font-bold">{getTrustLevel(wizardUser)}</p></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="secondary flex-1" onClick={() => setWizardStep('action')}>Continue <ChevronRight className="w-4 h-4" /></button>
                    <button className="secondary" onClick={() => setWizardStep('search')}>Back</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Choose Action */}
              {wizardStep === 'action' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {ACTION_TYPES.map(action => {
                      const Icon = action.icon;
                      return (
                        <button key={action.id} onClick={() => { setSelectedAction(action.id); setWizardStep('confirm'); }}
                          className={`p-4 rounded-xl border text-left transition-all ${selectedAction === action.id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'hover:border-[var(--primary)]/50'}`}>
                          <Icon className="w-6 h-6 mb-2 text-[var(--primary)]" />
                          <p className="font-bold text-sm">{action.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{action.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  {selectedAction === 'promote' && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold">Select Target Role</p>
                      <div className="grid grid-cols-3 gap-2">
                        {ROLE_OPTIONS.filter(r => r.weight > (ROLE_OPTIONS.find(x => x.value === wizardUser?.role)?.weight ?? 0)).map(r => (
                          <button key={r.value} onClick={() => setSelectedRole(r.value)}
                            className={`p-2 rounded-lg border text-sm ${selectedRole === r.value ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'hover:border-[var(--primary)]/50'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedAction === 'receptionist' && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold">Select Organization (PHASE 4)</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {organizations.map(org => (
                          <button key={org.id} onClick={() => setSelectedOrganization(org.id)}
                            className={`w-full p-2 rounded-lg border text-left text-sm ${selectedOrganization === org.id ? 'border-[var(--primary)]' : ''}`}>
                            <p className="font-bold">{org.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{org.category} - {org.city}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="secondary" onClick={() => setWizardStep('review')}>Back</button>
                  </div>
                </div>
              )}

              {/* STEP 4: Confirm */}
              {wizardStep === 'confirm' && (
                <div className="space-y-4">
                  <div className="panel p-6 rounded-xl bg-amber-500/10 border-amber-500/30">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                    <p className="font-bold">Confirm Role Change</p>
                    <p className="text-sm text-[var(--text-muted)]">This action will update {wizardUser?.fullName}'s profile. Are you sure?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[var(--text-muted)]">User</span><p className="font-bold">{wizardUser?.fullName}</p></div>
                    <div><span className="text-[var(--text-muted)]">Current Role</span><p className="font-bold">{wizardUser?.role ? roleLabels[wizardUser.role] : '-'}</p></div>
                    {selectedAction === 'promote' && <div><span className="text-[var(--text-muted)]">New Role</span><p className="font-bold">{roleLabels[selectedRole]}</p></div>}
                    {selectedAction === 'receptionist' && <div><span className="text-[var(--text-muted)]">Organization</span><p className="font-bold">{organizations.find(o => o.id === selectedOrganization)?.name}</p></div>}
                  </div>
                  <div className="flex gap-2">
                    <button className="primary flex-1" onClick={handleWizardConfirm} disabled={confirming}>
                      {confirming ? 'Updating...' : <><Check className="w-4 h-4" /> Confirm Change</>}
                    </button>
                    <button className="secondary" onClick={() => setWizardStep('action')}>Back</button>
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