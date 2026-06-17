import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Opportunity, Quest, GuildUser } from '../../types/guild';
import { where } from 'firebase/firestore';
import { StatusBadge } from '../../components/StatusBadge';

export function OpportunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  
  
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Opportunity>>({});
  
  // A simple hack for V1 member assignment (in reality we'd have a user search component)
  const [newMemberId, setNewMemberId] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecord('opportunities', id).then(data => {
      if (data) {
        setOpp(data);
        setForm(data);
      }
    });
    
    return subscribeRecords('quests', setQuests, [where('opportunityId', '==', id), where('archiveStatus', '==', 'active')]);
  }, [id]);

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!opp || !profile) return;
    await updateLedgerRecord('opportunities', opp.id, form, profile, 'Opportunity Updated');
    setOpp({ ...opp, ...form });
    setEditMode(false);
  }

  async function assignMember(e: React.FormEvent) {
    e.preventDefault();
    if (!opp || !profile || !newMemberId) return;
    const newAssigned = [...(opp.assignedMembers || []), newMemberId];
    await updateLedgerRecord('opportunities', opp.id, { assignedMembers: newAssigned }, profile, 'Member Assigned to Opportunity');
    setOpp({ ...opp, assignedMembers: newAssigned });
    setNewMemberId('');
  }

  if (!opp) return <p className="p-8">Loading opportunity...</p>;

  return (
    <section className="page-grid">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">Opportunity &middot; {opp.status}</p>
          <h2>{opp.title}</h2>
          <p>{opp.organizationName} &middot; ?{opp.estimatedRevenue}</p>
        </div>
        <div className="flex space-x-2">
          {opp.status === 'completed' ? (
            <button className="primary" onClick={() => navigate('/outcomes', { state: { oppId: opp.id, title: opp.title, orgId: opp.organizationId, orgName: opp.organizationName } })}>Record Outcome</button>
          ) : (
            <button className="primary" onClick={() => navigate('/quests/register', { state: { oppId: opp.id, title: opp.title, orgId: opp.organizationId, orgName: opp.organizationName, needId: opp.needId } })}>Spawn Quest</button>
          )}
          <button className="ghost" onClick={() => navigate('/opportunities')}>&larr; Back</button>
        </div>
      </div>
      
      {/* OPPORTUNITY HEALTH SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[var(--card)] p-4 rounded border border-[var(--border)]">
         <div><p className="text-[var(--muted)] text-xs uppercase mb-1">Total Quests</p><p className="font-bold">{quests.length}</p></div>
         <div><p className="text-[var(--muted)] text-xs uppercase mb-1">Open Quests</p><p className="font-bold">{quests.filter(q => q.status === 'open' || q.status === 'inProgress').length}</p></div>
         <div><p className="text-[var(--muted)] text-xs uppercase mb-1">Completed Quests</p><p className="font-bold text-green-400">{quests.filter(q => q.status === 'completed' || q.status === 'closed').length}</p></div>
         <div><p className="text-[var(--muted)] text-xs uppercase mb-1">Quest Revenue</p><p className="font-bold text-yellow-400">₹{quests.reduce((acc, q) => acc + (q.paymentAmount || 0), 0)}</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel">
          <div className="flex justify-between items-center mb-4">
            <h3>Information</h3>
            <button className="ghost" onClick={() => setEditMode(!editMode)}>{editMode ? 'Cancel' : 'Edit'}</button>
          </div>
          
          {editMode ? (
            <form className="form-grid" onSubmit={saveEdits}>
              <label className="span-2">Title <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></label>
              <label>Status 
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                  <option>draft</option><option>open</option><option>matching</option><option>assigned</option><option>inProgress</option><option>completed</option>
                </select>
              </label>
              <label>Estimated Revenue <input type="number" value={form.estimatedRevenue} onChange={e => setForm({...form, estimatedRevenue: Number(e.target.value)})} /></label>
              <button className="primary span-2" type="submit">Save Changes</button>
            </form>
          ) : (
            <div className="space-y-2">
              <p><strong>Description:</strong> {opp.description}</p>
              <p><strong>Category:</strong> {opp.category}</p>
              <p><strong>Required Skills:</strong> {opp.skillsRequired?.join(', ') || 'None specified'}</p>
              {opp.needId && <p><strong>Linked Need ID:</strong> {opp.needId}</p>}
            </div>
          )}
        </div>
        
        <div className="panel">
          <h3>Assigned Members</h3>
          <form className="flex space-x-2 mb-4" onSubmit={assignMember}>
            <input className="flex-1" placeholder="Enter Member UID..." value={newMemberId} onChange={e => setNewMemberId(e.target.value)} required />
            <button className="primary" type="submit">Assign</button>
          </form>
          <div className="space-y-4">
            {opp.assignedMembers?.map(uid => (
              <div key={uid} className="flex justify-between items-center border border-gray-700 p-2 rounded bg-gray-800">
                <span>{uid}</span>
              </div>
            ))}
            {(!opp.assignedMembers || opp.assignedMembers.length === 0) && <p className="text-gray-500">No members assigned yet.</p>}
          </div>
        </div>

        <div className="panel md:col-span-2">
          <h3>Work Generated (Quests)</h3>
          {quests.length === 0 ? (
            <p className="text-[var(--muted)]">No quests generated from this opportunity yet.</p>
          ) : (
            <div className="table-wrap mt-4">
              <table className="responsive-table">
                <thead><tr><th>Quest ID</th><th>Title</th><th>Status</th><th>Members</th><th>Actions</th></tr></thead>
                <tbody>
                  {quests.map(quest => (
                    <tr key={quest.id}>
                      <td className="font-mono text-blue-400">{quest.guildQuestId}</td>
                      <td>{quest.title}</td>
                      <td><StatusBadge status={quest.status} /></td>
                      <td>{quest.assignedMembers?.length || 0} Assigned</td>
                      <td><button className="ghost text-xs" onClick={() => navigate(`/quests/${quest.id}`)}>Open Record</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
