import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Opportunity, Quest, GuildUser } from '../../types/guild';
import { where } from 'firebase/firestore';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  ChevronLeft, Sparkles, Building2, IndianRupee, 
  Users, ClipboardCheck, Edit3, Plus, 
  ArrowUpRight, Info, Target, History,
  TrendingUp, CheckCircle2, Clock, Wallet, UserPlus
} from 'lucide-react';

export function OpportunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Opportunity>>({});
  const [newMemberId, setNewMemberId] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecord('opportunities', id).then(data => {
      if (data) {
        setOpp(data);
        setForm(data);
      }
    });
    
    return subscribeRecords('quests', setQuests, [where('opportunityId', '==', id), where('archiveStatus', '==', 'active')]);
  }, [id]);

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!opp || !profile) return;
    await updateLedgerRecord('opportunities', opp.id, form, profile, 'Opportunity Updated');
    setOpp({ ...opp, ...form });
    setEditMode(false);
  }

  async function assignMember(e: React.FormEvent) {
    e.preventDefault();
    if (!opp || !profile || !newMemberId) return;
    const newAssigned = [...(opp.assignedMembers || []), newMemberId];
    await updateLedgerRecord('opportunities', opp.id, { assignedMembers: newAssigned }, profile, 'Member Assigned to Opportunity');
    setOpp({ ...opp, assignedMembers: newAssigned });
    setNewMemberId('');
  }

  if (!opp) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
    </div>
  );

  const stats = {
    total: quests.length,
    open: quests.filter(q => q.status === 'open' || q.status === 'inProgress').length,
    completed: quests.filter(q => q.status === 'completed' || q.status === 'closed').length,
    revenue: quests.reduce((acc, q) => acc + (q.paymentAmount || 0), 0)
  };

  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
          <button 
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" 
            onClick={() => navigate('/opportunities')}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Work Pipeline
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="role-pill !bg-sky-500/10 !text-sky-500 !border-sky-500/20">
                {opp.category}
              </span>
              <StatusBadge status={opp.status} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{opp.title}</h1>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
              <Building2 className="w-4 h-4 text-[var(--primary)]" />
              <span>{opp.organizationName}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button className="secondary flex-1 md:flex-none" onClick={() => setEditMode(!editMode)}>
            <Edit3 className="w-4 h-4" /> {editMode ? 'Cancel' : 'Modify Opportunity'}
          </button>
          {opp.status === 'completed' ? (
            <button className="primary flex-1 md:flex-none" onClick={() => navigate('/outcomes', { state: { oppId: opp.id, title: opp.title, orgId: opp.organizationId, orgName: opp.organizationName } })}>
              <Target className="w-4 h-4" /> Record Outcome
            </button>
          ) : (
            <button className="primary flex-1 md:flex-none" onClick={() => navigate('/quests/register', { state: { oppId: opp.id, title: opp.title, orgId: opp.organizationId, orgName: opp.organizationName, needId: opp.needId, showWizard: true } })}>
              <Sparkles className="w-4 h-4" /> Spawn Quest
            </button>
          )}
        </div>
      </div>

      {/* Health Summary Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Total Quests</span>
            <ClipboardCheck className="w-4 h-4 text-sky-500" />
          </div>
          <strong className="text-sky-500">{stats.total}</strong>
        </div>
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Active Movement</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <strong className="text-amber-500">{stats.open}</strong>
        </div>
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Fulfilled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-emerald-500">{stats.completed}</strong>
        </div>
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Tracked Revenue</span>
            <Wallet className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <strong className="text-[var(--primary)]">₹{stats.revenue.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        <div className="space-y-10">
          {/* Main Info */}
          <section className="panel">
            <div className="flex items-center gap-3 mb-8">
              <Info className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold tracking-tight">Opportunity Scope</h2>
            </div>
            
            {editMode ? (
              <form className="space-y-6" onSubmit={saveEdits}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Title</label>
                    <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                      <option>draft</option><option>open</option><option>matching</option><option>assigned</option><option>inProgress</option><option>completed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Est. Revenue (INR)</label>
                    <input type="number" value={form.estimatedRevenue} onChange={e => setForm({...form, estimatedRevenue: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button className="ghost !py-2.5" type="button" onClick={() => setEditMode(false)}>Cancel</button>
                  <button className="primary !py-2.5 px-8" type="submit">Update Ledger</button>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Deployment Overview</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap">{opp.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Required Capabilities</p>
                    <div className="flex flex-wrap gap-2">
                      {opp.skillsRequired?.map(skill => (
                        <span key={skill} className="px-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-secondary)]">
                          {skill}
                        </span>
                      )) || <span className="text-xs text-[var(--text-muted)]">No specific skills listed</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Internal References</p>
                    <p className="text-xs font-mono text-sky-500">NEED_ID: {opp.needId?.slice(0, 8) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Quests List */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold tracking-tight">Active Quests</h2>
            </div>
            
            <div className="table-wrap">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th className="pl-6">Quest Identifier</th>
                    <th>Personnel</th>
                    <th>Status</th>
                    <th className="pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {quests.map(quest => (
                    <tr key={quest.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                      <td className="pl-6 py-4">
                        <p className="text-sm font-bold">{quest.title}</p>
                        <p className="font-mono text-[10px] text-sky-500 uppercase">{quest.guildQuestId}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                          <Users className="w-3.5 h-3.5" />
                          {quest.assignedMembers?.length || 0} Members
                        </div>
                      </td>
                      <td><StatusBadge status={quest.status} /></td>
                      <td className="pr-6 text-right">
                        <button className="secondary !py-1.5 !px-3 text-[10px]" onClick={() => navigate(`/quests/${quest.id}`)}>View Record</button>
                      </td>
                    </tr>
                  ))}
                  {quests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <p className="text-[var(--text-muted)] text-sm italic">No quests have been spawned for this mission yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Side Panel */}
        <aside className="space-y-8">
          <section className="panel p-6 border-sky-500/20 bg-sky-500/5">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="w-5 h-5 text-sky-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600">Assigned Personnel</h2>
            </div>
            
            <form className="flex gap-2 mb-6" onSubmit={assignMember}>
              <input 
                className="flex-1 !py-2 !text-xs !bg-[var(--bg)]" 
                placeholder="Member UID..." 
                value={newMemberId} 
                onChange={e => setNewMemberId(e.target.value)} 
                required 
              />
              <button className="primary !p-2 rounded-xl" type="submit">
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2">
              {opp.assignedMembers?.map(uid => (
                <div key={uid} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--card-subtle)] flex items-center justify-center text-[10px] font-bold">
                      {uid.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-secondary)]">{uid.slice(0, 12)}...</span>
                  </div>
                  <button className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
                    <Plus className="w-3 h-3 rotate-45" />
                  </button>
                </div>
              ))}
              {(!opp.assignedMembers || opp.assignedMembers.length === 0) && (
                <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">No personnel assigned yet.</p>
              )}
            </div>
          </section>

          <div className="p-6 rounded-[2rem] bg-[var(--card-subtle)] border border-[var(--border)]">
             <div className="flex items-center gap-2 mb-4">
               <History className="w-4 h-4 text-[var(--text-muted)]" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ledger Audit</span>
             </div>
             <div className="space-y-4">
               <div>
                 <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Creation Record</p>
                 <p className="text-xs font-medium">{new Date(opp.createdAt).toLocaleDateString()}</p>
               </div>
               <div>
                 <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Last Protocol Update</p>
                 <p className="text-xs font-medium">{new Date(opp.updatedAt).toLocaleDateString()}</p>
               </div>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

