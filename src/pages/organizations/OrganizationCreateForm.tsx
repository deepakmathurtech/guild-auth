import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createLedgerRecord, detectDuplicates } from '../../lib/repository';
import type { Organization } from '../../types/guild';
import { BriefcaseBusiness, User, Phone, Mail, MapPin, FileText, ChevronRight, X, Save } from 'lucide-react';

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
    city: profile?.jurisdiction.cityName || '',
    address: '',
    description: ''
  });
  const [status, setStatus] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setStatus('Synchronizing Ledger...');
    try {
      // Stress Test: Duplicate Detection
      const existing = await detectDuplicates('organizations', 'name', form.name);
      if (existing.length > 0) {
        throw new Error(`CRITICAL: Organization "${form.name}" already exists in the Federation ledger.`);
      }

      await createLedgerRecord('organizations', {
        ...form,
        searchName: form.name.toLowerCase(),
        needs: [],
        opportunities: [],
        currentStatus: 'new',
        trustLevel: 'new',
        relationshipNotes: '',
        jurisdiction: profile.jurisdiction
      }, profile, 'Organization Created');
      setStatus('');
      onSuccess();
    } catch (err: any) {
      setStatus(err.message || 'Save failed.');
    }
  }

  return (
    <div className="panel !p-0 overflow-hidden shadow-[var(--shadow-lg)] border-[var(--primary)]/20 animate-in slide-in-from-top-4 duration-500">
      <div className="bg-[var(--card-subtle)] px-8 py-5 border-b border-[var(--border)] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
            <BriefcaseBusiness className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">Register New Organization</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Federation Partner Intake</p>
          </div>
        </div>
        <button className="p-2 hover:bg-[var(--bg)] rounded-full transition-colors text-[var(--text-muted)]" onClick={onCancel}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <form className="p-8 space-y-8" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">Partner Identity</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                  <BriefcaseBusiness className="w-3.5 h-3.5" /> Legal Entity Name
                </label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Acme Corporation" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Classification
                </label>
                <select required value={form.category} onChange={e => setForm({...form, category: e.target.value as any})}>
                  <option>Business</option><option>NGO</option><option>College</option>
                  <option>Contractor</option><option>Community Group</option><option>Government Related</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">Primary Liaison</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Contact Person
                </label>
                <input required value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} placeholder="Full Name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">Direct Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="name@org.com" />
                </div>
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="md:col-span-2 space-y-6 pt-4 border-t border-[var(--border)]">
             <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">Operational Context</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                     <MapPin className="w-3.5 h-3.5" /> Deployment City
                   </label>
                   <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City name" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-[var(--text-secondary)]">Physical Address</label>
                   <textarea rows={3} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full office address..." />
                 </div>
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-[var(--text-secondary)]">Mission Description</label>
                 <textarea rows={5} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What does this organization do? How will they work with the Guild?" />
               </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
             {status ? (
               <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] animate-pulse">
                 <Save className="w-4 h-4" /> {status}
               </div>
             ) : (
               <p className="text-xs text-[var(--text-muted)] italic leading-relaxed max-w-sm">
                 By registering this entity, you initiate the official Federation trust and verification protocol.
               </p>
             )}
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="ghost flex-1 md:flex-none" type="button" onClick={onCancel}>Cancel</button>
            <button className="primary flex-1 md:flex-none !px-10" type="submit" disabled={!!status}>
              Save Organization <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
