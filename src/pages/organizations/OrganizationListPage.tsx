import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { Organization } from '../../types/guild';
import { OrganizationCreateForm } from './OrganizationCreateForm';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { Plus, Search, Filter, BriefcaseBusiness, MapPin, Phone, ArrowUpRight } from 'lucide-react';

export function OrganizationListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreate, setShowCreate] = useState(Boolean(location.state?.showCreate));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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
    <div className="space-y-8 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Partnership Management</p>
          <h1>Organizations Directory</h1>
          <p className="text-[var(--text-secondary)] max-w-lg">
            Track and manage relationships with business partners, NGOs, and community groups across your jurisdiction.
          </p>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Portal' : <><Plus className="w-4 h-4" /> Add Organization</>}
        </button>
      </div>

      {showCreate && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <OrganizationCreateForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              className="pl-10" 
              placeholder="Search organizations by name or city..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="md:w-48"
            >
              <option value="">All Categories</option>
              <option>Business</option>
              <option>NGO</option>
              <option>College</option>
              <option>Contractor</option>
              <option>Community Group</option>
              <option>Government Related</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="md:w-40"
            >
              <option value="">All Statuses</option>
              <option>new</option>
              <option>contacted</option>
              <option>active</option>
              <option>partner</option>
              <option>inactive</option>
            </select>
          </div>
        </div>

        {/* List View */}
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th className="pl-6">Organization Details</th>
                <th>Classification</th>
                <th>Jurisdiction</th>
                <th>Operational Status</th>
                <th className="pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map(org => (
                <tr key={org.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                  <td className="pl-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                        <BriefcaseBusiness className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text)]">{org.name}</p>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {org.contactPerson}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="role-pill">{org.category}</span>
                  </td>
                  <td>
                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {org.city}
                    </p>
                  </td>
                  <td>
                    <StatusBadge status={org.currentStatus} />
                  </td>
                  <td className="pr-6 text-right">
                    <button 
                      className="secondary !py-2 !px-4 text-xs group-hover:bg-[var(--primary)] group-hover:text-black group-hover:border-[var(--primary)] transition-all" 
                      onClick={() => navigate(`/organizations/${org.id}`)}
                    >
                      Management <ArrowUpRight className="w-3 h-3 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {visible.length === 0 && (
            <div className="p-10 border-t border-[var(--border)]">
              <EmptyState 
                title="No Organizations Found" 
                description={search || categoryFilter || statusFilter ? "No partners match your current filters. Try broadening your search." : "Start by registering the first partner, NGO, or government contact for this jurisdiction."}
                icon={<BriefcaseBusiness className="w-8 h-8 opacity-40" />}
                action={!search && !categoryFilter && !statusFilter && (
                  <button className="primary" onClick={() => setShowCreate(true)}>
                    Add Organization
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

