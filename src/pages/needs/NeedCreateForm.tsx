import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createLedgerRecord, listRecords, detectDuplicates } from '../../lib/repository';
import type { Need, Organization } from '../../types/guild';
import { where } from 'firebase/firestore';

interface Props {
  initialOrgId?: string;
  initialOrgName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NeedCreateForm({ initialOrgId = '', initialOrgName = '', onSuccess, onCancel }: Props) {
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Need['priority'],
    organizationId: initialOrgId,
    organizationName: initialOrgName,
    location: '',
    city: profile?.jurisdiction.cityName || '',
    estimatedValue: 0
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!profile) return;
    listRecords('organizations', [
      where('jurisdiction.cityId', '==', profile.jurisdiction.cityId),
      where('archiveStatus', '==', 'active')
    ]).then(setOrganizations);
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setStatus('Synchronizing Ledger...');
    try {
      // Stress Test: Duplicate Detection
      const existing = await detectDuplicates('needs', 'title', form.title);
      const isDuplicate = existing.some(n => n.organizationId === form.organizationId);
      if (isDuplicate) {
        throw new Error(`Duplicate Record: This organization already has a need titled "${form.title}".`);
      }

      const orgName = organizations.find(o => o.id === form.organizationId)?.name || form.organizationName;
      await createLedgerRecord('needs', {
        ...form,
        searchName: form.title.toLowerCase(),
        organizationName: orgName,
        status: 'open',
        jurisdiction: profile.jurisdiction
      }, profile, 'Need Created');
      onSuccess();
    } catch (err: any) {
      setStatus(err.message || 'Operation failed.');
    } finally {
      setStatus('');
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h3 className="span-2">Log a Need</h3>
      <label className="span-2">Title <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></label>
      <label className="span-2">Description <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
      <label>Priority 
        <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})}>
          <option>low</option><option>medium</option><option>high</option><option>urgent</option>
        </select>
      </label>
      <label>Organization
        <select required value={form.organizationId} onChange={e => setForm({...form, organizationId: e.target.value})}>
          <option value="">Select Organization</option>
          {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <label>Location/Address <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></label>
      <label>City <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></label>
      <label>Estimated Value <input type="number" value={form.estimatedValue || ''} onChange={e => setForm({...form, estimatedValue: Number(e.target.value)})} /></label>
      <div className="span-2 flex space-x-2 mt-4">
        <button className="primary" type="submit">Save Need</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {status && <p className="muted span-2">{status}</p>}
    </form>
  );
}
