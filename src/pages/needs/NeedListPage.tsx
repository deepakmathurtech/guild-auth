import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Need } from '../../types/guild';
import { NeedCreateForm } from './NeedCreateForm';

export function NeedListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [needs, setNeeds] = useState<Need[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.orgId ? true : false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    return subscribeRecords('needs', setNeeds, [
      where('archiveStatus', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, []);

  const visible = useMemo(() => {
    return needs.filter(need => {
      if (statusFilter && need.status !== statusFilter) return false;
      if (search && !need.title.toLowerCase().includes(search.toLowerCase()) && !need.organizationName?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [needs, search, statusFilter]);

  return (
    <section className="workbench">
      <div className="panel intro flex justify-between items-start">
        <div>
          <p className="eyebrow">Needs Pipeline</p>
          <h2>Manage Intake & Needs</h2>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Form' : 'Log New Need'}
        </button>
      </div>

      {showCreate && (
        <NeedCreateForm 
          initialOrgId={location.state?.orgId} 
          initialOrgName={location.state?.orgName}
          onSuccess={() => { setShowCreate(false); navigate('.', { replace: true, state: {} }); }} 
          onCancel={() => setShowCreate(false)} 
        />
      )}

      <div className="panel">
        <div className="flex space-x-4 mb-4">
          <input className="search flex-1" placeholder="Search title or organization..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option>open</option><option>matching</option><option>assigned</option><option>inProgress</option><option>completed</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr><th>Title</th><th>Organization</th><th>Priority</th><th>Status</th><th>Value</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.map(need => (
                <tr key={need.id}>
                  <td><strong>{need.title}</strong></td>
                  <td>{need.organizationName}</td>
                  <td><span className={`badge priority-${need.priority}`}>{need.priority}</span></td>
                  <td><StatusBadge status={need.status} /></td>
                  <td>?{need.estimatedValue}</td>
                  <td>
                    <button className="ghost" onClick={() => navigate(`/needs/${need.id}`)}>View / Process</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6}>No needs match your criteria.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
