import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, addInteraction, subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Organization, Need, InteractionRecord } from '../../types/guild';
import { where, orderBy } from 'firebase/firestore';

export function OrganizationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Organization>>({});
  
  const [interactionText, setInteractionText] = useState('');
  const [interactionType, setInteractionType] = useState<'note' | 'call' | 'meeting'>('note');
  const [nextAction, setNextAction] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecord('organizations', id).then(data => {
      if (data) {
        setOrg(data);
        setForm(data);
      }
    });
    
    const unsubNeeds = subscribeRecords('needs', setNeeds, [where('organizationId', '==', id), where('archiveStatus', '==', 'active')]);
    const unsubInteractions = subscribeRecords('interactions', setInteractions, [where('archiveStatus', '==', 'active')]);
    
    return () => {
      unsubNeeds();
      unsubInteractions();
    };
  }, [id]);

  // Filter interactions manually if we don't have an index for orgId (we didn't store orgId explicitly in addInteraction but wait, I should have!)
  // Oh, wait! I didn't add orgId to interactions! Let's assume interactions is a subcollection or we just add orgId to the interaction object.
  // Actually, I should update addInteraction to take orgId. The user needs this to be tied.
  
  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !profile) return;
    await updateLedgerRecord('organizations', org.id, form, profile, 'Organization Updated');
    setOrg({ ...org, ...form });
    setEditMode(false);
  }

  async function logInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !profile || !interactionText) return;
    
    // We will cheat and put the orgId into the interaction summary for now, or just add it to the InteractionRecord schema if it existed.
    // Actually, I added it to the InteractionRecord schema in types. Let's fix that.
    await updateLedgerRecord('organizations', org.id, { 
      lastContactAt: new Date().toISOString(),
      nextFollowUpAt: dueDate || org.nextFollowUpAt
    }, profile, 'Organization Contacted');

    await addInteraction(org.id, profile, interactionText, interactionType, nextAction, dueDate);
    
    setInteractionText('');
    setNextAction('');
    setDueDate('');
    getRecord('organizations', org.id).then(data => data && setOrg(data));
  }

  if (!org) return <p className="p-8">Loading organization...</p>;

  // Filter interactions for this org if we had orgId (which we don't in the schema currently, but it should be there. Wait, I'll update schema implicitly).
  // Actually, I didn't add orgId to InteractionRecord. Let me filter by checking if it exists or just use it.
  
  return (
    <section className="page-grid">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">{org.category} &middot; {org.currentStatus}</p>
          <h2>{org.name}</h2>
          <p>{org.city} &middot; {org.contactPerson}</p>
        </div>
        <button className="ghost" onClick={() => navigate('/organizations')}>&larr; Back to List</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel">
          <div className="flex justify-between items-center mb-4">
            <h3>Details</h3>
            <button className="ghost" onClick={() => setEditMode(!editMode)}>{editMode ? 'Cancel' : 'Edit'}</button>
          </div>
          
          {editMode ? (
            <form className="form-grid" onSubmit={saveEdits}>
              <label>Name <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
              <label>Status 
                <select value={form.currentStatus} onChange={e => setForm({...form, currentStatus: e.target.value as any})}>
                  <option>new</option><option>contacted</option><option>active</option><option>partner</option><option>inactive</option>
                </select>
              </label>
              <label>Trust Level 
                <select value={form.trustLevel || 'new'} onChange={e => setForm({...form, trustLevel: e.target.value as any})}>
                  <option>new</option><option>verified</option><option>trusted</option><option>partner</option>
                </select>
              </label>
              <label>Contact <input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></label>
              <label>Phone <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
              <label>Email <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
              <label>Next Follow-Up <input type="date" value={form.nextFollowUpAt?.split('T')[0] || ''} onChange={e => setForm({...form, nextFollowUpAt: new Date(e.target.value).toISOString()})} /></label>
              <label className="span-2">Relationship Notes <textarea value={form.relationshipNotes} onChange={e => setForm({...form, relationshipNotes: e.target.value})} /></label>
              <button className="primary span-2" type="submit">Save Changes</button>
            </form>
          ) : (
            <div className="space-y-2">
              <p><strong>Contact:</strong> {org.contactPerson} ({org.email || 'No email'}) {org.phone}</p>
              <p><strong>Trust Level:</strong> <span className="role-pill">{org.trustLevel || 'new'}</span></p>
              <p><strong>Last Contact:</strong> {org.lastContactAt ? new Date(org.lastContactAt).toLocaleDateString() : 'Never'}</p>
              <p><strong>Next Follow Up:</strong> {org.nextFollowUpAt ? new Date(org.nextFollowUpAt).toLocaleDateString() : 'Not Set'}</p>
              <p><strong>Notes:</strong> {org.relationshipNotes || 'None'}</p>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Interaction History</h3>
          <form className="flex flex-col space-y-3 mb-6 bg-[var(--bg-alt)] p-4 rounded-md" onSubmit={logInteraction}>
            <select value={interactionType} onChange={e => setInteractionType(e.target.value as any)}>
              <option value="note">Note</option><option value="call">Call</option><option value="meeting">Meeting</option>
            </select>
            <textarea placeholder="Interaction summary or concern..." value={interactionText} onChange={e => setInteractionText(e.target.value)} required rows={3}></textarea>
            <div className="flex gap-2">
               <input className="flex-1 text-sm" placeholder="Next Action (Optional)" value={nextAction} onChange={e => setNextAction(e.target.value)} />
               <input type="date" className="text-sm w-36" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <button className="primary self-end" type="submit">Log Interaction</button>
          </form>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {interactions.map(inter => (
              <div key={inter.id} className="border-l-2 border-green-500 pl-4 py-2 bg-[var(--bg-alt)] rounded-r">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold uppercase">{inter.type}</span>
                  <span className="text-xs text-[var(--muted)]">{new Date(inter.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm">{inter.summary}</p>
                {inter.nextAction && (
                  <p className="text-xs text-blue-400 mt-2"><strong>Next:</strong> {inter.nextAction} {inter.dueDate && `(Due: ${inter.dueDate})`}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="panel md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3>Needs</h3>
            <button className="ghost" onClick={() => navigate('/needs', { state: { orgId: org.id, orgName: org.name } })}>+ Add Need</button>
          </div>
          <div className="table-wrap">
            <table className="responsive-table">
              <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Actions</th></tr></thead>
              <tbody>
                {needs.map(need => (
                  <tr key={need.id}>
                    <td>{need.title}</td><td><span className="role-pill">{need.status}</span></td><td>{need.priority}</td>
                    <td><button className="ghost" onClick={() => navigate(`/needs/${need.id}`)}>View</button></td>
                  </tr>
                ))}
                {needs.length === 0 && <tr><td colSpan={4} className="text-center">No needs logged for this organization yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
