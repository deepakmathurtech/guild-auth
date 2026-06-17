import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, addInteraction, subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Organization, Need } from '../../types/guild';
import { where } from 'firebase/firestore';

export function OrganizationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Organization>>({});
  
  const [interactionText, setInteractionText] = useState('');
  const [interactionType, setInteractionType] = useState<'note' | 'call' | 'meeting'>('note');

  useEffect(() => {
    if (!id) return;
    getRecord('organizations', id).then(data => {
      if (data) {
        setOrg(data);
        setForm(data);
      }
    });
    
    return subscribeRecords('needs', setNeeds, [where('organizationId', '==', id), where('archiveStatus', '==', 'active')]);
  }, [id]);

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
    await addInteraction(org, profile, interactionText, interactionType);
    setInteractionText('');
    getRecord('organizations', org.id).then(data => data && setOrg(data));
  }

  if (!org) return <p className="p-8">Loading organization...</p>;

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
              <label>Contact <input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></label>
              <label>Phone <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
              <label>Email <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
              <label>City <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></label>
              <button className="primary span-2" type="submit">Save Changes</button>
            </form>
          ) : (
            <div className="space-y-2">
              <p><strong>Contact:</strong> {org.contactPerson} ({org.email || 'No email'}) {org.phone}</p>
              <p><strong>Address:</strong> {org.address}, {org.city}</p>
              <p><strong>Description:</strong> {org.description}</p>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Interaction History</h3>
          <form className="flex space-x-2 mb-4" onSubmit={logInteraction}>
            <select value={interactionType} onChange={e => setInteractionType(e.target.value as any)}>
              <option value="note">Note</option><option value="call">Call</option><option value="meeting">Meeting</option>
            </select>
            <input className="flex-1" placeholder="Log an interaction..." value={interactionText} onChange={e => setInteractionText(e.target.value)} required />
            <button className="primary" type="submit">Log</button>
          </form>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {org.interactionHistory?.map(inter => (
              <div key={inter.id} className="border-l-2 border-green-500 pl-4 py-1 bg-gray-800 rounded-r">
                <p className="text-sm"><strong>{inter.type.toUpperCase()}</strong> &middot; {new Date(inter.createdAt).toLocaleString()}</p>
                <p>{inter.summary}</p>
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
                    <td>{need.title}</td><td>{need.status}</td><td>{need.priority}</td>
                    <td><button className="ghost" onClick={() => navigate(`/needs/${need.id}`)}>View</button></td>
                  </tr>
                ))}
                {needs.length === 0 && <tr><td colSpan={4}>No needs logged for this organization yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
