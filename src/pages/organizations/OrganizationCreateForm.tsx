import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createLedgerRecord } from '../../lib/repository';
import type { Organization } from '../../types/guild';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrganizationCreateForm({ onSuccess, onCancel }: Props) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    category: 'Business' as Organization['category'],
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    description: ''
  });
  const [status, setStatus] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setStatus('Saving...');
    try {
      await createLedgerRecord('organizations', {
        ...form,
        needs: [],
        opportunities: [],
        currentStatus: 'new',
        trustLevel: 'new',
        relationshipNotes: ''
      }, profile, 'Organization Created');
      setStatus('');
      onSuccess();
    } catch (err: any) {
      setStatus(err.message || 'Save failed.');
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h3 className="span-2">Create Organization</h3>
      <label>Name <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
      <label>Category 
        <select required value={form.category} onChange={e => setForm({...form, category: e.target.value as any})}>
          <option>Business</option><option>NGO</option><option>College</option>
          <option>Contractor</option><option>Community Group</option><option>Government Related</option>
        </select>
      </label>
      <label>Contact Person <input required value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></label>
      <label>Phone <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
      <label>Email <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
      <label>City <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></label>
      <label className="span-2">Address <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></label>
      <label className="span-2">Description <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
      <div className="span-2 flex space-x-2 mt-4">
        <button className="primary" type="submit">Save Organization</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {status && <p className="muted span-2">{status}</p>}
    </form>
  );
}
