import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { getBranchesGroupedByState, syncAllBranchCounts, createBranchRequest, type StateGroup } from '../services/branchService';
import type { GuildUser, Organization, Branch, Jurisdiction } from '../types/guild';
import { Search, MapPin, Users, Building, ChevronRight, X, RefreshCw, Crown, Shield, ArrowLeft, UserCheck, Mail, Phone, Award, Activity, Plus, UserPlus, Send, AlertCircle } from 'lucide-react';

type ViewLevel = 'country' | 'state' | 'city' | 'entity';

export default function HierarchicalBranchesPage() {
  const { profile } = useAuth();
  const [states, setStates] = useState<StateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('state');
  const [selectedState, setSelectedState] = useState<StateGroup | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Entity details
  const [branchEntities, setBranchEntities] = useState<{
    members: GuildUser[];
    organizations: Organization[];
    receptionists: GuildUser[];
  }>({ members: [], organizations: [], receptionists: [] });
  const [selectedEntity, setSelectedEntity] = useState<GuildUser | Organization | null>(null);

  // Entity tabs - must be at top level!
  const entityTabs = ['members', 'organizations', 'receptionists'] as const;
  const [activeEntityTab, setActiveEntityTab] = useState<typeof entityTabs[number]>('members');

  // All data loaded at once for branch detail
  const [allUsers, setAllUsers] = useState<GuildUser[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Unassigned entities
  const [unassignedUsers, setUnassignedUsers] = useState<GuildUser[]>([]);
  const [unassignedOrgs, setUnassignedOrgs] = useState<Organization[]>([]);

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningType, setAssigningType] = useState<'user' | 'organization' | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Branch Request modal (for non-managers to request new branch)
  const [showRequestBranchModal, setShowRequestBranchModal] = useState(false);
  const [branchRequestForm, setBranchRequestForm] = useState({
    city: '',
    state: '',
    country: 'India',
    notes: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const canManage = profile && ['founder', 'guildFounder', 'centralGuildMaster', 'stateGuildMaster'].includes(profile.role);

  useEffect(() => {
    loadAllData();
  }, []);

  // Load ALL data at once - branches + users + orgs
  async function loadAllData() {
    setLoading(true);
    try {
      // Load branches grouped by state
      const data = await getBranchesGroupedByState();
      setStates(data);

      // Load ALL users and orgs in one go (filter in memory)
      const [usersSnap, orgsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'))),
        getDocs(query(collection(db, 'organizations')))
      ]);

      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));
      const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));

      setAllUsers(users);
      setAllOrgs(orgs);

      // Find unassigned (no branchId)
      setUnassignedUsers(users.filter(u => !u.branchId));
      setUnassignedOrgs(orgs.filter(o => !o.branchId));

      setDataLoaded(true);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectState(state: StateGroup) {
    setSelectedState(state);
    setViewLevel('state');
  }

  async function handleSelectBranch(branch: Branch) {
    setSelectedBranch(branch);
    setViewLevel('city');

    // Filter from locally loaded data (already fetched once)
    const branchId = branch.id;
    const memberRoles = ['member', 'applicant', 'organizationRepresentative'];

    const members = allUsers.filter(u => u.branchId === branchId && memberRoles.includes(u.role || ''));
    const receptionists = allUsers.filter(u => u.branchId === branchId && u.role === 'receptionist');
    const organizations = allOrgs.filter(o => o.branchId === branchId);

    setBranchEntities({ members, organizations, receptionists });
  }

  async function handleSyncCounts() {
    setLoading(true);
    try {
      await syncAllBranchCounts();
      await loadAllData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setLoading(false);
    }
  }

  // Assign user to branch
  async function assignUserToBranch(userId: string, branchId: string) {
    setAssigning(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        branchId,
        updatedAt: new Date().toISOString()
      });
      await loadAllData();
      setSelectedEntity(null);
      setShowAssignModal(false);
    } catch (err) {
      console.error('Failed to assign user:', err);
    } finally {
      setAssigning(false);
    }
  }

  // Assign organization to branch
  async function assignOrgToBranch(orgId: string, branchId: string) {
    setAssigning(true);
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        branchId,
        updatedAt: new Date().toISOString()
      });
      await loadAllData();
      setSelectedEntity(null);
      setShowAssignModal(false);
    } catch (err) {
      console.error('Failed to assign org:', err);
    } finally {
      setAssigning(false);
    }
  }

  // Submit branch request
  async function handleSubmitBranchRequest() {
    if (!branchRequestForm.city || !branchRequestForm.state) return;
    setSubmittingRequest(true);
    try {
      const jurisdiction: Jurisdiction = {
        cityId: branchRequestForm.city.toLowerCase().replace(/\s+/g, '-'),
        cityName: branchRequestForm.city,
        stateId: branchRequestForm.state.toLowerCase().replace(/\s+/g, '-'),
        stateName: branchRequestForm.state,
        countryId: branchRequestForm.country.toLowerCase().replace(/\s+/g, '-'),
        countryName: branchRequestForm.country
      };
      await createBranchRequest(jurisdiction, profile?.uid, undefined, branchRequestForm.notes);
      alert('Branch request submitted! Founders will review your request.');
      setShowRequestBranchModal(false);
      setBranchRequestForm({ city: '', state: '', country: 'India', notes: '' });
    } catch (err) {
      console.error('Failed to submit request:', err);
    } finally {
      setSubmittingRequest(false);
    }
  }

  // Get branches list for assignment dropdown
  const allBranches = useMemo(() => {
    return states.flatMap(s => s.branches);
  }, [states]);

  // Filter users/orgs without branch (members, applicants, receptionists)
  const pendingUsers = unassignedUsers.filter(u =>
    u.role === 'member' || u.role === 'applicant' || u.role === 'receptionist'
  );
  const pendingReceptionists = unassignedUsers.filter(u => u.role === 'receptionist');
  const pendingOrgs = unassignedOrgs;

  // Unassigned entities tabs
  const [unassignedTab, setUnassignedTab] = useState<'users' | 'organizations'>('users');

  const filteredStates = useMemo(() => {
    if (!search) return states;
    const s = search.toLowerCase();
    return states.filter(st =>
      st.stateName.toLowerCase().includes(s) ||
      st.branches.some(b => b.name.toLowerCase().includes(s) || b.cityName.toLowerCase().includes(s))
    );
  }, [states, search]);

  // ========== RENDER: STATE VIEW ==========
  if (viewLevel === 'state' && selectedState) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => { setSelectedState(null); setViewLevel('country'); }} className="ghost flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <p className="eyebrow">State Report</p>
            <h1>{selectedState.stateName}</h1>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="panel p-4 rounded-xl text-center">
            <Users className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
            <div className="text-2xl font-black">{selectedState.totalMembers}</div>
            <div className="text-xs text-[var(--text-muted)]">Members</div>
          </div>
          <div className="panel p-4 rounded-xl text-center">
            <Building className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
            <div className="text-2xl font-black">{selectedState.totalOrganizations}</div>
            <div className="text-xs text-[var(--text-muted)]">Organizations</div>
          </div>
          <div className="panel p-4 rounded-xl text-center">
            <Crown className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <div className="text-2xl font-black">{selectedState.totalReceptionists}</div>
            <div className="text-xs text-[var(--text-muted)]">Receptionists</div>
          </div>
          <div className="panel p-4 rounded-xl text-center">
            <MapPin className="w-5 h-5 mx-auto text-[var(--primary)] mb-1" />
            <div className="text-2xl font-black">{selectedState.branches.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Branches</div>
          </div>
        </div>

        <h2 className="text-lg font-bold">City Branches</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedState.branches.map(branch => (
            <button
              key={branch.id}
              onClick={() => handleSelectBranch(branch)}
              className="panel p-5 rounded-xl border text-left hover:border-[var(--primary)]/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-bold">{branch.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{branch.cityName}</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Users size={12} /> {branch.memberCount || 0}</span>
                <span className="flex items-center gap-1"><Building size={12} /> {branch.organizationCount || 0}</span>
                <span className="flex items-center gap-1"><Crown size={12} /> {branch.receptionistCount || 0}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========== RENDER: CITY/BRANCH DETAIL VIEW ==========
  if (viewLevel === 'city' && selectedBranch) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => { setSelectedBranch(null); setViewLevel('state'); setSelectedState(null); }} className="ghost flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to States
          </button>
        </div>

        <div className="panel p-6 rounded-xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="eyebrow">Branch Report</p>
              <h1>{selectedBranch.name}</h1>
              <p className="text-sm text-[var(--text-muted)]">{selectedBranch.cityName}, {selectedBranch.stateName}</p>
            </div>
            <span className={`badge ${selectedBranch.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{selectedBranch.status}</span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)]">
              <Users className="w-4 h-4 mx-auto text-[var(--primary)] mb-1" />
              <div className="text-xl font-black">{branchEntities.members.length}</div>
              <div className="text-[10px] text-[var(--text-muted)]">Members</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)]">
              <Building className="w-4 h-4 mx-auto text-[var(--primary)] mb-1" />
              <div className="text-xl font-black">{branchEntities.organizations.length}</div>
              <div className="text-[10px] text-[var(--text-muted)]">Orgs</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)]">
              <Crown className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <div className="text-xl font-black">{branchEntities.receptionists.length}</div>
              <div className="text-[10px] text-[var(--text-muted)]">Receptionists</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)]">
              <Award className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
              <div className="text-xl font-black">{selectedBranch.reputationScore || 0}</div>
              <div className="text-[10px] text-[var(--text-muted)]">Reputation</div>
            </div>
          </div>

          {
            branchEntities.members.length === 0 && branchEntities.organizations.length === 0 && branchEntities.receptionists.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <p>Loading...</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 bg-[var(--card-subtle)] rounded-lg w-fit mb-4">
                {entityTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveEntityTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${activeEntityTab === tab ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} ({branchEntities[tab].length})
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {activeEntityTab === 'members' && branchEntities.members.map(u => (
                  <button
                    key={u.uid}
                    onClick={() => setSelectedEntity(u)}
                    className="panel p-3 rounded-lg border text-left hover:border-[var(--primary)]/50 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold text-sm">
                      {u.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{u.fullName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{u.role} • {u.status}</p>
                    </div>
                  </button>
                ))}
                {activeEntityTab === 'organizations' && branchEntities.organizations.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedEntity(o)}
                    className="panel p-3 rounded-lg border text-left hover:border-[var(--primary)]/50 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                      <Building className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{o.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{o.category} • {o.currentStatus}</p>
                    </div>
                  </button>
                ))}
                {activeEntityTab === 'receptionists' && branchEntities.receptionists.map(r => (
                  <button
                    key={r.uid}
                    onClick={() => setSelectedEntity(r)}
                    className="panel p-3 rounded-lg border text-left hover:border-[var(--primary)]/50 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm">
                      {r.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{r.fullName}</p>
                      <p className="text-xs text-[var(--text-muted)]">Receptionist</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Entity Detail Modal */}
        {selectedEntity && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl shadow-xl animate-fade-up">
              <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                <h2 className="text-xl font-bold">{(selectedEntity as GuildUser).fullName || (selectedEntity as Organization).name}</h2>
                <button onClick={() => setSelectedEntity(null)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {'email' in selectedEntity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{(selectedEntity as GuildUser).email}</span>
                  </div>
                )}
                {'phone' in selectedEntity && (selectedEntity as GuildUser).phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{(selectedEntity as GuildUser).phone}</span>
                  </div>
                )}
                {'role' in selectedEntity && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCheck className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="badge badge-blue">{(selectedEntity as GuildUser).role}</span>
                  </div>
                )}
                {'status' in selectedEntity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{(selectedEntity as GuildUser).status}</span>
                  </div>
                )}
                {'category' in selectedEntity && (
                  <div className="p-3 rounded-lg bg-[var(--card-subtle)]">
                    <p className="text-xs text-[var(--text-muted)]">Category</p>
                    <p className="font-bold">{(selectedEntity as Organization).category}</p>
                  </div>
                )}
                {'description' in selectedEntity && (selectedEntity as Organization).description && (
                  <div className="p-3 rounded-lg bg-[var(--card-subtle)]">
                    <p className="text-xs text-[var(--text-muted)]">Description</p>
                    <p className="text-sm">{(selectedEntity as Organization).description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== RENDER: COUNTRY/STATE LIST VIEW ==========
  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Federation Control</p>
          <h1>Branch Network</h1>
          <p className="text-[var(--text-secondary)]">Navigate states and cities to view branch reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRequestBranchModal(true)} className="secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Request Branch
          </button>
          {canManage && (
            <button onClick={handleSyncCounts} disabled={loading} className="secondary flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Counts
            </button>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search states or cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Unassigned Entities Section */}
      {(pendingUsers.length > 0 || pendingOrgs.length > 0) && canManage && (
        <div className="panel p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Unassigned Entities</h3>
            <span className="text-xs text-[var(--text-muted)]">Need branch assignment</span>
          </div>
          <div className="flex gap-1 p-1 bg-[var(--card-subtle)] rounded-lg w-fit mb-3">
            <button
              onClick={() => setUnassignedTab('users')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${unassignedTab === 'users' ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--text-muted)]'}`}
            >
              Users ({pendingUsers.length})
            </button>
            <button
              onClick={() => setUnassignedTab('organizations')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${unassignedTab === 'organizations' ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--text-muted)]'}`}
            >
              Organizations ({pendingOrgs.length})
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {unassignedTab === 'users' && pendingUsers.slice(0, 9).map(u => (
              <button
                key={u.uid}
                onClick={() => { setSelectedEntity(u); setAssigningType('user'); setShowAssignModal(true); }}
                className="panel p-3 rounded-lg border text-left hover:border-[var(--primary)]/50 flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold text-xs">
                  {u.fullName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.fullName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.role}</p>
                </div>
                <UserPlus className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            ))}
            {unassignedTab === 'organizations' && pendingOrgs.slice(0, 9).map(o => (
              <button
                key={o.id}
                onClick={() => { setSelectedEntity(o); setAssigningType('organization'); setShowAssignModal(true); }}
                className="panel p-3 rounded-lg border text-left hover:border-[var(--primary)]/50 flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                  <Building className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{o.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{o.category}</p>
                </div>
                <UserPlus className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
        </div>
      ) : filteredStates.length === 0 ? (
        <div className="p-12 text-center text-[var(--text-muted)]">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No branches found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStates.map(state => (
            <button
              key={state.stateId}
              onClick={() => handleSelectState(state)}
              className="panel p-5 rounded-xl border text-left hover:border-[var(--primary)]/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-bold">{state.stateName}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{state.countryName}</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-[var(--text-muted)]" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-[var(--card-subtle)]">
                  <div className="font-bold">{state.totalMembers}</div>
                  <div className="text-[var(--text-muted)]">Members</div>
                </div>
                <div className="text-center p-2 rounded bg-[var(--card-subtle)]">
                  <div className="font-bold">{state.totalOrganizations}</div>
                  <div className="text-[var(--text-muted)]">Orgs</div>
                </div>
                <div className="text-center p-2 rounded bg-[var(--card-subtle)]">
                  <div className="font-bold">{state.branches.length}</div>
                  <div className="text-[var(--text-muted)]">Cities</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedEntity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl shadow-xl animate-fade-up">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-lg font-bold">Assign to Branch</h2>
              <button onClick={() => { setShowAssignModal(false); setSelectedEntity(null); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 rounded-lg bg-[var(--card-subtle)]">
                <p className="text-xs text-[var(--text-muted)]">Entity</p>
                <p className="font-bold">{(selectedEntity as GuildUser).fullName || (selectedEntity as Organization).name}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Select Branch</label>
                <select
                  className="input"
                  onChange={(e) => {
                    if (e.target.value) {
                      if (assigningType === 'user') {
                        assignUserToBranch((selectedEntity as GuildUser).uid, e.target.value);
                      } else {
                        assignOrgToBranch((selectedEntity as Organization).id, e.target.value);
                      }
                    }
                  }}
                  value=""
                >
                  <option value="">Choose a branch...</option>
                  {allBranches.map(b => (
                    <option key={b.id} value={b.id}>{b.cityName}, {b.stateName}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { setShowAssignModal(false); setSelectedEntity(null); }}
                className="secondary w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Request Modal */}
      {showRequestBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl shadow-xl animate-fade-up">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-lg font-bold">Request New Branch</h2>
              <button onClick={() => setShowRequestBranchModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  If no branch exists in your city, submit a request for founders to create one.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">City</label>
                <input
                  type="text"
                  value={branchRequestForm.city}
                  onChange={(e) => setBranchRequestForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g. Amritsar"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">State</label>
                <input
                  type="text"
                  value={branchRequestForm.state}
                  onChange={(e) => setBranchRequestForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="e.g. Punjab"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">Notes (Optional)</label>
                <textarea
                  value={branchRequestForm.notes}
                  onChange={(e) => setBranchRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Why do you need a branch in this city?"
                  className="input w-full min-h-[60px]"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRequestBranchModal(false)} className="secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBranchRequest}
                  disabled={submittingRequest || !branchRequestForm.city || !branchRequestForm.state}
                  className="primary flex-1 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submittingRequest ? 'Sending...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}