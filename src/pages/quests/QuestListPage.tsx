import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords, createLedgerRecord, getRecord } from '../../lib/repository';
import { spawnQuestForOpportunity } from '../../services/workflowService';
import { useAuth } from '../../context/AuthContext';
import type { Quest, Opportunity } from '../../types/guild';

export function QuestListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.oppId ? true : false);
  const [search, setSearch] = useState('');
  
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
    isMandatory: true
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
      if (search && !quest.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [quests, search]);

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
        await createLedgerRecord('quests', {
          ...form,
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
    <section className="workbench">
      <div className="panel intro flex justify-between items-start">
        <div>
          <p className="eyebrow">Quest Operations</p>
          <h2>Manage Quests & Assignments</h2>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Form' : 'Create Quest'}
        </button>
      </div>

      {showCreate && (
        <form className="panel form-grid" onSubmit={submit}>
          <h3 className="span-2">Create New Quest</h3>
          {location.state?.oppId && <p className="span-2 text-green-400 text-sm">Linked to Opportunity ID: {location.state.oppId}</p>}
          <label className="span-2">Title <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></label>
          <label className="span-2">Description <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
          <label>Category <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></label>
          <label>Difficulty 
            <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value as any})}>
              <option>easy</option><option>medium</option><option>hard</option><option>legendary</option>
            </select>
          </label>
          <label>Rewards <input value={form.rewards} onChange={e => setForm({...form, rewards: e.target.value})} /></label>
          <label>Reputation Points <input type="number" value={form.reputationPoints} onChange={e => setForm({...form, reputationPoints: Number(e.target.value)})} /></label>
          <label className="span-2 flex items-center space-x-2">
            <input type="checkbox" checked={form.isMandatory} onChange={e => setForm({...form, isMandatory: e.target.checked})} />
            <span>This quest is mandatory for Opportunity completion</span>
          </label>
          <div className="span-2 flex space-x-2 mt-4">
            <button className="primary" type="submit">Deploy Quest</button>
            <button className="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="panel">
        <input className="search mb-4" placeholder="Search quest titles..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="table-wrap">
          <table className="responsive-table">
            <thead><tr><th>Title</th><th>Category</th><th>Difficulty</th><th>Mode</th><th>Reputation</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.map(quest => (
                <tr key={quest.id}>
                  <td><strong>{quest.title}</strong></td>
                  <td>{quest.category}</td>
                  <td><StatusBadge status={quest.difficulty} /></td>
                  <td>{quest.isMandatory ? 'Mandatory' : 'Optional'}</td>
                  <td>+{quest.reputationPoints}</td>
                  <td><button className="ghost" onClick={() => navigate(`/quests/${quest.id}`)}>Manage</button></td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6}>No quests found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
