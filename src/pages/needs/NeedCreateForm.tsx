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

function getDefaultJurisdictionCityName(profile: any): string {
  return profile?.jurisdiction?.cityName || profile?.city || '';
}

function getDefaultJurisdictionCityId(profile: any): string {
  return profile?.jurisdiction?.cityId || '';
}

export function NeedCreateForm({ initialOrgId = '', initialOrgName = '', onSuccess, onCancel }: Props) {
  const { profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Technology' as Need['category'],
    priority: 'medium' as Need['priority'],
    organizationId: initialOrgId,
    organizationName: initialOrgName,
    location: '',
    city: getDefaultJurisdictionCityName(profile),
    estimatedValue: 0
  });
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Validate profile has required jurisdiction data
  const isProfileValid = profile?.jurisdiction?.cityId && profile?.jurisdiction?.stateId && profile?.jurisdiction?.countryId;

  useEffect(() => {
    if (!profile || !isProfileValid) return;
    listRecords('organizations', [
      where('jurisdiction.cityId', '==', profile.jurisdiction.cityId),
      where('archiveStatus', '==', 'active')
    ]).then(setOrganizations);
  }, [profile, isProfileValid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    // Validate required fields
    const validationErrors: string[] = [];
    if (!form.title.trim()) validationErrors.push('Title is required');
    if (!form.description.trim()) validationErrors.push('Description is required');
    if (!form.organizationId) validationErrors.push('Organization is required');
    if (!isProfileValid) validationErrors.push('Your profile is missing jurisdiction data. Please complete your profile first.');

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus('Synchronizing Ledger...');
    try {
      // Clear errors
      setErrors([]);

      // Stress Test: Duplicate Detection
      const existing = await detectDuplicates('needs', 'title', form.title);
      const isDuplicate = existing.some(n => n.organizationId === form.organizationId);
      if (isDuplicate) {
        throw new Error(`Duplicate Record: This organization already has a need titled "${form.title}".`);
      }

      const org = organizations.find(o => o.id === form.organizationId);
      const orgName = org?.name || form.organizationName;
      await createLedgerRecord('needs', {
        ...form,
        searchName: form.title.toLowerCase(),
        organizationName: orgName,
        status: 'submitted',
        jurisdiction: profile.jurisdiction,
        // Inherit from organization or use profile data
        assignedReceptionistId: org?.assignedReceptionistId || profile.uid,
        assignedReceptionistName: org?.assignedReceptionistName || profile.fullName || profile.email,
        branchId: org?.branchId || profile.branchId,
        branchName: org?.branchName || profile.branchName
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
        <button className="primary" type="submit" disabled={!isProfileValid}>Save Need</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {errors.length > 0 && (
        <div className="span-2 bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
          {errors.map((err, idx) => (
            <p key={idx} className="text-xs text-red-600">{err}</p>
          ))}
        </div>
      )}
      {status && <p className="muted span-2">{status}</p>}
    </form>
  );
}
