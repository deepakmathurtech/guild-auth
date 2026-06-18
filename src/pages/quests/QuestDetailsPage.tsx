import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, subscribeRecords, updateLedgerRecord } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Quest, QuestSubmission, GuildUser, Outcome, KnowledgeRecord, RevenueEvent, Need, Opportunity } from '../../types/guild';
import { where } from 'firebase/firestore';
import { MemberSearch } from '../../components/MemberSearch';
import { 
  ChevronDown, ChevronRight, FileText, CheckCircle, 
  IndianRupee, ShieldCheck, History, BookOpen, 
  Building, MapPin, Users, ChevronLeft,
  Sparkles, Info, Target, Wallet, AlertCircle,
  ExternalLink, BarChart3, Clock, UserPlus
} from 'lucide-react';
import { assignMemberToQuest } from '../../services/workflowService';

// Reusable Section Component
function CollapsibleSection({ title, icon, children, defaultOpen = false, accent = 'blue' }: { title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean, accent?: string }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors: Record<string, string> = {
    blue: 'text-sky-500 bg-sky-500/5',
    emerald: 'text-emerald-500 bg-emerald-500/5',
    amber: 'text-amber-500 bg-amber-500/5',
    purple: 'text-purple-500 bg-purple-500/5',
    rose: 'text-rose-500 bg-rose-500/5',
    gold: 'text-[var(--primary)] bg-[var(--primary)]/5'
  };

  return (
    <div className="panel !p-0 overflow-hidden group">
      <button 
        className={`w-full flex items-center justify-between p-5 text-left transition-all ${isOpen ? 'bg-[var(--card-subtle)]' : 'hover:bg-[var(--card-subtle)]/50'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[accent] || colors.blue}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronRight className="w-5 h-5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />}
      </button>
      {isOpen && (
        <div className="p-6 border-t border-[var(--border)] animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function QuestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [quest, setQuest] = useState<Quest | null>(null);
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [revenue, setRevenue] = useState<RevenueEvent[]>([]);
  const [linkedNeed, setLinkedNeed] = useState<Need | null>(null);
  const [linkedOpp, setLinkedOpp] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (!id) return;
    getRecord('quests', id).then(async (data) => {
      const q = data as Quest;
      setQuest(q);
      if (q.needId) getRecord('needs', q.needId).then(n => setLinkedNeed(n as Need));
      if (q.opportunityId) getRecord('opportunities', q.opportunityId).then(o => setLinkedOpp(o as Opportunity));
    });
    
    const unsubSubs = subscribeRecords('questSubmissions', setSubmissions, [where('questId', '==', id), where('archiveStatus', '==', 'active')]);
    const unsubOuts = subscribeRecords('outcomes', setOutcomes, [where('questId', '==', id), where('archiveStatus', '==', 'active')]);
    const unsubKnow = subscribeRecords('knowledgeBase', setKnowledge, [where('questId', '==', id), where('archiveStatus', '==', 'active')]);
    const unsubRev = subscribeRecords('revenueEvents', setRevenue, [where('questId', '==', id), where('archiveStatus', '==', 'active')]);
    
    return () => { unsubSubs(); unsubOuts(); unsubKnow(); unsubRev(); };
  }, [id]);

  async function handleUpdateField(field: keyof Quest, value: any) {
    if (!quest || !profile) return;
    await updateLedgerRecord('quests', quest.id, { [field]: value }, profile, `Updated Quest ${field}`);
    setQuest({ ...quest, [field]: value });
  }

  async function handleAssignMember(user: GuildUser) {
    if (!quest || !profile) return;
    try {
      await assignMemberToQuest(quest.id, user.uid, profile);
      const updated = await getRecord('quests', quest.id);
      if (updated) setQuest(updated as Quest);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleApply() {
    if (!quest || !profile) return;
    try {
      const newApplicants = [...(quest.applicants || []), profile.uid];
      await updateLedgerRecord('quests', quest.id, { applicants: newApplicants }, profile, 'Applied for Quest', { checkUpdatedAt: quest.updatedAt });
      setQuest({ ...quest, applicants: newApplicants, updatedAt: new Date().toISOString() });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleAcceptApplicant(uid: string) {
    if (!quest || !profile) return;
    try {
      await assignMemberToQuest(quest.id, uid, profile);
      const newApplicants = (quest.applicants || []).filter(a => a !== uid);
      await updateLedgerRecord('quests', quest.id, { applicants: newApplicants }, profile, `Accepted Applicant ${uid}`);
      const updated = await getRecord('quests', quest.id);
      if (updated) setQuest(updated as Quest);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!quest) return (
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
            onClick={() => navigate('/quests')}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Quest Registry
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[10px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {quest.guildQuestId}
              </span>
              <StatusBadge status={quest.status} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{quest.title}</h1>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
              <Building className="w-4 h-4 text-[var(--primary)]" />
              <span>{quest.organizationName || quest.sourceName || 'Internal Guild'}</span>
            </div>
          </div>
        </div>

        {profile?.role === 'member' && !quest.assignedMembers?.includes(profile.uid) && !quest.applicants?.includes(profile.uid) && quest.status === 'open' && (
          <button className="primary !px-10 py-4 shadow-lg shadow-[var(--primary)]/20" onClick={handleApply}>
            Apply for this Quest
          </button>
        )}
        
        {profile?.role === 'member' && quest.applicants?.includes(profile.uid) && (
          <div className="px-6 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 font-bold text-sm flex items-center gap-3">
             <Clock className="w-4 h-4 animate-pulse" /> Application Pending Review
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="panel flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Quest Health</p>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold text-[var(--text)]">{quest.completenessScore || 0}%</span>
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Completeness</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--card-subtle)] rounded-full overflow-hidden border border-[var(--border)]">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${quest.completenessScore || 0}%` }} />
            </div>
          </div>
        </div>

        <div className="panel flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Financials</p>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <IndianRupee className="w-5 h-5" />
             </div>
             <div>
               <p className="text-lg font-bold text-[var(--text)]">
                 {quest.isPaid ? `${quest.paymentCurrency || '₹'}${quest.paymentAmount || 0}` : 'Volunteer'}
               </p>
               <p className="text-[10px] font-bold uppercase text-emerald-500/70">Estimated Payout</p>
             </div>
          </div>
        </div>

        <div className="panel flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Personnel</p>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
               <Users className="w-5 h-5" />
             </div>
             <div>
               <p className="text-lg font-bold text-[var(--text)]">{quest.assignedMembers?.length || 0} Members</p>
               <p className="text-[10px] font-bold uppercase text-sky-500/70">Active Unit</p>
             </div>
          </div>
        </div>

        <div className="panel flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Protocol</p>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
               <ShieldCheck className="w-5 h-5" />
             </div>
             <div>
               <p className="text-lg font-bold text-[var(--text)]">{quest.verificationLevel?.split(' ')[0] || 'System'}</p>
               <p className="text-[10px] font-bold uppercase text-purple-500/70">Security Clear</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        <div className="space-y-6">
          {/* Main Quest Data Sections */}
          <CollapsibleSection title="Core Briefing" icon={<FileText className="w-5 h-5" />} defaultOpen accent="gold">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Deployment Title</label>
                  <input className="text-sm font-medium" value={quest.title} onChange={e => setQuest({...quest, title: e.target.value})} onBlur={e => handleUpdateField('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Classification</label>
                  <select className="text-sm font-medium" value={quest.category} onChange={e => setQuest({...quest, category: e.target.value})} onBlur={e => handleUpdateField('category', e.target.value)}>
                    <option>Tech</option><option>Creative</option><option>Logistics</option><option>Security</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Mission Objective</label>
                <textarea className="text-sm leading-relaxed" rows={5} value={quest.description} onChange={e => setQuest({...quest, description: e.target.value})} onBlur={e => handleUpdateField('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Operational Mode</label>
                   <select className="text-sm font-medium" value={quest.mode || ''} onChange={e => handleUpdateField('mode', e.target.value)}>
                     <option value="">Select...</option><option>Remote</option><option>Physical</option><option>Hybrid</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Rank Requirement</label>
                   <select className="text-sm font-medium" value={quest.requiredRank || 'Applicant'} onChange={e => handleUpdateField('requiredRank', e.target.value)}>
                     <option>Applicant</option><option>F</option><option>E</option><option>D</option><option>C</option><option>B</option><option>A</option><option>S</option>
                   </select>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Source & Links" icon={<Building className="w-5 h-5" />} accent="sky">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Partner Entity</label>
                    <input className="text-sm font-medium" value={quest.sourceName || ''} onChange={e => setQuest({...quest, sourceName: e.target.value})} onBlur={e => handleUpdateField('sourceName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Deployment Zone</label>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" /> {linkedNeed?.location || 'National'}
                    </p>
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Federation Traces</p>
                  {linkedNeed && (
                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex justify-between items-center group/link hover:border-sky-500 transition-all cursor-pointer" onClick={() => navigate(`/needs/${linkedNeed.id}`)}>
                      <div className="flex items-center gap-3">
                        <Flag className="w-4 h-4 text-sky-500" />
                        <span className="text-xs font-bold truncate max-w-[140px]">{linkedNeed.title}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/link:text-sky-500" />
                    </div>
                  )}
                  {linkedOpp && (
                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex justify-between items-center group/link hover:border-emerald-500 transition-all cursor-pointer" onClick={() => navigate(`/opportunities/${linkedOpp.id}`)}>
                      <div className="flex items-center gap-3">
                        <Target className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold truncate max-w-[140px]">{linkedOpp.title}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/link:text-emerald-500" />
                    </div>
                  )}
               </div>
             </div>
          </CollapsibleSection>

          <CollapsibleSection title="Verification & Submissions" icon={<ShieldCheck className="w-5 h-5" />} accent="purple">
             <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Verification Depth</label>
                    <select className="text-sm font-medium" value={quest.verificationLevel || 'Receptionist Verified'} onChange={e => handleUpdateField('verificationLevel', e.target.value)}>
                      <option>Self Verified</option><option>Receptionist Verified</option><option>Manager Verified</option><option>External Verified</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Review Protocol</label>
                    <select className="text-sm font-medium" value={quest.verificationMethod || 'manualReview'} onChange={e => handleUpdateField('verificationMethod', e.target.value)}>
                      <option value="reportReview">Report Review</option><option value="documentUpload">Document Upload</option><option value="manualReview">Manual Review</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-4">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Member Submissions</h4>
                 {submissions.map(sub => (
                   <div key={sub.id} className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-purple-500/40 transition-all group/sub cursor-pointer" onClick={() => navigate(`/submissions/${sub.id}`)}>
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 text-[10px] font-bold">
                             {sub.memberId.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <p className="text-xs font-bold">Member Submission</p>
                             <p className="text-[9px] font-mono text-[var(--text-muted)]">{sub.id.slice(0, 12)}</p>
                           </div>
                         </div>
                         <StatusBadge status={sub.status} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] italic line-clamp-1 mb-2">&quot;{sub.report}&quot;</p>
                      <button className="w-full py-1.5 text-[10px] font-bold text-purple-500 uppercase tracking-widest opacity-0 group-hover/sub:opacity-100 transition-opacity">
                         Enter Review Chamber &rarr;
                      </button>
                   </div>
                 ))}
                 {submissions.length === 0 && (
                   <div className="py-10 text-center rounded-xl bg-[var(--bg)] border border-dashed border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)]">No active submissions awaiting review.</p>
                   </div>
                 )}
               </div>
             </div>
          </CollapsibleSection>
        </div>

        <aside className="space-y-8">
          {/* Workflow Health */}
          {quest.missingActions && quest.missingActions.length > 0 && (
            <section className="panel bg-rose-500/5 border-rose-500/20">
               <div className="flex items-center gap-2 mb-4">
                 <AlertCircle className="w-4 h-4 text-rose-500" />
                 <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500/80">Missing Protocols</h3>
               </div>
               <ul className="space-y-2">
                 {quest.missingActions.map(action => (
                   <li key={action} className="text-xs font-medium text-rose-500/90 flex items-start gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                     {action}
                   </li>
                 ))}
               </ul>
            </section>
          )}

          {/* Personnel Management */}
          <section className="panel p-6 border-sky-500/20 bg-sky-500/5">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-sky-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600">Personnel</h2>
                </div>
                <StatusBadge status="Active Unit" className="!bg-sky-500/20 !text-sky-500 !border-none !text-[9px]" />
             </div>

             {profile?.role === 'receptionist' && (
               <div className="mb-6 space-y-4">
                  <MemberSearch onSelect={handleAssignMember} />
                  
                  {quest.applicants && quest.applicants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-sky-600 tracking-widest">Pending Applications</p>
                      {quest.applicants.map(uid => (
                        <div key={uid} className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg)] border border-sky-500/20">
                          <span className="text-[11px] font-mono text-sky-600">{uid.slice(0, 12)}...</span>
                          <button className="primary !py-1 !px-3 !text-[9px] !rounded-md" onClick={() => handleAcceptApplicant(uid)}>Enlist</button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
             )}

             <div className="space-y-2">
               {quest.assignedMembers?.map(uid => (
                 <div key={uid} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 text-[10px] font-bold">
                      {uid.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-secondary)]">{uid.slice(0, 18)}...</span>
                 </div>
               ))}
               {(!quest.assignedMembers || quest.assignedMembers.length === 0) && (
                 <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">No personnel deployed.</p>
               )}
             </div>
          </section>

          {/* Audit History */}
          <section className="panel p-6">
             <div className="flex items-center gap-3 mb-6">
               <History className="w-5 h-5 text-[var(--primary)]" />
               <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ledger Trace</h2>
             </div>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">Deployed</span>
                  <span className="font-mono text-[var(--text-secondary)]">{quest.createdAt ? new Date(quest.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">Last Pulse</span>
                  <span className="font-mono text-[var(--text-secondary)]">{quest.updatedAt ? new Date(quest.updatedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">Operator ID</span>
                  <span className="font-mono text-[var(--text-secondary)]">{quest.assignedReceptionistId?.slice(0, 8) || 'AUTO'}</span>
                </div>
                
                {quest.timeline && (
                  <div className="pt-4 mt-4 border-t border-[var(--border)] space-y-3">
                    {Object.entries(quest.timeline).slice(0, 3).map(([event, time]) => (
                      <div key={event} className="flex justify-between items-center text-[10px]">
                        <span className="text-[var(--text-muted)] capitalize">{event.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-mono text-emerald-500">{new Date(time).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
