import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords, createLedgerRecord, getRecord } from '../../lib/repository';
import { spawnQuestForOpportunity, generateGuildQuestId } from '../../services/workflowService';
import { useAuth } from '../../context/AuthContext';
import type { Quest, Opportunity } from '../../types/guild';
import { Filter, Search, Plus } from 'lucide-react';

export function QuestListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.oppId ? true : false);
  
  // Advanced Filter State
  const [searchId, setSearchId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterPaid, setFilterPaid] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [form, setForm] = useState({
    title: location.state?.title || '',
    description: '',
    category: '',
    difficulty: 'easy' as Quest['difficulty'],
    rewards: '',
    reputationPoints: 0,
    requirements: '',
    submissionMethod: 'Link Submission',
    verificationMethod: 'manualReview' as Quest['verificationMethod'],
    isMandatory: true,
    classification: 'Internal Guild' as Quest['classification'],
    isPaid: false
  });

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    try {
      if (location.state?.oppId) {
        const opp = await getRecord('opportunities', location.state.oppId) as Opportunity;
        if (opp) {
          await spawnQuestForOpportunity(opp, form, profile);
        } else {
          throw new Error('Linked Opportunity not found.');
        }
      } else {
        const newId = await generateGuildQuestId('LDH', form.category || 'GEN');
        await createLedgerRecord('quests', {
          ...form,
          guildQuestId: newId,
          assignedReceptionistId: profile.uid,
          assignedReceptionistName: profile.fullName || profile.email,
          status: 'active'
        }, profile, 'Quest Created');
      }

      setShowCreate(false);
      navigate('.', { replace: true, state: {} });
    } catch (err: any) {
      alert(err.message || 'Save failed.');
    }
  }

  return (
    <section className="page-grid max-w-7xl mx-auto">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">Guild Quest Record System</p>
          <h2>Quest Registry</h2>
          <p>The official, searchable database of all Guild Quests.</p>
        </div>
        <button className="primary flex items-center gap-2" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Form' : <><Plus size={18}/> Create Quest</>}
        </button>
      </div>

      {showCreate && (
        <form className="panel form-grid bg-[var(--card)] border border-blue-500/50 shadow-xl" onSubmit={submit}>
          <h3 className="span-2 text-blue-400">Initialize New Quest Record</h3>
          {location.state?.oppId && <p className="span-2 text-green-400 text-sm">Linked to Opportunity ID: {location.state.oppId}</p>}
          <label className="span-2">Title <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></label>
          <label className="span-2">Description <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
          
          <label>Category <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. TECH, DESG" /></label>
          <label>Classification 
            <select value={form.classification} onChange={e => setForm({...form, classification: e.target.value as any})}>
               <option>Internal Guild</option><option>External Client</option><option>Community Service</option>
               <option>Revenue Generating</option><option>Training</option><option>Partnership</option><option>Research</option><option>Emergency</option>
            </select>
          </label>
          <label>Difficulty 
            <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value as any})}>
              <option>easy</option><option>medium</option><option>hard</option><option>legendary</option>
            </select>
          </label>
          <label>Reputation Points <input type="number" value={form.reputationPoints} onChange={e => setForm({...form, reputationPoints: Number(e.target.value)})} /></label>
          
          <label className="flex items-center space-x-2 bg-[var(--bg-alt)] p-2 rounded border border-[var(--border)]">
            <input type="checkbox" checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})} />
            <span>This is a Paid Quest</span>
          </label>
          <label className="flex items-center space-x-2 bg-[var(--bg-alt)] p-2 rounded border border-[var(--border)]">
            <input type="checkbox" checked={form.isMandatory} onChange={e => setForm({...form, isMandatory: e.target.checked})} />
            <span>Mandatory for Opportunity completion</span>
          </label>

          <div className="span-2 flex space-x-2 mt-4 pt-4 border-t border-[var(--border)]">
            <button className="primary" type="submit">Deploy Quest</button>
            <button className="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

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
