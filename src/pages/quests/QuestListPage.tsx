import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Quest } from '../../types/guild';
import { Filter, Search, Plus } from 'lucide-react';

export function QuestListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [quests, setQuests] = useState<Quest[]>([]);
  
  // Advanced Filter State
  const [searchId, setSearchId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterPaid, setFilterPaid] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    return subscribeRecords('quests', setQuests, [
      where('archiveStatus', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, []);

  const visible = useMemo(() => {
    return quests.filter(quest => {
      if (searchId && !(quest.guildQuestId?.toLowerCase().includes(searchId.toLowerCase()) || quest.id.toLowerCase().includes(searchId.toLowerCase()))) return false;
      if (searchTitle && !quest.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
      if (filterClass && quest.classification !== filterClass) return false;
      if (filterPaid === 'Paid' && !quest.isPaid) return false;
      if (filterPaid === 'Unpaid' && quest.isPaid) return false;
      if (filterStatus && quest.status !== filterStatus) return false;
      return true;
    });
  }, [quests, searchId, searchTitle, filterClass, filterPaid, filterStatus]);

  return (
    <section className="page-grid max-w-7xl mx-auto">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">Guild Quest Record System</p>
          <h2>Quest Registry</h2>
          <p>The official, searchable database of all Guild Quests.</p>
        </div>
        <button className="primary flex items-center gap-2" onClick={() => navigate('/quests/register', { state: location.state })}>
          <Plus size={18}/> Register Quest
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="panel p-4 bg-[var(--bg-alt)] mb-6">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-[var(--muted)]"><Filter size={16}/> Advanced Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
           <div className="flex bg-[var(--card)] border border-[var(--border)] rounded px-2 items-center">
             <Search size={16} className="text-[var(--muted)] mr-2" />
             <input className="bg-transparent border-0 flex-1 outline-none text-sm p-1" placeholder="Quest ID (GQ-...)" value={searchId} onChange={e => setSearchId(e.target.value)} />
           </div>
           <div className="flex bg-[var(--card)] border border-[var(--border)] rounded px-2 items-center">
             <Search size={16} className="text-[var(--muted)] mr-2" />
             <input className="bg-transparent border-0 flex-1 outline-none text-sm p-1" placeholder="Title search..." value={searchTitle} onChange={e => setSearchTitle(e.target.value)} />
           </div>
           <select className="bg-[var(--card)] border border-[var(--border)] rounded text-sm p-2" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
             <option value="">All Classifications</option>
             <option>Internal Guild</option><option>External Client</option><option>Community Service</option>
             <option>Revenue Generating</option><option>Training</option><option>Partnership</option><option>Research</option><option>Emergency</option>
           </select>
           <select className="bg-[var(--card)] border border-[var(--border)] rounded text-sm p-2" value={filterPaid} onChange={e => setFilterPaid(e.target.value)}>
             <option value="">Any Payment Status</option>
             <option>Paid</option><option>Unpaid</option>
           </select>
           <select className="bg-[var(--card)] border border-[var(--border)] rounded text-sm p-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
             <option value="">Any Status</option>
             <option>active</option><option>completed</option><option>archived</option>
           </select>
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Quest ID</th>
                <th>Title</th>
                <th>Classification</th>
                <th>Financials</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(quest => (
                <tr key={quest.id} className="hover:bg-[var(--bg-alt)] transition-colors">
                  <td><span className="font-mono text-sm text-blue-400">{quest.guildQuestId || quest.id}</span></td>
                  <td><strong>{quest.title}</strong><br/><span className="text-xs text-[var(--muted)]">{quest.category} &middot; {quest.assignedMembers?.length || 0} Members</span></td>
                  <td><span className="role-pill">{quest.classification || 'Unclassified'}</span></td>
                  <td>{quest.isPaid ? <span className="text-green-400 font-bold text-xs bg-green-900/30 px-2 py-1 rounded">Paid</span> : <span className="text-gray-400 font-bold text-xs bg-gray-800 px-2 py-1 rounded">Volunteer</span>}</td>
                  <td><StatusBadge status={quest.status} /></td>
                  <td className="text-right"><button className="primary text-xs" onClick={() => navigate(`/quests/${quest.id}`)}>Open Record</button></td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-[var(--muted)]">No quests match your criteria.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
