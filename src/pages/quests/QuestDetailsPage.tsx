import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, subscribeRecords, updateLedgerRecord } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Quest, QuestSubmission, GuildUser } from '../../types/guild';
import { where } from 'firebase/firestore';
import { MemberSearch } from '../../components/MemberSearch';
import { ChevronDown, ChevronRight, FileText, CheckCircle, IndianRupee, ShieldCheck, History, BookOpen, Building, MapPin, Users } from 'lucide-react';

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

  useEffect(() => {
    if (!id) return;
    getRecord('quests', id).then(data => setQuest(data as Quest));
    return subscribeRecords('questSubmissions', setSubmissions, [where('questId', '==', id), where('archiveStatus', '==', 'active')]);
  }, [id]);

  async function handleUpdateField(field: keyof Quest, value: any) {
    if (!quest || !profile) return;
    await updateLedgerRecord('quests', quest.id, { [field]: value }, profile, `Updated Quest ${field}`);
    setQuest({ ...quest, [field]: value });
  }

  async function handleAssignMember(user: GuildUser) {
    if (!quest || !profile) return;
    const newMembers = [...(quest.assignedMembers || []), user.uid];
    await updateLedgerRecord('quests', quest.id, { assignedMembers: newMembers }, profile, `Assigned Member ${user.uid}`);
    setQuest({ ...quest, assignedMembers: newMembers });
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
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Linked Organization ID</label>
               <input className="w-full text-sm" disabled value={quest.organizationId || 'None'} />
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Linked Opportunity ID</label>
               <input className="w-full text-sm" disabled value={quest.opportunityId || 'None'} />
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
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Guild Revenue / Commission</label>
               <input type="number" className="w-full text-sm" value={quest.guildRevenue || 0} onChange={e => handleUpdateField('guildRevenue', Number(e.target.value))} />
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Member Payout</label>
               <input type="number" className="w-full text-sm" value={quest.memberPayout || 0} onChange={e => handleUpdateField('memberPayout', Number(e.target.value))} />
             </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="5. Member Assignment" icon={<Users size={18}/>}>
          <div className="mb-4">
             <label className="block text-xs text-[var(--muted)] uppercase mb-1">Add Member to Quest</label>
             <MemberSearch onSelect={handleAssignMember} />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-2">Assigned Members</h4>
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
        </CollapsibleSection>

        <CollapsibleSection title="8. Knowledge" icon={<BookOpen size={18}/>}>
           <div className="grid grid-cols-1 gap-4">
             <div className="flex items-center space-x-2 text-sm font-bold">
               <input type="checkbox" checked={quest.knowledgeRequired || false} onChange={e => handleUpdateField('knowledgeRequired', e.target.checked)} />
               <span>Knowledge Entry Required for this Quest</span>
             </div>
             <div className="flex items-center space-x-2 text-sm">
               <input type="checkbox" checked={quest.knowledgeSubmitted || false} onChange={e => handleUpdateField('knowledgeSubmitted', e.target.checked)} />
               <span>Knowledge Entry Submitted</span>
             </div>
             <div>
               <label className="block text-xs text-[var(--muted)] uppercase mb-1">Lessons Learned</label>
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
