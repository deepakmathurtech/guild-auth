import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Organization } from '../../types/guild';
import { OrganizationCreateForm } from './OrganizationCreateForm';

export function OrganizationListPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    return subscribeRecords('organizations', setOrganizations, [
      where('archiveStatus', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, []);

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
        <div className="flex space-x-4 mb-4">
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
                  <td><strong>{org.name}</strong></td>
                  <td>{org.category}</td>
                  <td>{org.city}</td>
                  <td><StatusBadge status={{org.currentStatus}} /></td>
                  <td>{org.contactPerson}</td>
                  <td>
                    <button className="ghost" onClick={() => navigate(`/organizations/${org.id}`)}>View Details</button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6}>No organizations found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
