import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, limit, query, where, orderBy, getCountFromServer, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { getPendingBranchRequests, approveBranchRequest, rejectBranchRequest, findBranchByJurisdiction, assignUsersToBranch, assignOrganizationsToBranch, findUsersWithoutBranch, findOrganizationsWithoutBranch } from '../services/branchService';
import type { BranchRequest, GuildUser, Organization } from '../types/guild';
import { Search, Filter, Plus, MoreVertical, MapPin, Users, Trophy, TrendingUp, ShieldCheck, Edit, Trash2, ArrowRight, Building, Calendar, Globe, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type BranchData = {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  description: string;
  status: string;
  recruitmentStatus: string;
  statistics: {
    activeMembers: number;
    completedQuests: number;
    trustScore: number;
    verifiedOutcomesValue: number;
  };
  localHubCoordinator: {
    name: string;
    role: string;
    photoURL?: string;
  };
  createdAt: any;
};

export function BranchesPage() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [editing, setEditing] = useState<BranchData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  // Branch Request Queue state
  const [branchRequests, setBranchRequests] = useState<BranchRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BranchRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [auditMode, setAuditMode] = useState<'loading' | 'ready'>('loading');
  const [orphanUsers, setOrphanUsers] = useState<GuildUser[]>([]);
  const [orphanOrgs, setOrphanOrgs] = useState<Organization[]>([]);
  const [activeTab, setActiveTab] = useState<'branches' | 'requests' | 'audit'>('branches');
  const canManageBranch = profile && ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'].includes(profile.role);

  // Branch creation form state
  const [newBranch, setNewBranch] = useState({
    name: '',
    city: '',
    state: '',
    country: 'India',
    description: '',
    recruitmentStatus: 'open'
  });

  useEffect(() => {
    async function loadBranches() {
      try {
        const q = query(collection(db, 'guildBranches'), orderBy('createdAt', 'desc'), limit(50)) as any;
        const snap = await getDocs(q);
        const branchesList: BranchData[] = [];
        snap.docs.forEach(d => {
          const data = d.data() as Record<string, unknown>;
          const stats = data.statistics as Record<string, unknown> | undefined;
          const coordinator = data.localHubCoordinator as Record<string, unknown> | undefined;
          branchesList.push({
            id: d.id,
            name: String(data.name || ''),
            city: String(data.city || ''),
            state: String(data.state || ''),
            country: String(data.country || ''),
            description: String(data.description || ''),
            status: String(data.status || 'inactive'),
            recruitmentStatus: String(data.recruitmentStatus || 'closed'),
            statistics: {
              activeMembers: Number(stats?.activeMembers) || 0,
              completedQuests: Number(stats?.completedQuests) || 0,
              trustScore: Number(stats?.trustScore) || 0,
              verifiedOutcomesValue: Number(stats?.verifiedOutcomesValue) || 0
            },
            localHubCoordinator: {
              name: String(coordinator?.name || ''),
              role: String(coordinator?.role || ''),
              photoURL: coordinator?.photoURL as string | undefined
            },
            createdAt: data.createdAt
          });
        });
        setBranches(branchesList);
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBranches();

    // Load pending branch requests for Founders
    async function loadBranchRequests() {
      try {
        const requests = await getPendingBranchRequests();
        setBranchRequests(requests);
      } catch (err) {
        console.error('Failed to load branch requests:', err);
      } finally {
        setRequestsLoading(false);
      }
    }

    if (canManageBranch) {
      loadBranchRequests();
    }
  }, [profile]);

  const filteredBranches = useMemo(() => {
    if (!search) return branches;
    const s = search.toLowerCase();
    return branches.filter(b =>
      b.name?.toLowerCase().includes(s) ||
      b.city?.toLowerCase().includes(s) ||
      b.state?.toLowerCase().includes(s)
    );
  }, [branches, search]);

  async function handleUpdateBranch(branchId: string, updates: Partial<BranchData>) {
    try {
      await updateDoc(doc(db, 'guildBranches', branchId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setBranches(prev => prev.map(b => b.id === branchId ? { ...b, ...updates } : b));
      setEditing(null);
    } catch (err) {
      console.error('Update failed:', err);
    }
  }

  async function handleCreateBranch() {
    if (!newBranch.name || !newBranch.city || !newBranch.state) return;
    setCreating(true);
    try {
      await addDoc(collection(db, 'guildBranches'), {
        ...newBranch,
        status: 'active',
        statistics: {
          activeMembers: 0,
          completedQuests: 0,
          trustScore: 0,
          verifiedOutcomesValue: 0
        },
        localHubCoordinator: {
          name: profile?.fullName || 'Unassigned',
          role: profile?.role || 'cityGuildMaster'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        archiveStatus: 'active'
      });
      setShowCreate(false);
      setNewBranch({ name: '', city: '', state: '', country: 'India', description: '', recruitmentStatus: 'open' });
      // Reload branches
      const q = query(collection(db, 'guildBranches'), orderBy('createdAt', 'desc'), limit(50)) as any;
      const snap = await getDocs(q);
      const branchesList: BranchData[] = [];
      snap.docs.forEach(d => {
        const data = d.data() as Record<string, unknown>;
        const stats = data.statistics as Record<string, unknown> | undefined;
        const coordinator = data.localHubCoordinator as Record<string, unknown> | undefined;
        branchesList.push({
          id: d.id,
          name: String(data.name || ''),
          city: String(data.city || ''),
          state: String(data.state || ''),
          country: String(data.country || ''),
          description: String(data.description || ''),
          status: String(data.status || 'inactive'),
          recruitmentStatus: String(data.recruitmentStatus || 'closed'),
          statistics: {
            activeMembers: Number(stats?.activeMembers) || 0,
            completedQuests: Number(stats?.completedQuests) || 0,
            trustScore: Number(stats?.trustScore) || 0,
            verifiedOutcomesValue: Number(stats?.verifiedOutcomesValue) || 0
          },
          localHubCoordinator: {
            name: String(coordinator?.name || ''),
            role: String(coordinator?.role || ''),
            photoURL: coordinator?.photoURL as string | undefined
          },
          createdAt: data.createdAt
        });
      });
      setBranches(branchesList);
    } catch (err) {
      console.error('Create failed:', err);
    } finally {
      setCreating(false);
    }
  }

  // Branch Request processing
  async function handleApproveRequest(requestId: string, branchName: string, branchCode: string) {
    setProcessing(true);
    try {
      const result = await approveBranchRequest(requestId, branchName, branchCode, undefined, undefined, profile?.uid);
      setBranchRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedRequest(null);

      // Show success notification with auto-assignment counts
      alert(`Branch created! Auto-assigned ${result.usersAssigned} members and ${result.organizationsAssigned} organizations to the new branch.`);

      // Reload branches
      async function reloadBranches() {
        const q = query(collection(db, 'guildBranches'), orderBy('createdAt', 'desc'), limit(50)) as any;
        const snap = await getDocs(q);
        const branchesList: BranchData[] = [];
        snap.docs.forEach(d => {
          const data = d.data() as Record<string, unknown>;
          const stats = data.statistics as Record<string, unknown> | undefined;
          const coordinator = data.localHubCoordinator as Record<string, unknown> | undefined;
          branchesList.push({
            id: d.id,
            name: String(data.name || ''),
            city: String(data.city || ''),
            state: String(data.state || ''),
            country: String(data.country || ''),
            description: String(data.description || ''),
            status: String(data.status || 'inactive'),
            recruitmentStatus: String(data.recruitmentStatus || 'closed'),
            statistics: {
              activeMembers: Number(stats?.activeMembers) || 0,
              completedQuests: Number(stats?.completedQuests) || 0,
              trustScore: Number(stats?.trustScore) || 0,
              verifiedOutcomesValue: Number(stats?.verifiedOutcomesValue) || 0
            },
            localHubCoordinator: {
              name: String(coordinator?.name || ''),
              role: String(coordinator?.role || ''),
              photoURL: coordinator?.photoURL as string | undefined
            },
            createdAt: data.createdAt
          });
        });
        setBranches(branchesList);
      }
      reloadBranches();
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setProcessing(false);
    }
  }

  async function handleRejectRequest(requestId: string) {
    setProcessing(true);
    try {
      await rejectBranchRequest(requestId, profile?.uid);
      setBranchRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedRequest(null);
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setProcessing(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Federation Control</p>
          <h1>Branch Management</h1>
          <p className="text-[var(--text-secondary)]">
            Manage guild chapters, coordinators, and regional operations.
          </p>
        </div>

        <div className="flex gap-2">
          {canManageBranch && branchRequests.length > 0 && (
            <button
              onClick={() => setActiveTab(activeTab === 'branches' ? 'requests' : 'branches')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                activeTab === 'requests'
                  ? 'bg-[var(--primary)] text-black'
                  : 'border border-[var(--border)] hover:border-[var(--primary)]/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              Requests
              <span className="bg-amber-500 text-black text-xs px-1.5 rounded-full">{branchRequests.length}</span>
            </button>
          )}
          {canManageBranch && (
            <button onClick={() => setShowCreate(true)} className="primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Branch
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {canManageBranch && branchRequests.length > 0 && (
        <div className="flex gap-1 p-1 bg-[var(--card-subtle)] rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'branches'
                ? 'bg-[var(--card)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Branches
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-[var(--card)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Requests
            <span className="bg-amber-500 text-black text-xs px-1.5 rounded-full">{branchRequests.length}</span>
          </button>
          <button
            onClick={async () => {
              setActiveTab('audit');
              if (auditMode === 'loading') {
                const users = await findUsersWithoutBranch();
                const orgs = await findOrganizationsWithoutBranch();
                setOrphanUsers(users);
                setOrphanOrgs(orgs);
                setAuditMode('ready');
              }
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-[var(--card)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Data Audit
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Branch Grid or Requests Queue */}
      {activeTab === 'requests' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Pending branch requests require approval to activate new local chapters.
            </p>
          </div>

          {requestsLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
              <p className="text-sm text-[var(--text-muted)]">Loading requests...</p>
            </div>
          ) : branchRequests.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending branch requests</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {branchRequests.map(request => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`panel p-5 rounded-xl border text-left transition-all hover:border-[var(--primary)]/50 ${
                    selectedRequest?.id === request.id ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Building className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">The Guild - {request.requestedCity}</h3>
                      <p className="text-xs text-[var(--text-muted)]">{request.requestedState}, {request.requestedCountry}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                      <Calendar size={12} /> {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Clock size={12} /> Pending
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
            <p className="text-sm text-[var(--text-muted)]">Loading branches...</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No branches found</p>
            {search && <button onClick={() => setSearch('')} className="text-xs text-[var(--primary)] mt-2">Clear search</button>}
          </div>
        ) : (
          filteredBranches.map(branch => (
            <button
              key={branch.id}
              onClick={() => setSelectedBranch(branch)}
              className={`panel p-5 rounded-xl border text-left transition-all hover:border-[var(--primary)]/50 ${
                selectedBranch?.id === branch.id ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{branch.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{branch.city}, {branch.state}</p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4">
                {branch.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Users size={12} /> {branch.statistics?.activeMembers || 0} members
                </div>
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Trophy size={12} /> {branch.statistics?.completedQuests || 0} quests
                </div>
                <div className="flex items-center gap-1 text-emerald-500">
                  <TrendingUp size={12} /> {branch.statistics?.trustScore || 0}% trust
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <ShieldCheck size={12} /> ₹{(branch.statistics?.verifiedOutcomesValue || 0).toLocaleString()}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      )}

      {/* Data Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Data Integrity Audit - Find entities without branch assignment.
            </p>
          </div>

          {auditMode === 'loading' ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
              <p className="text-sm text-[var(--text-muted)]">Running audit...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Orphan Users */}
              <div className="panel p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Users Without Branch
                  <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">{orphanUsers.length}</span>
                </h3>
                {orphanUsers.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">All users have branch assignments.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanUsers.map(u => (
                      <div key={u.uid} className="text-sm p-2 rounded bg-[var(--card-subtle)] flex justify-between">
                        <span>{u.fullName}</span>
                        <span className="text-xs text-[var(--text-muted)]">{u.jurisdiction?.cityName || 'No jurisdiction'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Orphan Organizations */}
              <div className="panel p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Organizations Without Branch
                  <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">{orphanOrgs.length}</span>
                </h3>
                {orphanOrgs.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">All organizations have branch assignments.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanOrgs.map(o => (
                      <div key={o.id} className="text-sm p-2 rounded bg-[var(--card-subtle)] flex justify-between">
                        <span>{o.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{o.city || 'No city'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-xl font-bold">Create New Branch</h2>
              <button onClick={() => setShowCreate(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">Branch Name</label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={e => setNewBranch(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. The Guild - Amritsar"
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">City</label>
                  <input
                    type="text"
                    value={newBranch.city}
                    onChange={e => setNewBranch(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g. Amritsar"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">State</label>
                  <input
                    type="text"
                    value={newBranch.state}
                    onChange={e => setNewBranch(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="e.g. Punjab"
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">Description</label>
                <textarea
                  value={newBranch.description}
                  onChange={e => setNewBranch(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the branch's focus and mission..."
                  className="input w-full min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">Recruitment Status</label>
                <select
                  value={newBranch.recruitmentStatus}
                  onChange={e => setNewBranch(prev => ({ ...prev, recruitmentStatus: e.target.value }))}
                  className="input w-full"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="selective">Selective</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="secondary">Cancel</button>
              <button
                onClick={handleCreateBranch}
                disabled={creating || !newBranch.name || !newBranch.city || !newBranch.state}
                className="primary"
              >
                {creating ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Detail Panel */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedBranch.name}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{selectedBranch.city}, {selectedBranch.state}, {selectedBranch.country}</p>
                </div>
                <button onClick={() => setSelectedBranch(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]">
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">{selectedBranch.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <Users className="w-4 h-4 mx-auto text-[var(--primary)] mb-1" />
                  <div className="text-lg font-black">{selectedBranch.statistics?.activeMembers || 0}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Members</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <Trophy className="w-4 h-4 mx-auto text-[var(--primary)] mb-1" />
                  <div className="text-lg font-black">{selectedBranch.statistics?.completedQuests || 0}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Quests</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                  <div className="text-lg font-black">{selectedBranch.statistics?.trustScore || 0}%</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Trust</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <ShieldCheck className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <div className="text-lg font-black">₹{(selectedBranch.statistics?.verifiedOutcomesValue || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Value</div>
                </div>
              </div>

              {/* Coordinator */}
              <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3">Branch Coordinator</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold">
                    {selectedBranch.localHubCoordinator?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-bold">{selectedBranch.localHubCoordinator?.name || 'Unassigned'}</div>
                    <div className="text-xs text-[var(--text-muted)]">{selectedBranch.localHubCoordinator?.role}</div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">Recruitment Status</div>
                <div className="text-sm text-[var(--text-secondary)]">{selectedBranch.recruitmentStatus}</div>
              </div>

              {/* Actions for authorized */}
              {canManageBranch && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditing(selectedBranch)}
                    className="secondary flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit Branch
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branch Request Detail Panel */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">The Guild - {selectedRequest.requestedCity}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{selectedRequest.requestedState}, {selectedRequest.requestedCountry}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]">
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Requested City</div>
                  <div>{selectedRequest.requestedCity}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Requested State</div>
                  <div>{selectedRequest.requestedState}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Requested Country</div>
                  <div>{selectedRequest.requestedCountry}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Requested On</div>
                  <div>{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Notes</div>
                  <div className="p-3 rounded-lg bg-[var(--card-subtle)] text-sm">{selectedRequest.notes}</div>
                </div>
              )}

              {/* Approval Form */}
              <div className="p-4 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-4">Create Branch</div>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Approving will create a new branch and automatically assign any pending members in this location.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRejectRequest(selectedRequest.id)}
                    disabled={processing}
                    className="secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleApproveRequest(selectedRequest.id, `The Guild - ${selectedRequest.requestedCity}`, `${selectedRequest.requestedCity?.slice(0, 3).toUpperCase()}-001` || 'GUILD-001')}
                    disabled={processing}
                    className="primary flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> {processing ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}