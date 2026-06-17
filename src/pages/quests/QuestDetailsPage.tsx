import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, subscribeRecords, updateLedgerRecord } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Quest, QuestSubmission, GuildUser, Outcome, KnowledgeRecord, RevenueEvent, Need, Opportunity } from '../../types/guild';
import { where } from 'firebase/firestore';
import { MemberSearch } from '../../components/MemberSearch';
import { ChevronDown, ChevronRight, FileText, CheckCircle, IndianRupee, ShieldCheck, History, BookOpen, Building, MapPin, Users } from 'lucide-react';
import { assignMemberToQuest } from '../../services/workflowService';

// Reusable Section Component
function CollapsibleSection({ title, icon, children, defaultOpen = false }: { title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border)] rounded-md mb-4 overflow-hidden bg-[var(--card)]">
      <button 
        className="w-full flex items-center justify-between p-4 bg-[var(--bg-alt)] hover:bg-gray-800 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-bold flex items-center gap-2">{icon} {title}</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && <div className="p-4 border-t border-[var(--border)]">{children}</div>}
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
      // Refresh local state or rely on subscription
      const updated = await getRecord('quests', quest.id);
      if (updated) setQuest(updated as Quest);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleApply() {
    if (!quest || !profile) return;
    // For applicants, we could also use a transaction, but let's at least use optimistic locking
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
      // Also remove from applicants
      const newApplicants = (quest.applicants || []).filter(a => a !== uid);
      await updateLedgerRecord('quests', quest.id, { applicants: newApplicants }, profile, `Accepted Applicant ${uid}`);
      const updated = await getRecord('quests', quest.id);
      if (updated) setQuest(updated as Quest);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!quest) return <p className="p-8">Loading official guild record...</p>;

  return (
    <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <button className="ghost text-sm flex items-center gap-1" onClick={() => navigate('/quests')}>&larr; Back to Quest Registry</button>
        <span className="text-xs text-[var(--muted)] uppercase tracking-widest font-bold">Guild Record System</span>
      </div>

      {/* SUMMARY CARD (Receptionist Reality Test) */}
      <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 p-6 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
           <StatusBadge status={quest.status} />
        </div>
        <p className="text-blue-400 font-mono font-bold text-sm tracking-wider mb-1">{quest.guildQuestId || quest.id}</p>
        <h1 className="text-3xl font-bold mb-4">{quest.title}</h1>
        
        {/* MEMBER ACTIONS */}
        {profile?.role === 'member' && !quest.assignedMembers?.includes(profile.uid) && !quest.applicants?.includes(profile.uid) && quest.status === 'open' && (
          <div className="mb-6">
            <button className="primary w-full md:w-auto" onClick={handleApply}>Apply for this Quest</button>
          </div>
        )}
        {profile?.role === 'member' && quest.applicants?.includes(profile.uid) && (
          <div className="mb-6 bg-blue-500/20 border border-blue-500/50 p-3 rounded text-sm text-blue-200">
            You have applied for this quest. Waiting for receptionist review.
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Organization</p>
            <p className="font-semibold">{quest.organizationName || quest.sourceName || 'Internal Guild'}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Receptionist</p>
            <p className="font-semibold">{quest.assignedReceptionistName || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Members</p>
            <p className="font-semibold">{quest.assignedMembers?.length || 0} Assigned</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Verifier</p>
            <p className="font-semibold">{quest.verifierName || 'Pending'}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Financial</p>
            <p className="font-semibold text-green-400">{quest.isPaid ? `Paid (${quest.paymentCurrency || '₹'}${quest.paymentAmount || 0})` : 'Unpaid Volunteer'}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Revenue Status</p>
            <p className="font-semibold">{quest.revenueStatus || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Outcome</p>
            <p className="font-semibold">{quest.outcomeStatus || 'Pending'}</p>
          </div>
          <div>
            <p className="text-[var(--muted)] text-xs uppercase mb-1">Knowledge</p>
            <p className="font-semibold">{quest.knowledgeSubmitted ? 'Submitted' : 'Pending'}</p>
          </div>
        </div>
        
        {/* RECEPTIONIST WORKFLOW AUDIT */}
        <div className="mt-6 pt-4 border-t border-blue-500/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-bold text-[var(--muted)]">Quest Completeness Score</span>
            <span className="font-bold text-blue-400">{quest.completenessScore || 0}%</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-2.5 mb-4">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(quest.completenessScore || 0, 100)}%` }}></div>
          </div>
          {quest.missingActions && quest.missingActions.length > 0 && (
            <div className="bg-red-900/30 border border-red-500/30 p-3 rounded text-sm">
              <span className="font-bold text-red-400 uppercase text-xs">Missing Actions</span>
              <ul className="list-disc pl-5 mt-1 text-red-200">
                {quest.missingActions.map(action => <li key={action}>{action}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* SECTIONS */}
      <div className="mt-8 space-y-4">
        
        <CollapsibleSection title="1. Quest Information" icon={<FileText size={18}/>} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted)] uppercase mb-1">Title</label>
              <input className="w-full text-sm" value={quest.title} onChange={e => setQuest({...quest, title: e.target.value})} onBlur={e => handleUpdateField('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] uppercase mb-1">Category</label>
              <input className="w-full text-sm" value={quest.category} onChange={e => setQuest({...quest, category: e.target.value})} onBlur={e => handleUpdateField('category', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-[var(--muted)] uppercase mb-1">Description</label>
              <textarea className="w-full text-sm" rows={4} value={quest.description} onChange={e => setQuest({...quest, description: e.target.value})} onBlur={e => handleUpdateField('description', e.target.value)} />
            </div>
            <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Classification</label>
               <select className="w-full text-sm" value={quest.classification || ''} onChange={e => handleUpdateField('classification', e.target.value)}>
                 <option value="">Select...</option>
                 <option>Internal Guild</option><option>External Client</option><option>Community Service</option>
                 <option>Revenue Generating</option><option>Training</option><option>Partnership</option><option>Research</option><option>Emergency</option>
               </select>
            </div>
            <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Mode</label>
               <select className="w-full text-sm" value={quest.mode || ''} onChange={e => handleUpdateField('mode', e.target.value)}>
                 <option value="">Select...</option><option>Remote</option><option>Physical</option><option>Hybrid</option>
               </select>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="2. Source & Organization" icon={<Building size={18}/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Source Type</label>
               <select className="w-full text-sm" value={quest.sourceType || ''} onChange={e => handleUpdateField('sourceType', e.target.value)}>
                 <option value="">Select...</option><option>Organization</option><option>Individual</option>
                 <option>Guild Internal</option><option>Partner Organization</option><option>Government</option>
               </select>
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Source Name</label>
               <input className="w-full text-sm" value={quest.sourceName || ''} onChange={e => setQuest({...quest, sourceName: e.target.value})} onBlur={e => handleUpdateField('sourceName', e.target.value)} />
             </div>
             
             {/* BIDIRECTIONAL LINK DISPLAYS */}
             <div className="col-span-1 md:col-span-2 mt-4 p-4 bg-[var(--bg-alt)] border border-[var(--border)] rounded">
                <h4 className="font-bold text-sm mb-2">Linked Need</h4>
                {linkedNeed ? (
                  <div className="flex justify-between items-center text-sm">
                    <span>{linkedNeed.title}</span>
                    <button className="ghost text-xs" onClick={() => navigate(`/needs/${linkedNeed.id}`)}>Open &rarr;</button>
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">No Need Linked</p>}
             </div>
             
             <div className="col-span-1 md:col-span-2 p-4 bg-[var(--bg-alt)] border border-[var(--border)] rounded">
                <h4 className="font-bold text-sm mb-2">Linked Opportunity</h4>
                {linkedOpp ? (
                  <div className="flex justify-between items-center text-sm">
                    <span>{linkedOpp.title}</span>
                    <button className="ghost text-xs" onClick={() => navigate(`/opportunities/${linkedOpp.id}`)}>Open &rarr;</button>
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">No Opportunity Linked</p>}
             </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="3. Requirements & Logistics" icon={<CheckCircle size={18}/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Required Rank</label>
               <select className="w-full text-sm" value={quest.requiredRank || 'Applicant'} onChange={e => handleUpdateField('requiredRank', e.target.value)}>
                 <option>Applicant</option><option>F</option><option>E</option><option>D</option>
                 <option>C</option><option>B</option><option>A</option><option>S</option>
               </select>
            </div>
            <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Priority</label>
               <select className="w-full text-sm" value={quest.priority || 'medium'} onChange={e => handleUpdateField('priority', e.target.value)}>
                 <option>low</option><option>medium</option><option>high</option><option>urgent</option>
               </select>
            </div>
            <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Estimated Hours</label>
               <input type="number" className="w-full text-sm" value={quest.estimatedHours || 0} onChange={e => handleUpdateField('estimatedHours', Number(e.target.value))} />
            </div>
            <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Difficulty</label>
               <select className="w-full text-sm" value={quest.difficulty || 'medium'} onChange={e => handleUpdateField('difficulty', e.target.value)}>
                 <option>easy</option><option>medium</option><option>hard</option><option>legendary</option>
               </select>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="4. Payment & Revenue" icon={<IndianRupee size={18}/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <div className="col-span-full">
               <label className="flex items-center space-x-2 text-sm font-bold text-yellow-400">
                 <input type="checkbox" checked={quest.isPaid || false} onChange={e => handleUpdateField('isPaid', e.target.checked)} />
                 <span>This is a Paid Quest</span>
               </label>
             </div>
             
             {quest.isPaid && (
               <>
                 <div>
                   <label className="block text-xs text-[var(--muted)] uppercase mb-1">Payment Amount</label>
                   <input type="number" className="w-full text-sm" value={quest.paymentAmount || 0} onChange={e => handleUpdateField('paymentAmount', Number(e.target.value))} />
                 </div>
                 <div>
                   <label className="block text-xs text-[var(--muted)] uppercase mb-1">Currency</label>
                   <input className="w-full text-sm" value={quest.paymentCurrency || 'INR'} onChange={e => setQuest({...quest, paymentCurrency: e.target.value})} onBlur={e => handleUpdateField('paymentCurrency', e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-xs text-[var(--muted)] uppercase mb-1">Who Pays?</label>
                   <select className="w-full text-sm" value={quest.whoPays || ''} onChange={e => handleUpdateField('whoPays', e.target.value)}>
                     <option value="">Select...</option><option>Organization</option><option>Guild</option><option>Partner</option><option>Individual</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs text-[var(--muted)] uppercase mb-1">Payment Status</label>
                   <select className="w-full text-sm" value={quest.paymentStatus || 'Pending'} onChange={e => handleUpdateField('paymentStatus', e.target.value)}>
                     <option>Pending</option><option>Approved</option><option>Paid</option><option>Rejected</option>
                   </select>
                 </div>
               </>
             )}

             <div className="col-span-full mt-4 border-t border-[var(--border)] pt-4"><h4 className="text-sm font-bold mb-2">Financial Breakdown</h4></div>
             
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Estimated Value</label>
               <input type="number" className="w-full text-sm" value={quest.estimatedValue || 0} onChange={e => handleUpdateField('estimatedValue', Number(e.target.value))} />
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Expected Guild Revenue</label>
               <input type="number" className="w-full text-sm" value={quest.guildRevenue || 0} onChange={e => handleUpdateField('guildRevenue', Number(e.target.value))} />
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Expected Member Payout</label>
               <input type="number" className="w-full text-sm" value={quest.memberPayout || 0} onChange={e => handleUpdateField('memberPayout', Number(e.target.value))} />
             </div>
             
             <div className="col-span-full mt-4 border-t border-[var(--border)] pt-4">
                <h4 className="font-bold text-sm mb-2">Logged Revenue Events</h4>
                {revenue.map(rev => (
                  <div key={rev.id} className="flex justify-between items-center bg-[var(--bg-alt)] border border-[var(--border)] rounded p-2 mb-2 text-sm">
                     <span>{rev.source}</span>
                     <span className="font-bold text-green-400">₹{rev.amount}</span>
                  </div>
                ))}
                {revenue.length === 0 && <p className="text-sm text-[var(--muted)]">No revenue logged yet.</p>}
             </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="5. Member Assignment" icon={<Users size={18}/>}>
          {profile?.role === 'receptionist' && (
            <>
              <div className="mb-4">
                 <label className="block text-xs text-[var(--muted)] uppercase mb-1">Add Member to Quest</label>
                 <MemberSearch onSelect={handleAssignMember} />
              </div>
              
              {quest.applicants && quest.applicants.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold mb-2 text-blue-400 uppercase tracking-tight">Pending Applicants</h4>
                  <div className="space-y-2">
                    {quest.applicants.map(uid => (
                      <div key={uid} className="flex justify-between items-center p-2 bg-blue-900/10 border border-blue-500/30 rounded">
                        <span className="text-sm font-mono">{uid}</span>
                        <button className="primary text-xs px-2 py-1" onClick={() => handleAcceptApplicant(uid)}>Accept</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <h4 className="text-sm font-bold mb-2 uppercase tracking-tight">Assigned Members</h4>
            <div className="space-y-2">
              {quest.assignedMembers?.map(uid => (
                <div key={uid} className="flex justify-between items-center p-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded">
                  <span className="text-sm font-mono">{uid}</span>
                  <StatusBadge status="Assigned" />
                </div>
              ))}
              {(!quest.assignedMembers || quest.assignedMembers.length === 0) && <p className="text-sm text-[var(--muted)]">No members assigned.</p>}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="6. Verification" icon={<ShieldCheck size={18}/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Verification Level</label>
               <select className="w-full text-sm" value={quest.verificationLevel || 'Receptionist Verified'} onChange={e => handleUpdateField('verificationLevel', e.target.value)}>
                 <option>Self Verified</option><option>Receptionist Verified</option><option>Manager Verified</option><option>External Verified</option>
               </select>
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Verification Method</label>
               <select className="w-full text-sm" value={quest.verificationMethod || 'manualReview'} onChange={e => handleUpdateField('verificationMethod', e.target.value)}>
                 <option value="reportReview">Report Review</option><option value="documentUpload">Document Upload</option><option value="manualReview">Manual Review</option>
               </select>
             </div>
          </div>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h4 className="text-sm font-bold mb-2">Submissions</h4>
            {submissions.map(sub => (
              <div key={sub.id} className="border border-gray-700 p-4 rounded bg-gray-800 mb-2">
                <div className="flex justify-between mb-2">
                  <strong>Member: {sub.memberId}</strong>
                  <StatusBadge status={sub.status} />
                </div>
                {sub.report && <p className="text-sm italic mb-2">&quot;{sub.report}&quot;</p>}
                <button className="ghost text-xs" onClick={() => navigate(`/submissions/${sub.id}`)}>Review Submission &rarr;</button>
              </div>
            ))}
            {submissions.length === 0 && <p className="text-sm text-[var(--muted)]">No submissions yet.</p>}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="7. Outcome" icon={<MapPin size={18}/>}>
          <div className="grid grid-cols-1 gap-4">
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Expected Outcome</label>
               <textarea className="w-full text-sm" rows={2} value={quest.expectedOutcome || ''} onChange={e => setQuest({...quest, expectedOutcome: e.target.value})} onBlur={e => handleUpdateField('expectedOutcome', e.target.value)} />
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Actual Outcome</label>
               <textarea className="w-full text-sm" rows={2} value={quest.actualOutcome || ''} onChange={e => setQuest({...quest, actualOutcome: e.target.value})} onBlur={e => handleUpdateField('actualOutcome', e.target.value)} />
             </div>
             <div className="md:w-1/2">
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Outcome Status</label>
               <select className="w-full text-sm" value={quest.outcomeStatus || ''} onChange={e => handleUpdateField('outcomeStatus', e.target.value)}>
                 <option value="">Pending</option><option>Success</option><option>Partial Success</option><option>Failed</option>
               </select>
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Impact Summary</label>
               <textarea className="w-full text-sm" rows={3} value={quest.impactSummary || ''} onChange={e => setQuest({...quest, impactSummary: e.target.value})} onBlur={e => handleUpdateField('impactSummary', e.target.value)} />
             </div>
          </div>
          
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h4 className="font-bold text-sm mb-2">Logged Outcomes</h4>
            {outcomes.map(out => (
              <div key={out.id} className="flex justify-between items-center bg-[var(--bg-alt)] border border-[var(--border)] rounded p-2 mb-2 text-sm">
                 <span>{out.title}</span>
                 <StatusBadge status={out.verificationStatus} />
              </div>
            ))}
            {outcomes.length === 0 && <p className="text-sm text-[var(--muted)]">No formal outcome documented yet.</p>}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="8. Knowledge" icon={<BookOpen size={18}/>}>
           <div className="grid grid-cols-1 gap-4">
             <div className="flex items-center space-x-2 text-sm font-bold">
               <input type="checkbox" checked={quest.knowledgeRequired || false} onChange={e => handleUpdateField('knowledgeRequired', e.target.checked)} />
               <span>Knowledge Entry Required for this Quest</span>
             </div>
             
             <div className="border-t border-[var(--border)] pt-4">
               <h4 className="font-bold text-sm mb-2">Knowledge Entries</h4>
               {knowledge.map(k => (
                 <div key={k.id} className="flex justify-between items-center bg-[var(--bg-alt)] border border-[var(--border)] rounded p-2 mb-2 text-sm">
                    <span>{k.title}</span>
                    <span className="role-pill">{k.type}</span>
                 </div>
               ))}
               {knowledge.length === 0 && <p className="text-sm text-[var(--muted)]">No knowledge entries submitted.</p>}
             </div>
             
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Lessons Learned (Direct)</label>
               <textarea className="w-full text-sm" rows={3} value={quest.lessonsLearned || ''} onChange={e => setQuest({...quest, lessonsLearned: e.target.value})} onBlur={e => handleUpdateField('lessonsLearned', e.target.value)} />
             </div>
           </div>
        </CollapsibleSection>

        <CollapsibleSection title="9. Audit History (Timeline)" icon={<History size={18}/>}>
          <div className="space-y-4">
             <div className="flex justify-between items-center text-sm border-b border-[var(--border)] pb-2">
               <span className="text-[var(--muted)]">Quest Created</span>
               <span className="font-mono">{quest.createdAt ? new Date(quest.createdAt).toLocaleString() : 'N/A'}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-[var(--border)] pb-2">
               <span className="text-[var(--muted)]">Last Updated</span>
               <span className="font-mono">{quest.updatedAt ? new Date(quest.updatedAt).toLocaleString() : 'N/A'}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-[var(--border)] pb-2">
               <span className="text-[var(--muted)]">Assigned Receptionist</span>
               <span className="font-mono">{quest.assignedReceptionistId || 'N/A'}</span>
             </div>
             {/* Timeline from the new object if it existed */}
             {quest.timeline && Object.entries(quest.timeline).map(([event, time]) => (
               <div key={event} className="flex justify-between items-center text-sm border-b border-[var(--border)] pb-2">
                 <span className="text-[var(--muted)] capitalize">{event.replace(/([A-Z])/g, ' $1').trim()}</span>
                 <span className="font-mono">{new Date(time).toLocaleString()}</span>
               </div>
             ))}
          </div>
        </CollapsibleSection>

      </div>
    </section>
  );
}
