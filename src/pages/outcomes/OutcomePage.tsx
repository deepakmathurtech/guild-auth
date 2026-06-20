import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords, createLedgerRecord, getRecord } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Outcome } from '../../types/guild';
import { EmptyState } from '../../components/EmptyState';

export function OutcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [showCreate, setShowCreate] = useState(location.state?.oppId ? true : false);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    title: location.state?.title || '',
    relatedOpportunityId: location.state?.oppId || '',
    participants: '',
    organizationId: location.state?.orgId || '',
    organizationName: location.state?.orgName || '',
    evidence: '',
    revenueGenerated: 0,
    lessonsLearned: ''
  });

  useEffect(() => {
    if (!profile) return;
    const base = [where('archiveStatus', '==', 'active')];
    if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) {
       // National see all
    } else if (profile.role === 'stateGuildMaster') {
       base.push(where('jurisdiction.stateId', '==', profile.jurisdiction.stateId));
    } else {
       base.push(where('jurisdiction.cityId', '==', profile.jurisdiction.cityId));
    }

    return subscribeRecords('outcomes', setOutcomes, [
      ...base,
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, [profile]);

  const visible = useMemo(() => {
    return outcomes.filter(outcome => {
      if (search && !outcome.title.toLowerCase().includes(search.toLowerCase()) && !outcome.organizationName?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [outcomes, search]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    try {
      if (!form.relatedOpportunityId) {
        throw new Error('Opportunity ID is required.');
      }
      
      const opp = await getRecord('opportunities', form.relatedOpportunityId) as any;
      if (!opp || opp.status !== 'completed') {
        throw new Error('Cannot create Outcome: The linked Opportunity must be marked as "completed" first.');
      }

      if (form.revenueGenerated < 0) {
        throw new Error('Revenue Generated cannot be negative.');
      }

      // Create Outcome
      const outcomeRecord = await createLedgerRecord('outcomes', {
        ...form,
        participants: form.participants.split(',').map(s => s.trim()).filter(Boolean),
        evidence: form.evidence.split(',').map(s => s.trim()).filter(Boolean),
        verificationStatus: 'verified', // Usually Outcomes are logged post-verification
        jurisdiction: profile.jurisdiction
      }, profile, 'Outcome Recorded');

      // If Revenue > 0, also create a Revenue Event
      if (form.revenueGenerated > 0) {
        await createLedgerRecord('revenueEvents', {
          source: 'Opportunity Outcome',
          category: 'service',
          opportunityId: form.relatedOpportunityId,
          organizationId: form.organizationId,
          organizationName: form.organizationName,
          amount: form.revenueGenerated,
          date: new Date().toISOString().split('T')[0],
          participants: outcomeRecord.participants,
          jurisdiction: profile.jurisdiction
        }, profile, 'Revenue Recorded from Outcome');
      }

      setShowCreate(false);
      navigate('.', { replace: true, state: {} });
    } catch (err: any) {
      alert(err.message || 'Save failed.');
    }
  }

  return (
    <section className="workbench">
      <div className="panel intro flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Outcomes & Knowledge</p>
          <h2>Record Verified Value</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Close the loop after verified work by recording value, participants, evidence, and lessons learned.</p>
        </div>
        <button className="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Close Form' : 'Record Outcome'}
        </button>
      </div>

      {showCreate && (
        <form className="panel form-grid" onSubmit={submit}>
          <h3 className="span-2">Record New Outcome</h3>
          {form.relatedOpportunityId && <p className="span-2 text-green-400 text-sm">Linked to Opportunity: {form.relatedOpportunityId}</p>}
          <label className="span-2">Title <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></label>
          <label>Opportunity ID <input required value={form.relatedOpportunityId} onChange={e => setForm({...form, relatedOpportunityId: e.target.value})} /></label>
          <label>Organization <input value={form.organizationName} onChange={e => setForm({...form, organizationName: e.target.value})} /></label>
          <label>Participants (UIDs) <input placeholder="Comma separated" value={form.participants} onChange={e => setForm({...form, participants: e.target.value})} /></label>
          <label>Evidence URLs <input placeholder="Comma separated" value={form.evidence} onChange={e => setForm({...form, evidence: e.target.value})} /></label>
          <label>Revenue Generated <input type="number" value={form.revenueGenerated} onChange={e => setForm({...form, revenueGenerated: Number(e.target.value)})} /></label>
          <label className="span-2">Lessons Learned <textarea required placeholder="What did the guild learn from this?" value={form.lessonsLearned} onChange={e => setForm({...form, lessonsLearned: e.target.value})} /></label>
          <div className="span-2 flex space-x-2 mt-4">
            <button className="primary" type="submit">Save Outcome & Revenue</button>
            <button className="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="panel">
        <input className="search mb-4" placeholder="Search outcomes..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="table-wrap">
          <table className="responsive-table">
            <thead><tr><th>Title</th><th>Organization</th><th>Revenue</th><th>Participants</th><th>Status</th></tr></thead>
            <tbody>
              {visible.map(outcome => (
                <tr key={outcome.id}>
                  <td data-label="Title"><strong>{outcome.title}</strong></td>
                  <td data-label="Organization">{outcome.organizationName || '-'}</td>
                  <td data-label="Revenue">INR {Number(outcome.revenueGenerated || 0).toLocaleString('en-IN')}</td>
                  <td data-label="Participants">{outcome.participants?.length || 0}</td>
                  <td data-label="Status"><StatusBadge status={outcome.verificationStatus} /></td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={5}><EmptyState title="No Outcomes Recorded Yet" description="Once an opportunity is completed and verified, record the outcome here so revenue and knowledge can be generated from it." action={<button className="primary" onClick={() => setShowCreate(true)}>Record Outcome</button>} /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
