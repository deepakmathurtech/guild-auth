import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Opportunity } from '../../types/guild';
import { OpportunityCreateForm } from './OpportunityCreateForm';

export function OpportunityListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.needId ? true : false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    return subscribeRecords('opportunities', setOpportunities, [
      where('archiveStatus', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, []);

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
        <div className="flex space-x-4 mb-4">
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
                  <td><strong>{opp.title}</strong></td>
                  <td>{opp.category}</td>
                  <td>{opp.assignedMembers?.length || 0} Members</td>
                  <td><StatusBadge status={opp.status} /></td>
                  <td>?{opp.estimatedRevenue}</td>
                  <td>
                    <button className="ghost" onClick={() => navigate(`/opportunities/${opp.id}`)}>Manage</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6}>No opportunities match your criteria.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
