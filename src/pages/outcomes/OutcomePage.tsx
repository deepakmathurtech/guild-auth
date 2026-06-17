import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords, createLedgerRecord, getRecord } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Outcome } from '../../types/guild';

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
    return subscribeRecords('outcomes', setOutcomes, [
      where('archiveStatus', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, []);

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

      // Create Outcome
      const outcomeRecord = await createLedgerRecord('outcomes', {
        ...form,
        participants: form.participants.split(',').map(s => s.trim()).filter(Boolean),
        evidence: form.evidence.split(',').map(s => s.trim()).filter(Boolean),
        verificationStatus: 'verified' // Usually Outcomes are logged post-verification
      }, profile, 'Outcome Recorded');

      // If Revenue > 0, also create a Revenue Event
      if (form.revenueGenerated > 0) {
        await createLedgerRecord('revenueEvents', {
          source: 'Opportunity Outcome',
          opportunityId: form.relatedOpportunityId,
          organizationId: form.organizationId,
          organizationName: form.organizationName,
          amount: form.revenueGenerated,
          date: new Date().toISOString().split('T')[0],
          participants: outcomeRecord.participants
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
      <div className="panel intro flex justify-between items-start">
        <div>
          <p className="eyebrow">Outcomes & Knowledge</p>
          <h2>Record Verified Value</h2>
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
                  <td><strong>{outcome.title}</strong></td>
                  <td>{outcome.organizationName || '-'}</td>
                  <td>?{outcome.revenueGenerated}</td>
                  <td>{outcome.participants?.length || 0}</td>
                  <td><StatusBadge status={{outcome.verificationStatus}} /></td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={5}>No outcomes recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
