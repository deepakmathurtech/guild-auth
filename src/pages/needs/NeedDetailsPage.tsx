import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Need, Opportunity } from '../../types/guild';
import { where } from 'firebase/firestore';

export function NeedDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [need, setNeed] = useState<Need | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Need>>({});

  useEffect(() => {
    if (!id) return;
    getRecord('needs', id).then(data => {
      if (data) {
        setNeed(data);
        setForm(data);
      }
    });
    
    return subscribeRecords('opportunities', setOpportunities, [where('needId', '==', id), where('archiveStatus', '==', 'active')]);
  }, [id]);

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!need || !profile) return;
    await updateLedgerRecord('needs', need.id, form, profile, 'Need Updated');
    setNeed({ ...need, ...form });
    setEditMode(false);
  }

  function handleConvert() {
    navigate('/opportunities', { 
      state: { 
        needId: need?.id, 
        title: need?.title, 
        description: need?.description,
        orgId: need?.organizationId,
        orgName: need?.organizationName,
        revenue: need?.estimatedValue
      } 
    });
  }

  if (!need) return <p className="p-8">Loading need...</p>;

  return (
    <section className="page-grid">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">Need Details &middot; Priority: {need.priority}</p>
          <h2>{need.title}</h2>
          <p>{need.organizationName} &middot; {need.status}</p>
        </div>
        <div className="flex space-x-2">
          <button className="primary" onClick={handleConvert}>Convert to Opportunity</button>
          <button className="ghost" onClick={() => navigate('/needs')}>&larr; Back</button>
        </div>
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
                  <option>open</option><option>matching</option><option>assigned</option><option>inProgress</option><option>completed</option>
                </select>
              </label>
              <label>Priority 
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})}>
                  <option>low</option><option>medium</option><option>high</option><option>urgent</option>
                </select>
              </label>
              <label>Estimated Value <input type="number" value={form.estimatedValue} onChange={e => setForm({...form, estimatedValue: Number(e.target.value)})} /></label>
              <label>Location <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></label>
              <label className="span-2">Description <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
              <button className="primary span-2" type="submit">Save Changes</button>
            </form>
          ) : (
            <div className="space-y-2">
              <p><strong>Description:</strong> {need.description}</p>
              <p><strong>Location:</strong> {need.location || need.city || 'No location specified'}</p>
              <p><strong>Estimated Value:</strong> ?{need.estimatedValue}</p>
              <p><strong>Created By:</strong> {need.createdBy}</p>
            </div>
          )}
        </div>
        
        <div className="panel">
          <h3>Generated Opportunities</h3>
          {opportunities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No opportunities generated yet.</p>
              <button className="ghost mt-2" onClick={handleConvert}>Create one now</button>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map(opp => (
                <div key={opp.id} className="border border-gray-700 p-4 rounded bg-gray-800">
                  <div className="flex justify-between">
                    <strong>{opp.title}</strong>
                    <StatusBadge status={{opp.status}} />
                  </div>
                  <p className="text-sm mt-1">{opp.category}</p>
                  <button className="ghost mt-2" onClick={() => navigate(`/opportunities/${opp.id}`)}>View Opportunity &rarr;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
