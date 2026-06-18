import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Opportunity } from '../../types/guild';
import { OpportunityCreateForm } from './OpportunityCreateForm';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { Plus, Search, Sparkles, Users, IndianRupee, ArrowUpRight, Target } from 'lucide-react';

export function OpportunityListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showCreate, setShowCreate] = useState(Boolean(location.state?.needId || location.state?.showCreate));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!profile) return;
    const base = [where('archiveStatus', '==', 'active')];
    if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) {
       // National see all
    } else if (profile.role === 'stateGuildMaster') {
       base.push(where('jurisdiction.stateId', '==', profile.jurisdiction.stateId));
    } else {
       base.push(where('jurisdiction.cityId', '==', profile.jurisdiction.cityId));
    }

    return subscribeRecords('opportunities', setOpportunities, [
      ...base,
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, [profile]);

  const visible = useMemo(() => {
    return opportunities.filter(opp => {
      if (statusFilter && opp.status !== statusFilter) return false;
      if (search && !opp.title.toLowerCase().includes(search.toLowerCase()) && !opp.organizationName?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [opportunities, search, statusFilter]);

  return (
    <div className="space-y-8 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Work Pipeline</p>
          <h1>Guild Opportunities</h1>
          <p className="text-[var(--text-secondary)] max-w-lg">
            Turn validated needs into assignable work. Match opportunities with skilled guild members.
          </p>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Portal' : <><Plus className="w-4 h-4" /> Create Opportunity</>}
        </button>
      </div>

      {showCreate && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <OpportunityCreateForm 
            initialData={location.state}
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
              placeholder="Search by title or organization..." 
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
              <option>draft</option>
              <option>open</option>
              <option>matching</option>
              <option>assigned</option>
              <option>inProgress</option>
              <option>completed</option>
            </select>
          </div>
        </div>

        {/* List View */}
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th className="pl-6">Opportunity Title</th>
                <th>Classification</th>
                <th>Personnel</th>
                <th>Status</th>
                <th>Est. Revenue</th>
                <th className="pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map(opp => (
                <tr key={opp.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                  <td className="pl-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text)]">{opp.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{opp.organizationName}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="role-pill">{opp.category}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {opp.assignedMembers?.length || 0} Members
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={opp.status} />
                  </td>
                  <td>
                    <p className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> {Number(opp.estimatedRevenue || 0).toLocaleString('en-IN')}
                    </p>
                  </td>
                  <td className="pr-6 text-right">
                    <button 
                      className="secondary !py-2 !px-4 text-xs group-hover:bg-[var(--primary)] group-hover:text-black group-hover:border-[var(--primary)] transition-all" 
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                    >
                      Manage <ArrowUpRight className="w-3 h-3 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {visible.length === 0 && (
            <div className="p-10 border-t border-[var(--border)]">
              <EmptyState 
                title="No Opportunities Found" 
                description={search || statusFilter ? "No opportunities match your current filters." : "Create an opportunity once a need is clear enough to match with members and convert into quest work."}
                icon={<Target className="w-8 h-8 opacity-40" />}
                action={!search && !statusFilter && (
                  <button className="primary" onClick={() => setShowCreate(true)}>
                    Create Opportunity
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

