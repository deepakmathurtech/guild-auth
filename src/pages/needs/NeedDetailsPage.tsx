import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, subscribeRecords } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Need, Opportunity, Quest } from '../../types/guild';
import { where } from 'firebase/firestore';
import {
  ChevronLeft, Flag, Building2, MapPin,
  IndianRupee, Edit3, Sparkles, ClipboardCheck,
  ArrowRight, Info, Target, History, Sword
} from 'lucide-react';

export function NeedDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [need, setNeed] = useState<Need | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
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
    const unsubOpps = subscribeRecords('opportunities', setOpportunities, [where('needId', '==', id), where('archiveStatus', '==', 'active')]);
    const unsubQuests = subscribeRecords('quests', setQuests, [where('needId', '==', id), where('archiveStatus', '==', 'active')]);
    
    return () => { unsubOpps(); unsubQuests(); };
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
        revenue: need?.estimatedValue,
        showCreate: true
      }
    });
  }

  function handleCreateQuest() {
    navigate('/quests/register', {
      state: {
        needId: need?.id,
        title: need?.title,
        description: need?.description,
        orgId: need?.organizationId,
        orgName: need?.organizationName,
        priority: need?.priority,
        location: need?.location,
        city: need?.city,
        revenue: need?.estimatedValue,
        showCreate: true
      }
    });
  }

  if (!need) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)]" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
          <button 
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" 
            onClick={() => navigate('/needs')}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Needs Pipeline
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`badge priority-${need.priority} !border-none !rounded-md`}>
                {need.priority} Priority
              </span>
              <StatusBadge status={need.status} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{need.title}</h1>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
              <Building2 className="w-4 h-4" />
              <span>{need.organizationName}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button className="secondary flex-1 md:flex-none" onClick={() => setEditMode(!editMode)}>
            <Edit3 className="w-4 h-4" /> {editMode ? 'Cancel' : 'Edit Need'}
          </button>
          <button className="secondary flex-1 md:flex-none" onClick={handleConvert}>
            <Sparkles className="w-4 h-4" /> Convert to Opportunity
          </button>
          <button className="primary flex-1 md:flex-none" onClick={handleCreateQuest}>
            <Sword className="w-4 h-4" /> Create Quest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        <div className="space-y-10">
          {/* Main Info */}
          <section className="panel">
            <div className="flex items-center gap-3 mb-8">
              <Info className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold tracking-tight">Requirement Details</h2>
            </div>
            
            {editMode ? (
              <form className="space-y-6" onSubmit={saveEdits}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Title</label>
                    <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Priority</label>
                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})}>
                      <option>low</option><option>medium</option><option>high</option><option>urgent</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                      <option value="submitted">Submitted</option>
                      <option value="underReview">Under Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="convertedToOpportunity">Converted to Opportunity</option>
                      <option value="questCreationInProgress">Quest In Progress</option>
                      <option value="inProgress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Value (INR)</label>
                    <input type="number" value={form.estimatedValue} onChange={e => setForm({...form, estimatedValue: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Description</label>
                  <textarea rows={6} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button className="ghost !py-2.5" type="button" onClick={() => setEditMode(false)}>Cancel</button>
                  <button className="primary !py-2.5 px-8" type="submit">Save Changes</button>
                </div>
              </form>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Estimated Value</p>
                    <p className="text-2xl font-bold text-[var(--text)] flex items-center gap-1">
                      <IndianRupee className="w-5 h-5 text-emerald-500" /> {Number(need.estimatedValue || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Deployment</p>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" /> {need.location || need.city || 'National'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Organization</p>
                    <p className="text-sm font-semibold">{need.organizationName || 'Unknown'}</p>
                  </div>
                </div>
                
                <div className="p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Case Briefing</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap">{need.description}</p>
                </div>
              </div>
            )}
          </section>

          {/* Work Generated */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold tracking-tight">Work Generated (Quests)</h2>
            </div>
            
            <div className="table-wrap">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th className="pl-6">Quest ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Completeness</th>
                    <th className="pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {quests.map(quest => (
                    <tr key={quest.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                      <td className="pl-6 py-4 font-mono text-[10px] font-bold text-sky-500">{quest.guildQuestId}</td>
                      <td className="text-sm font-bold">{quest.title}</td>
                      <td><StatusBadge status={quest.status} /></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${quest.completenessScore || 0}%` }} />
                          </div>
                          <span className="text-[10px] font-bold">{quest.completenessScore || 0}%</span>
                        </div>
                      </td>
                      <td className="pr-6 text-right">
                        <button className="secondary !py-1.5 !px-3 text-[10px]" onClick={() => navigate(`/quests/${quest.id}`)}>View Record</button>
                      </td>
                    </tr>
                  ))}
                  {quests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <p className="text-[var(--text-muted)] text-sm italic">No quests have been generated for this need yet.</p>
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
          <section className="panel p-6 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-600">Active Opportunities</h2>
            </div>
            
            {opportunities.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">No opportunities have been linked to this need.</p>
                <button className="w-full secondary !py-2 text-xs !bg-[var(--bg)]" onClick={handleConvert}>Create Opportunity</button>
              </div>
            ) : (
              <div className="space-y-3">
                {opportunities.map(opp => (
                  <div key={opp.id} className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-emerald-500 transition-all cursor-pointer group" onClick={() => navigate(`/opportunities/${opp.id}`)}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold truncate pr-4">{opp.title}</p>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{opp.category}</span>
                      <StatusBadge status={opp.status} className="!text-[8px] !px-1.5" />
                    </div>
                  </div>
                ))}
                <button className="w-full mt-4 secondary !py-2 text-xs !bg-[var(--bg)]" onClick={handleConvert}>
                   Create Another
                </button>
              </div>
            )}
          </section>

          <div className="p-6 rounded-[2rem] bg-[var(--card-subtle)] border border-[var(--border)]">
             <div className="flex items-center gap-2 mb-4">
               <History className="w-4 h-4 text-[var(--text-muted)]" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Audit Information</span>
             </div>
             <div className="space-y-4">
               <div>
                 <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Created At</p>
                 <p className="text-xs font-medium">{need.createdAt ? new Date(need.createdAt).toLocaleString() : 'N/A'}</p>
               </div>
               <div>
                 <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Last Updated</p>
                 <p className="text-xs font-medium">{need.updatedAt ? new Date(need.updatedAt).toLocaleString() : 'N/A'}</p>
               </div>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

