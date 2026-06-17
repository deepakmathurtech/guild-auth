import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createLedgerRecord, getRecord } from '../../lib/repository';
import { convertNeedToOpportunity } from '../../services/workflowService';
import type { Opportunity, Need } from '../../types/guild';

interface Props {
  initialData?: Partial<Opportunity>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OpportunityCreateForm({ initialData = {}, onSuccess, onCancel }: Props) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || '',
    skillsRequired: initialData.skillsRequired?.join(', ') || '',
    needId: initialData.needId || '',
    organizationId: initialData.organizationId || '',
    organizationName: initialData.organizationName || '',
    estimatedRevenue: initialData.estimatedRevenue || 0
  });
  const [status, setStatus] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setStatus('Saving...');
    try {
      const oppData = {
        ...form,
        skillsRequired: form.skillsRequired ? form.skillsRequired.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        status: 'draft' as const,
      };

      if (form.needId) {
        const need = await getRecord('needs', form.needId) as Need;
        if (need) {
          await convertNeedToOpportunity(need, oppData, profile);
        } else {
          throw new Error('Linked Need not found.');
        }
      } else {
        await createLedgerRecord('opportunities', {
          ...oppData,
          applicants: [],
          assignedMembers: [],
          assignedReceptionist: profile.uid
        }, profile, 'Opportunity Created');
      }

      setStatus('');
      onSuccess();
    } catch (err: any) {
      setStatus(err.message || 'Save failed.');
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h3 className="span-2">Create Opportunity</h3>
      {form.needId && <p className="span-2 text-green-400 text-sm">Linked to Need ID: {form.needId}</p>}
      <label className="span-2">Title <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></label>
      <label className="span-2">Description <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
      <label>Category <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></label>
      <label>Skills Required <input placeholder="Comma separated" value={form.skillsRequired} onChange={e => setForm({...form, skillsRequired: e.target.value})} /></label>
      <label>Organization Name <input value={form.organizationName} onChange={e => setForm({...form, organizationName: e.target.value})} /></label>
      <label>Estimated Revenue <input type="number" value={form.estimatedRevenue} onChange={e => setForm({...form, estimatedRevenue: Number(e.target.value)})} /></label>
      
      <div className="span-2 flex space-x-2 mt-4">
        <button className="primary" type="submit">Save Draft Opportunity</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {status && <p className="muted span-2">{status}</p>}
    </form>
  );
}
