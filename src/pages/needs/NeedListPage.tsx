import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Need } from '../../types/guild';
import { NeedCreateForm } from './NeedCreateForm';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { Plus, Search, Filter, Flag, Building2, IndianRupee, ArrowUpRight, AlertCircle } from 'lucide-react';

export function NeedListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [needs, setNeeds] = useState<Need[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.orgId ? true : false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [myNeedsOnly, setMyNeedsOnly] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Simple query without orderBy to avoid needing composite index
    // We filter/sort client-side instead
    return subscribeRecords('needs', setNeeds, [
      where('archiveStatus', '==', 'active'),
      limit(200)
    ]);
  }, [profile]);

  const visible = useMemo(() => {
    if (!profile) return [];

    // Debug logging
    console.log('[NeedList] Total needs loaded:', needs.length);
    console.log('[NeedList] Profile uid:', profile.uid);
    console.log('[NeedList] Profile role:', profile.role);
    console.log('[NeedList] Profile jurisdiction:', profile.jurisdiction);

    // Role definitions
    const nationalRoles = ['guildFounder', 'centralGuildMaster', 'founder', 'nationalGuildMaster'];
    const stateRoles = ['stateGuildMaster'];
    const cityRoles = ['cityGuildMaster', 'receptionist', 'growthRepresentative'];

    // National roles see ALL needs
    if (nationalRoles.includes(profile.role)) {
      console.log('[NeedList] Showing all needs (national role)');
      return needs;
    }

    return needs.filter(need => {
      const assignedToMe = need.assignedReceptionistId === profile.uid;
      const createdByMe = need.createdBy === profile.uid;
      const isUnassigned = !need.assignedReceptionistId;

      // Match by jurisdiction level
      const inMyState = need.jurisdiction?.stateId === profile.jurisdiction?.stateId;
      const inMyCity = need.jurisdiction?.cityId === profile.jurisdiction?.cityId;

      console.log('[NeedList] Checking need:', {
        id: need.id,
        title: need.title,
        assignedReceptionistId: need.assignedReceptionistId,
        createdBy: need.createdBy,
        needStateId: need.jurisdiction?.stateId,
        needCityId: need.jurisdiction?.cityId,
        assignedToMe,
        createdByMe,
        isUnassigned,
        inMyState,
        inMyCity
      });

      // State Guild Master: see needs in their state OR assigned/created/unassigned
      if (stateRoles.includes(profile.role)) {
        const visible = inMyState || assignedToMe || createdByMe || isUnassigned;
        console.log('[NeedList] State GM filter:', visible);
        return visible;
      }

      // City Guild Master: see needs in their city OR assigned/created/unassigned
      if (cityRoles.includes(profile.role)) {
        const visible = inMyCity || assignedToMe || createdByMe || isUnassigned;
        console.log('[NeedList] City GM/Receptionist filter:', visible);
        return visible;
      }

      // Default: show assigned to me OR created by me OR unassigned
      return assignedToMe || createdByMe || isUnassigned;
    });
  }, [needs, profile]);

  return (
    <div className="space-y-8 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Intake Pipeline</p>
          <h1>Needs Management</h1>
          <p className="text-[var(--text-secondary)] max-w-lg">
            Capture and process organizational requirements. Convert verified needs into guild opportunities.
          </p>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Portal' : <><Plus className="w-4 h-4" /> Log New Need</>}
        </button>
      </div>

      {showCreate && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <NeedCreateForm 
            initialOrgId={location.state?.orgId} 
            initialOrgName={location.state?.orgName}
            onSuccess={() => { setShowCreate(false); navigate('.', { replace: true, state: {} }); }} 
            onCancel={() => setShowCreate(false)} 
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              className="pl-10" 
              placeholder="Search by need title or organization..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="md:w-48"
            >
              <option value="">All Statuses</option>
              <option>open</option>
              <option>matching</option>
              <option>assigned</option>
              <option>inProgress</option>
              <option>completed</option>
            </select>
            <button
              onClick={() => setMyNeedsOnly(!myNeedsOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${myNeedsOnly ? 'bg-[var(--primary)] text-black border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50'}`}
            >
              {myNeedsOnly ? 'My Needs' : 'All Needs'}
            </button>
          </div>
        </div>

        {/* List View */}
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th className="pl-6">Need Title</th>
                <th>Organization</th>
                <th>Priority</th>
                <th>Operational Status</th>
                <th>Estimated Value</th>
                <th className="pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map(need => (
                <tr key={need.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                  <td className="pl-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                        <Flag className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text)]">{need.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">{need.city || 'General Need'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {need.organizationName}
                    </p>
                  </td>
                  <td>
                    <span className={`badge priority-${need.priority} !border-none !rounded-md`}>
                      {need.priority}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={need.status} />
                  </td>
                  <td>
                    <p className="text-sm font-bold text-[var(--text)] flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> {Number(need.estimatedValue || 0).toLocaleString('en-IN')}
                    </p>
                  </td>
                  <td className="pr-6 text-right">
                    <button 
                      className="secondary !py-2 !px-4 text-xs group-hover:bg-[var(--primary)] group-hover:text-black group-hover:border-[var(--primary)] transition-all" 
                      onClick={() => navigate(`/needs/${need.id}`)}
                    >
                      Process <ArrowUpRight className="w-3 h-3 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {visible.length === 0 && (
            <div className="p-10 border-t border-[var(--border)]">
              <EmptyState 
                title="No Needs Identified" 
                description={search || statusFilter ? "No needs match your current criteria. Broaden your search parameters." : "Log a need when an organization identifies a requirement that the Guild can fulfill."}
                icon={<Flag className="w-8 h-8 opacity-40" />}
                action={!search && !statusFilter && (
                  <button className="primary" onClick={() => setShowCreate(true)}>
                    Log New Need
                  </button>
                )} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

