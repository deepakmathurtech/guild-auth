import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, limit, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Organization, GuildUser } from '../../types/guild';
import { StatusBadge } from '../../components/StatusBadge';
import { OrganizationCreateForm } from './OrganizationCreateForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Check, AlertTriangle, Crown, Shield, Building2, Globe, MapPin, Phone, ArrowUpRight, Plus, Search, Filter, UserCheck, Activity, Award, TrendingUp, Clock, Users } from 'lucide-react';

type OrgQuery = {
  searchText: string;
  category: '' | Organization['category'];
  status: '' | Organization['currentStatus'];
  receptionist: '' | string;
  branch: '' | string;
  trust: '' | Organization['trustLevel'];
  verification: '' | Organization['verificationStatus'];
};

const CATEGORIES = ['Business', 'NGO', 'College', 'Contractor', 'Community Group', 'Government Related'] as const;
const STATUSES = ['new', 'contacted', 'active', 'partner', 'inactive'] as const;
const TRUST_LEVELS = ['new', 'verified', 'trusted', 'partner'] as const;

function computeOrganizationHealth(org: Organization): number {
  let score = 50;
  if (org.currentStatus === 'active') score += 20;
  if (org.currentStatus === 'partner') score += 30;
  if (org.verificationStatus === 'verified') score += 10;
  if (org.trustLevel === 'trusted') score += 10;
  if (org.trustLevel === 'partner') score += 10;
  if (org.lastContactAt) {
    const daysSince = (Date.now() - new Date(org.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 10;
    else if (daysSince > 30) score -= 20;
  }
  return Math.min(100, Math.max(0, score));
}

export function OrganizationListPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [receptionists, setReceptionists] = useState<GuildUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState<OrgQuery>({
    searchText: '',
    category: '',
    status: '',
    receptionist: '',
    branch: '',
    trust: '',
    verification: ''
  });

  // Assignment modal state
  const [assignModal, setAssignModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedReceptionist, setSelectedReceptionist] = useState<string>('');
  const [selectedGuildMaster, setSelectedGuildMaster] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Create organization modal (for receptionists)
  const location = useLocation();
  const [showCreate, setShowCreate] = useState((location.state as any)?.showCreate === true);

  useEffect(() => {
    if (!profile) return;

    async function fetchOrganizations() {
      if (!profile) return;

      try {
        // NOTE: Firestore requires composite indexes for where + orderBy queries
        // Fetch simple data and filter/sort in memory instead of requiring index
        const snap = await getDocs(query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'), limit(500)));
        let orgs = snap.docs.map(d => ({ id: d.id, ...d.data() as any })) as Organization[];

        // Receptionists see only their assigned organizations
        if (profile.role === 'receptionist') {
          orgs = orgs.filter((o: any) => o.assignedReceptionistId === profile.uid);
        }
        // Other users: filter by jurisdiction
        else if (!['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) {
          if (profile.role === 'stateGuildMaster') {
            orgs = orgs.filter((o: any) => o.jurisdiction?.stateId === profile.jurisdiction.stateId);
          } else {
            orgs = orgs.filter((o: any) => o.jurisdiction?.cityId === profile.jurisdiction.cityId);
          }
        }

        // Sort by updatedAt desc in memory
        orgs.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

        setOrganizations(orgs.slice(0, 200));
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    fetchOrganizations();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    async function loadReceptionists() {
      const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster']), limit(100)));
      setReceptionists(snap.docs.map(d => ({ uid: d.id, ...d.data() as any })) as GuildUser[]);
    }
    loadReceptionists();
  }, [profile]);

  const visible = useMemo(() => {
    // Apply filters step by step
    let result = organizations;

    if (q.category) {
      result = result.filter(o => o.category === q.category);
    }
    if (q.status) {
      result = result.filter(o => o.currentStatus === q.status);
    }
    if (q.trust) {
      result = result.filter(o => o.trustLevel === q.trust);
    }
    if (q.verification) {
      result = result.filter(o => o.verificationStatus === q.verification);
    }
    if (q.receptionist) {
      result = result.filter(o => o.assignedReceptionistId === q.receptionist);
    }

    // Search filter
    if (q.searchText.trim()) {
      const s = q.searchText.toLowerCase();
      result = result.filter(org => {
        const haystack = `${org.name || ''} ${org.city || ''} ${org.category || ''} ${org.description || ''} ${org.industry || ''} ${org.contactPerson || ''}`.toLowerCase();
        return haystack.includes(s);
      });
    }

    return result;
  }, [organizations, q]);

  async function handleAssignReceptionist() {
    if (!selectedOrg || !selectedReceptionist) return;
    setAssigning(true);
    try {
      await updateDoc(doc(db, 'organizations', selectedOrg.id), {
        assignedReceptionistId: selectedReceptionist,
        updatedAt: serverTimestamp()
      });
      setAssignModal(false);
      setSelectedOrg(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  }

  const canManage = ['founder', 'guildFounder', 'centralGuildMaster', 'stateGuildMaster', 'cityGuildMaster'].includes(profile?.role || '');

  return (
    <div className="space-y-8 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Partnership Management</p>
          <h1>{profile?.role === 'receptionist' ? 'My Organizations' : 'Organizations Directory'}</h1>
          <p className="text-[var(--text-secondary)] max-w-lg">
            {profile?.role === 'receptionist' ? 'Organizations assigned to you. Register new organizations with valid credentials.' : 'Track and manage relationships. Search by name, category, receptionist, trust, and verification status.'}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input className="pl-10" placeholder="Search organizations by name, category, or city..." value={q.searchText} onChange={e => setQ(prev => ({ ...prev, searchText: e.target.value }))} />
          </div>
          <button className={`secondary ${showFilters ? 'bg-[var(--primary)] text-black' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" /> Filters
          </button>
          {profile?.role === 'receptionist' && (
            <button className="primary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New Organization
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 panel rounded-xl">
            <select value={q.category} onChange={e => setQ(prev => ({ ...prev, category: e.target.value as any }))} className="input">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={q.status} onChange={e => setQ(prev => ({ ...prev, status: e.target.value as any }))} className="input">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={q.trust} onChange={e => setQ(prev => ({ ...prev, trust: e.target.value as any }))} className="input">
              <option value="">All Trust</option>
              {TRUST_LEVELS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={q.verification} onChange={e => setQ(prev => ({ ...prev, verification: e.target.value as any }))} className="input">
              <option value="">All Verification</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={q.receptionist} onChange={e => setQ(prev => ({ ...prev, receptionist: e.target.value }))} className="input">
              <option value="">All Receptionists</option>
              {receptionists.filter(r => r.role === 'receptionist').map(r => (
                <option key={r.uid} value={r.uid}>{r.fullName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Organizations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel p-5 rounded-xl border border-[var(--border)]">
              <div className="h-4 bg-[var(--card-subtle)] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[var(--card-subtle)] rounded w-1/2" />
            </div>
          ))
        ) : visible.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No organizations found</p>
          </div>
        ) : (
          visible.map(org => {
            const health = computeOrganizationHealth(org);
            const assignedReceptionist = receptionists.find(r => r.uid === org.assignedReceptionistId);
            return (
              <div key={org.id} className="panel p-5 rounded-xl border hover:border-[var(--primary)]/50 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{org.name}</p>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {org.city}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${health >= 70 ? 'text-emerald-500' : health >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {health}%
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">Health</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="role-pill">{org.category}</span>
                  <StatusBadge status={org.currentStatus} />
                  {org.trustLevel && <span className={`badge ${org.trustLevel === 'partner' ? 'badge-purple' : org.trustLevel === 'trusted' ? 'badge-green' : 'badge-gray'}`}>{org.trustLevel}</span>}
                </div>

                <div className="text-xs text-[var(--text-muted)] space-y-1 mb-3">
                  {assignedReceptionist && (
                    <div className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {assignedReceptionist.fullName}</div>
                  )}
                  <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {org.contactPerson}</div>
                  {org.lastContactAt && (
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last contact: {new Date(org.lastContactAt).toLocaleDateString()}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="secondary !py-2 !px-3 text-xs flex-1" onClick={() => navigate(`/organizations/${org.id}`)}>
                    View <ArrowUpRight className="w-3 h-3" />
                  </button>
                  {canManage && (
                    <button className="secondary !py-2 !px-3 text-xs" onClick={() => { setSelectedOrg(org); setAssignModal(true); }}>
                      <Crown className="w-3 h-3" /> Assign
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assignment Modal (PHASE 4 & 5) */}
      {assignModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl animate-fade-up">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-xl font-bold">Assign Organization</h2>
              <button onClick={() => setAssignModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="panel p-4 rounded-xl bg-[var(--card-subtle)]">
                <p className="font-bold">{selectedOrg.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{selectedOrg.category} - {selectedOrg.city}</p>
              </div>

              {/* Receptionist Cards (PHASE 4) */}
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Select Receptionist</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {receptionists.filter(r => r.role === 'receptionist').map(r => {
                    const orgsManaged = organizations.filter(o => o.assignedReceptionistId === r.uid).length;
                    return (
                      <button key={r.uid} onClick={() => setSelectedReceptionist(r.uid)}
                        className={`p-3 rounded-xl border text-left transition-all ${selectedReceptionist === r.uid ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'hover:border-[var(--primary)]/50'}`}>
                        <p className="font-bold text-sm">{r.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{orgsManaged} organizations</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guild Master Cards (PHASE 5) */}
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-2"><Crown className="w-4 h-4" /> Guild Master Assignment</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {receptionists.filter(r => r.role?.includes('GuildMaster')).map(r => {
                    return (
                      <button key={r.uid} onClick={() => setSelectedGuildMaster(r.uid)}
                        className={`p-3 rounded-xl border text-left transition-all ${selectedGuildMaster === r.uid ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'hover:border-[var(--primary)]/50'}`}>
                        <p className="font-bold text-sm">{r.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{roleLabels[r.role]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="primary flex-1" onClick={handleAssignReceptionist} disabled={assigning || !selectedReceptionist}>
                  {assigning ? 'Assigning...' : <><Check className="w-4 h-4" /> Confirm Assignment</>}
                </button>
                <button className="secondary" onClick={() => setAssignModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal (for receptionists) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <OrganizationCreateForm
              onSuccess={() => {
                setShowCreate(false);
                // Clear the location state to prevent re-opening on navigate back
                navigate('.', { replace: true });
              }}
              onCancel={() => {
                setShowCreate(false);
                navigate('.', { replace: true });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const roleLabels: Record<string, string> = {
  cityGuildMaster: 'City Guild Master',
  stateGuildMaster: 'State Guild Master',
  centralGuildMaster: 'Central Guild Master',
  nationalGuildMaster: 'National Guild Master',
};