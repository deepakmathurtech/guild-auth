import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Opportunity } from '../../types/guild';
import { OpportunityCreateForm } from './OpportunityCreateForm';
import { useAuth } from '../../context/AuthContext';

export function OpportunityListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.needId ? true : false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!profile) return;
    const base = [where('archiveStatus', '==', 'active')];
    if (['guildFounder', 'centralGuildMaster'].includes(profile.role)) {
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
    <section className="workbench">
      <div className="panel intro flex justify-between items-start">
        <div>
          <p className="eyebrow">Opportunity Pipeline</p>
          <h2>Manage Guild Work</h2>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Form' : 'Create Opportunity'}
        </button>
      </div>

      {showCreate && (
        <OpportunityCreateForm 
          initialData={location.state}
          onSuccess={() => { setShowCreate(false); navigate('.', { replace: true, state: {} }); }} 
          onCancel={() => setShowCreate(false)} 
        />
      )}

      <div className="panel">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input className="search flex-1" placeholder="Search title or organization..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option>draft</option><option>open</option><option>matching</option><option>assigned</option><option>inProgress</option><option>completed</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Assigned</th><th>Status</th><th>Value</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.map(opp => (
                <tr key={opp.id}>
                  <td data-label="Title"><strong>{opp.title}</strong></td>
                  <td data-label="Category">{opp.category}</td>
                  <td data-label="Assigned">{opp.assignedMembers?.length || 0} Members</td>
                  <td data-label="Status"><StatusBadge status={opp.status} /></td>
                  <td data-label="Value">₹{opp.estimatedRevenue.toLocaleString()}</td>
                  <td>
                    <button className="primary text-[10px] px-3 py-1.5" onClick={() => navigate(`/opportunities/${opp.id}`)}>Manage</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-medium italic">No opportunities match your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
