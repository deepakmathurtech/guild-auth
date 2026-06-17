import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Need } from '../../types/guild';
import { NeedCreateForm } from './NeedCreateForm';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';

export function NeedListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [needs, setNeeds] = useState<Need[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.orgId ? true : false);
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

    return subscribeRecords('needs', setNeeds, [
      ...base,
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, [profile]);

  const visible = useMemo(() => {
    return needs.filter(need => {
      if (statusFilter && need.status !== statusFilter) return false;
      if (search && !need.title.toLowerCase().includes(search.toLowerCase()) && !need.organizationName?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [needs, search, statusFilter]);

  return (
    <section className="workbench">
      <div className="panel intro flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Needs Pipeline</p>
          <h2>Manage Intake & Needs</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Capture problems before they become opportunities, then move them through matching and assignment.</p>
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
        <div className="flex flex-col gap-4 md:flex-row mb-4">
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
                  <td data-label="Title"><strong>{need.title}</strong></td>
                  <td data-label="Organization">{need.organizationName}</td>
                  <td data-label="Priority"><span className={`badge priority-${need.priority}`}>{need.priority}</span></td>
                  <td data-label="Status"><StatusBadge status={need.status} /></td>
                  <td data-label="Value">INR {Number(need.estimatedValue || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <button className="ghost" onClick={() => navigate(`/needs/${need.id}`)}>View / Process</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6}><EmptyState title="No Needs Waiting Right Now" description="Log a need when an organization asks for help, reports a problem, or surfaces work the Guild can convert into an opportunity." action={<button className="primary" onClick={() => setShowCreate(true)}>Log New Need</button>} /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
