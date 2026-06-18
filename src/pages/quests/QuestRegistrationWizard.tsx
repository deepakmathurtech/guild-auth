import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircle2, Circle, FileCheck2, IndianRupee, 
  MapPin, ShieldCheck, Sparkles, UsersRound,
  ChevronRight, ChevronLeft, Flag, Target,
  Info, Wallet, ClipboardCheck, History
} from 'lucide-react';
import { createLedgerRecord } from '../../lib/repository';
import { generateGuildQuestId } from '../../services/workflowService';
import { useAuth } from '../../context/AuthContext';
import type { Quest } from '../../types/guild';
import { StatusBadge } from '../../components/StatusBadge';

const STEPS = [
  'Identity',
  'Source',
  'Location',
  'Personnel',
  'Financials',
  'Protocols',
  'Outcomes',
  'Registry'
];

function FieldLabel({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">
      <span className={required ? 'required' : ''}>{label}</span>
      {children}
      {help && <span className="field-help">{help}</span>}
    </label>
  );
}

function StepHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="mb-8 flex items-start gap-4 animate-in slide-in-from-left-4 duration-300">
      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shadow-inner border border-[var(--primary)]/20">
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function QuestRegistrationWizard() {
  const navigate = useNavigate();
  const locationState = useLocation();
  const { profile } = useAuth();
  
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState<Partial<Quest>>({
    title: locationState.state?.title || '',
    description: locationState.state?.description || '',
    category: '',
    classification: 'Internal Guild',
    priority: 'medium',
    sourceType: 'Organization',
    sourceName: locationState.state?.orgName || '',
    organizationId: locationState.state?.orgId || '',
    opportunityId: locationState.state?.oppId || '',
    needId: locationState.state?.needId || '',
    sourceContactPerson: '',
    sourcePhone: '',
    sourceEmail: '',
    location: { 
      city: profile?.jurisdiction.cityName || '', 
      state: profile?.jurisdiction.stateName || '', 
      country: 'India' 
    },
    mode: 'Remote',
    requiredRank: 'Applicant',
    requiredSkills: [],
    membersRequired: 1,
    estimatedHours: 0,
    difficulty: 'medium',
    questNature: 'Guild Duty',
    isMandatory: false,
    isPaid: false,
    paymentAmount: 0,
    paymentCurrency: 'INR',
    paymentType: 'UPI',
    whoPays: 'Organization',
    paymentStatus: 'Pending',
    estimatedValue: locationState.state?.revenue || 0,
    guildRevenue: 0,
    memberPayout: 0,
    verificationMethod: 'manualReview',
    verificationLevel: 'Receptionist Verified',
    knowledgeRequired: false,
    portfolioEligible: false,
    certificateEligible: false,
    expectedOutcome: '',
    rewards: 'Guild XP and verified portfolio credit',
    reputationPoints: 0
  });

  const updateForm = (field: keyof Quest, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const updateNested = (parent: 'location', field: string, value: string) => setForm(prev => ({ ...prev, [parent]: { ...(prev[parent] as any), [field]: value } }));
  const updateSkills = (value: string) => updateForm('requiredSkills', value.split(',').map(skill => skill.trim()).filter(Boolean));

  const completeness = useMemo(() => {
    let score = 0;
    const missing: string[] = [];
    if (form.title?.trim()) score += 10; else missing.push('Add a clear quest title');
    if (form.description?.trim()) score += 10; else missing.push('Describe the work');
    if (form.category?.trim()) score += 10; else missing.push('Choose a category');
    if (form.sourceName?.trim()) score += 10; else missing.push('Confirm source name');
    if (form.location?.city && form.location?.state) score += 10; else missing.push('Confirm location');
    if (form.requiredRank && form.membersRequired) score += 10; else missing.push('Set member requirements');
    if (!form.isPaid || Number(form.paymentAmount || 0) > 0) score += 10; else missing.push('Add payment amount');
    if (form.verificationMethod && form.verificationLevel) score += 10; else missing.push('Set verification method');
    if (form.expectedOutcome?.trim()) score += 15; else missing.push('Define expected outcome');
    if (form.rewards?.trim()) score += 5; else missing.push('Define member reward');
    return { score, missing };
  }, [form]);

  function canContinue() {
    if (step === 0) return Boolean(form.title?.trim() && form.description?.trim() && form.category?.trim());
    if (step === 1) return Boolean(form.sourceType && form.sourceName?.trim());
    if (step === 2) return Boolean(form.location?.city && form.location?.state && form.mode);
    if (step === 3) return Boolean(form.requiredRank && form.membersRequired && form.difficulty);
    if (step === 4) return !form.isPaid || Number(form.paymentAmount || 0) > 0;
    if (step === 5) return Boolean(form.verificationMethod && form.verificationLevel);
    if (step === 6) return Boolean(form.expectedOutcome?.trim());
    return true;
  }

  async function handleRegister() {
    if (!profile) return;
    setIsSubmitting(true);
    setError('');
    try {
      const newId = await generateGuildQuestId(
        profile.jurisdiction.cityName, 
        form.category || 'GEN',
        profile.jurisdiction.stateName
      );
      
      const questData: Partial<Quest> = {
        ...form,
        guildQuestId: newId,
        assignedReceptionistId: profile.uid,
        assignedReceptionistName: profile.fullName || profile.email,
        status: 'draft',
        completenessScore: completeness.score,
        missingActions: completeness.missing.length ? completeness.missing : ['Assignments Needed'],
        assignedMembers: [],
        applicants: [],
        jurisdiction: profile.jurisdiction,
        timeline: { created: new Date().toISOString() }
      };

      const record = await createLedgerRecord('quests', questData as any, profile, 'Quest Registered');
      navigate(`/quests/${record.id}`);
    } catch (err: any) {
      setError(err.message || 'Quest registration failed.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      {/* Header Panel */}
      <div className="hero-panel border-none shadow-none bg-[var(--card-subtle)] !p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <p className="eyebrow">Deployment Command</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Quest Registration</h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl leading-relaxed">
            Configure a professional case file for a new guild mission. 
            Define parameters, logistics, and verification protocols.
          </p>
        </div>
        
        <div className="p-8 rounded-[2.5rem] bg-[var(--bg)] border border-[var(--border)] text-center min-w-[200px] shadow-sm">
           <div className="flex justify-between items-end mb-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Operational Readiness</span>
             <span className="text-2xl font-bold text-[var(--primary)]">{completeness.score}%</span>
           </div>
           <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden mb-2">
             <div className="h-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${completeness.score}%` }} />
           </div>
           <p className="text-[10px] font-medium text-[var(--text-muted)]">
             {completeness.score >= 70 ? 'Ready for Deployment' : 'Insufficient Data'}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-10">
        {/* Navigation Sidebar */}
        <aside className="space-y-6">
           <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Configuration Steps</p>
           <nav className="space-y-1">
             {STEPS.map((item, idx) => (
               <button
                 key={item}
                 onClick={() => setStep(idx)}
                 className={`
                   w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                   ${step === idx 
                     ? 'bg-[var(--card)] text-[var(--text)] ring-1 ring-[var(--primary)]/30 shadow-md' 
                     : idx < step 
                       ? 'text-emerald-500 hover:bg-emerald-500/5' 
                       : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]'}
                 `}
               >
                 <span className={`
                   w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold
                   ${step === idx 
                     ? 'bg-[var(--primary)] text-black' 
                     : idx < step 
                       ? 'bg-emerald-500/20 text-emerald-500' 
                       : 'bg-[var(--card-subtle)] border border-[var(--border)]'}
                 `}>
                   {idx < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                 </span>
                 {item}
               </button>
             ))}
           </nav>
        </aside>

        {/* Form Area */}
        <div className="panel shadow-[var(--shadow-lg)] !p-0 overflow-hidden flex flex-col min-h-[600px]">
          <div className="flex-1 p-10">
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<Sparkles className="w-6 h-6" />} 
                  title="Mission Identity" 
                  description="Establish the core identity of this quest. Use clear, objective-focused naming conventions." 
                />
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="Deployment Title" required help="Professional, action-oriented title.">
                      <input value={form.title || ''} onChange={e => updateForm('title', e.target.value)} placeholder="e.g. Develop Market Expansion Strategy" />
                    </FieldLabel>
                    <FieldLabel label="Category Code" required help="Used for generating the unique Quest ID.">
                      <input value={form.category || ''} onChange={e => updateForm('category', e.target.value.toUpperCase())} placeholder="e.g. TECH, SALES, DESIGN" />
                    </FieldLabel>
                    <FieldLabel label="Classification">
                      <select value={form.classification || ''} onChange={e => updateForm('classification', e.target.value)}>
                        <option>Internal Guild</option><option>External Client</option><option>Community Service</option>
                        <option>Revenue Generating</option><option>Training</option><option>Partnership</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Priority Matrix">
                      <select value={form.priority || 'medium'} onChange={e => updateForm('priority', e.target.value)}>
                        <option value="low">Low - Standard Ops</option>
                        <option value="medium">Medium - Active Growth</option>
                        <option value="high">High - High Value</option>
                        <option value="urgent">Urgent - Immediate Action</option>
                      </select>
                    </FieldLabel>
                  </div>
                  <FieldLabel label="Operational Summary" required help="Define the core problem and expected resolution.">
                    <textarea rows={5} value={form.description || ''} onChange={e => updateForm('description', e.target.value)} placeholder="Detailed mission briefing..." />
                  </FieldLabel>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<UsersRound className="w-6 h-6" />} 
                  title="Source & Stakeholders" 
                  description="Identify the initiating entity and maintain administrative links to previous ledger entries." 
                />
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="Origin Type" required>
                      <select value={form.sourceType || ''} onChange={e => updateForm('sourceType', e.target.value)}>
                        <option>Organization</option><option>Individual</option><option>Guild Internal</option><option>Partner Organization</option><option>Government</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Legal Entity Name" required help="Full name of the requesting entity.">
                      <input value={form.sourceName || ''} onChange={e => updateForm('sourceName', e.target.value)} placeholder="e.g. Central Bank of India" />
                    </FieldLabel>
                    <FieldLabel label="Primary Contact Person">
                      <input value={form.sourceContactPerson || ''} onChange={e => updateForm('sourceContactPerson', e.target.value)} placeholder="Full Name" />
                    </FieldLabel>
                    <FieldLabel label="Liaison Email Address">
                      <input type="email" value={form.sourceEmail || ''} onChange={e => updateForm('sourceEmail', e.target.value)} placeholder="liaison@entity.com" />
                    </FieldLabel>
                  </div>
                  <div className="p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                       <Target className="w-3.5 h-3.5" /> Established Federation Links
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-[var(--text-secondary)]">
                       <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] truncate">ORG: {form.organizationId || 'NONE'}</div>
                       <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] truncate">NEED: {form.needId || 'NONE'}</div>
                       <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] truncate">OPP: {form.opportunityId || 'NONE'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<MapPin className="w-6 h-6" />} 
                  title="Deployment Zone" 
                  description="Specify the physical or digital theater of operations for this mission." 
                />
                <div className="space-y-8">
                  <FieldLabel label="Operational Mode" required>
                    <div className="grid grid-cols-3 gap-4">
                      {['Remote', 'Physical', 'Hybrid'].map(m => (
                        <button 
                          key={m}
                          type="button"
                          onClick={() => updateForm('mode', m)}
                          className={`
                            py-3 px-4 rounded-xl text-sm font-bold border transition-all
                            ${form.mode === m 
                              ? 'bg-[var(--primary)] text-black border-[var(--primary)] shadow-md' 
                              : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-secondary)]'}
                          `}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </FieldLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="Primary City" required>
                      <input value={form.location?.city || ''} onChange={e => updateNested('location', 'city', e.target.value)} placeholder="Ludhiana" />
                    </FieldLabel>
                    <FieldLabel label="State / Jurisdiction" required>
                      <input value={form.location?.state || ''} onChange={e => updateNested('location', 'state', e.target.value)} placeholder="Punjab" />
                    </FieldLabel>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<UsersRound className="w-6 h-6" />} 
                  title="Personnel Requirements" 
                  description="Define the human capital required for successful mission execution." 
                />
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="Minimum Rank" required>
                      <select value={form.requiredRank || 'Applicant'} onChange={e => updateForm('requiredRank', e.target.value)}>
                        <option>Applicant</option><option>F</option><option>E</option><option>D</option><option>C</option><option>B</option><option>A</option><option>S</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Personnel Count" required>
                      <input type="number" min={1} value={form.membersRequired || 1} onChange={e => updateForm('membersRequired', Number(e.target.value))} />
                    </FieldLabel>
                    <FieldLabel label="Estimated Operational Hours">
                      <input type="number" min={0} value={form.estimatedHours || 0} onChange={e => updateForm('estimatedHours', Number(e.target.value))} />
                    </FieldLabel>
                    <FieldLabel label="Difficulty Rating" required>
                      <select value={form.difficulty || 'medium'} onChange={e => updateForm('difficulty', e.target.value)}>
                        <option value="easy">Easy - Direct Execution</option>
                        <option value="medium">Medium - Tactical Thinking</option>
                        <option value="hard">Hard - Expert Specialized</option>
                        <option value="legendary">Legendary - Strategic Lead</option>
                      </select>
                    </FieldLabel>
                  </div>
                  <FieldLabel label="Required Specialized Skills" help="Comma separated list of mission-critical capabilities.">
                    <input value={(form.requiredSkills || []).join(', ')} onChange={e => updateSkills(e.target.value)} placeholder="React, Python, Negotiation, etc." />
                  </FieldLabel>
                  <label className="flex items-center gap-4 p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)] cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded-md border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]" checked={Boolean(form.isMandatory)} onChange={e => updateForm('isMandatory', e.target.checked)} />
                    <div>
                       <p className="text-sm font-bold group-hover:text-[var(--text)] transition-colors">Mandatory Guild Duty</p>
                       <p className="text-xs text-[var(--text-muted)]">Check this if the quest is a required assignment for the designated personnel.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<IndianRupee className="w-6 h-6" />} 
                  title="Financial Configuration" 
                  description="Transparency in value and compensation is critical for Federation trust." 
                />
                <div className="space-y-8">
                  <label className="flex items-center gap-4 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded-md border-emerald-500/30 text-emerald-500 focus:ring-emerald-500" checked={Boolean(form.isPaid)} onChange={e => updateForm('isPaid', e.target.checked)} />
                    <div>
                       <p className="text-sm font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">Paid Deployment</p>
                       <p className="text-xs text-emerald-600/70">Personnel will receive direct monetary compensation upon verification.</p>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="Gross Mission Value (INR)" required help="Total value generated by this quest.">
                      <input type="number" min={0} value={form.estimatedValue || 0} onChange={e => updateForm('estimatedValue', Number(e.target.value))} />
                    </FieldLabel>
                    {form.isPaid && (
                      <FieldLabel label="Personnel Payout (INR)" required help="Total amount to be distributed to assigned unit.">
                        <input type="number" min={0} value={form.paymentAmount || 0} onChange={e => updateForm('paymentAmount', Number(e.target.value))} />
                      </FieldLabel>
                    )}
                    <FieldLabel label="Expected Guild Revenue (INR)" help="Net contribution to the Federation treasury.">
                      <input type="number" min={0} value={form.guildRevenue || 0} onChange={e => updateForm('guildRevenue', Number(e.target.value))} />
                    </FieldLabel>
                    <FieldLabel label="Billing Responsibility">
                      <select value={form.whoPays || 'Organization'} onChange={e => updateForm('whoPays', e.target.value)}>
                        <option>Organization</option><option>Guild Internal</option><option>Partner Entity</option><option>External Sponsor</option>
                      </select>
                    </FieldLabel>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<ShieldCheck className="w-6 h-6" />} 
                  title="Protocols & Verification" 
                  description="Define what constitutes success and how the ledger will verify it." 
                />
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="Verification Protocol" required>
                      <select value={form.verificationMethod || 'manualReview'} onChange={e => updateForm('verificationMethod', e.target.value)}>
                        <option value="manualReview">Manual Review - Operator Lead</option>
                        <option value="reportReview">Report Review - Narrative Verification</option>
                        <option value="documentUpload">Document Upload - Artifact Evidence</option>
                        <option value="organizationConfirmation">Organization Confirmation - Direct Feedback</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Authority Level" required>
                      <select value={form.verificationLevel || 'Receptionist Verified'} onChange={e => updateForm('verificationLevel', e.target.value)}>
                        <option>Self Verified</option><option>Receptionist Verified</option><option>Manager Verified</option><option>Founder Verified</option>
                      </select>
                    </FieldLabel>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <label className="flex items-center gap-3 p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]" checked={Boolean(form.knowledgeRequired)} onChange={e => updateForm('knowledgeRequired', e.target.checked)} />
                      <span className="text-xs font-bold">Knowledge Capture</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]" checked={Boolean(form.portfolioEligible)} onChange={e => updateForm('portfolioEligible', e.target.checked)} />
                      <span className="text-xs font-bold">Portfolio Worthy</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]" checked={Boolean(form.certificateEligible)} onChange={e => updateForm('certificateEligible', e.target.checked)} />
                      <span className="text-xs font-bold">Certification Eligible</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FieldLabel label="XP Reward Points" help="Reputation boost for successful completion.">
                      <input type="number" min={0} value={form.reputationPoints || 0} onChange={e => updateForm('reputationPoints', Number(e.target.value))} />
                    </FieldLabel>
                    <FieldLabel label="Achievement Description">
                      <input value={form.rewards || ''} onChange={e => updateForm('rewards', e.target.value)} placeholder="e.g. Master Contributor Badge" />
                    </FieldLabel>
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<FileCheck2 className="w-6 h-6" />} 
                  title="Success Acceptance" 
                  description="Describe the tangible, verifiable changes that signify mission success." 
                />
                <div className="space-y-8">
                  <FieldLabel label="Acceptance Criteria" required help="Plain language definition of 'Done'.">
                    <textarea rows={6} value={form.expectedOutcome || ''} onChange={e => updateForm('expectedOutcome', e.target.value)} placeholder="What specific artifacts or results must be present?" />
                  </FieldLabel>
                  <FieldLabel label="Submission Channel" help="Where should artifacts be delivered?">
                    <input value={form.submissionMethod || ''} onChange={e => updateForm('submissionMethod', e.target.value)} placeholder="e.g. GitHub Repository, Guild Document Vault" />
                  </FieldLabel>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <StepHeader 
                  icon={<ClipboardCheck className="w-6 h-6" />} 
                  title="Registry Finalization" 
                  description="Execute a final protocol check before committing this mission to the Federation Ledger." 
                />
                <div className="grid gap-6 md:grid-cols-2 mb-10">
                  <div className="panel bg-[var(--card-subtle)] p-6 space-y-6">
                    <div>
                      <p className="eyebrow">Mission Capsule</p>
                      <h3 className="text-xl font-bold tracking-tight mb-2">{form.title || 'Untitled Mission'}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-4">{form.sourceName || 'Unknown Partner'} &middot; {form.location?.city}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       <StatusBadge status={form.classification || 'Mission'} />
                       <StatusBadge status={form.priority || 'Standard'} />
                       <span className="role-pill">{form.mode}</span>
                    </div>
                  </div>
                  <div className="panel bg-[var(--card-subtle)] p-6 space-y-6">
                    <p className="eyebrow">Readiness Audit</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold">Case Completeness</span>
                        <span className="text-lg font-black">{completeness.score}%</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                        <div className="h-full bg-[var(--primary)]" style={{ width: `${completeness.score}%` }} />
                      </div>
                    </div>
                    {completeness.missing.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Missing Protocols</p>
                        <ul className="text-xs text-[var(--text-muted)] space-y-1">
                          {completeness.missing.slice(0, 3).map(item => <li key={item} className="flex gap-2"><span>&middot;</span> {item}</li>)}
                        </ul>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold pt-4">
                        <CheckCircle2 className="w-4 h-4" /> Protocol Compliance Verified
                      </div>
                    )}
                  </div>
                </div>
                {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold">{error}</div>}
              </div>
            )}
          </div>

          <div className="bg-[var(--card-subtle)] border-t border-[var(--border)] p-8 flex flex-col-reverse md:flex-row justify-between items-center gap-6">
            <button 
              className="ghost !py-3 !px-8 text-xs font-bold uppercase tracking-widest" 
              disabled={step === 0 || isSubmitting} 
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Protocol Step {step}
            </button>
            
            {step < STEPS.length - 1 ? (
              <button 
                className="primary !py-4 !px-12 rounded-[1.5rem] shadow-lg shadow-[var(--primary)]/20" 
                disabled={!canContinue()} 
                onClick={() => setStep(step + 1)}
              >
                Proceed to {STEPS[step + 1]} <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button 
                className="primary !py-4 !px-12 rounded-[1.5rem] shadow-lg shadow-[var(--primary)]/20 !bg-emerald-500 hover:!bg-emerald-600 !text-white !border-none" 
                disabled={isSubmitting || completeness.score < 70} 
                onClick={handleRegister}
              >
                {isSubmitting ? 'Synchronizing Ledger...' : 'Commit to Federation Ledger'} <FileCheck2 className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

