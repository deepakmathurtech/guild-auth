import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Organization } from '../../types/guild';
import { OrganizationCreateForm } from './OrganizationCreateForm';
import { useAuth } from '../../context/AuthContext';

export function OrganizationListPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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

    return subscribeRecords('organizations', setOrganizations, [
      ...base,
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, [profile]);

  const visible = useMemo(() => {
    return organizations.filter(org => {
      if (categoryFilter && org.category !== categoryFilter) return false;
      if (statusFilter && org.currentStatus !== statusFilter) return false;
      if (search && !org.name.toLowerCase().includes(search.toLowerCase()) && !org.city?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [organizations, search, categoryFilter, statusFilter]);

  return (
    <section className="workbench">
      <div className="panel intro flex justify-between items-start">
        <div>
          <p className="eyebrow">Organization Management</p>
          <h2>Manage Guild Partners</h2>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Form' : 'Add Organization'}
        </button>
      </div>

      {showCreate && <OrganizationCreateForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />}

      <div className="panel">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input className="search flex-1" placeholder="Search by name or city..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option>Business</option><option>NGO</option><option>College</option><option>Contractor</option><option>Community Group</option><option>Government Related</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option>new</option><option>contacted</option><option>active</option><option>partner</option><option>inactive</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr><th>Name</th><th>Category</th><th>City</th><th>Status</th><th>Contact</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.map(org => (
                <tr key={org.id}>
                  <td data-label="Name"><strong>{org.name}</strong></td>
                  <td data-label="Category">{org.category}</td>
                  <td data-label="City">{org.city}</td>
                  <td data-label="Status"><StatusBadge status={org.currentStatus} /></td>
                  <td data-label="Contact">{org.contactPerson}</td>
                  <td>
                    <button className="primary text-[10px] px-3 py-1.5" onClick={() => navigate(`/organizations/${org.id}`)}>View Details</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                 <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic font-medium">No organizations found in your jurisdiction.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
