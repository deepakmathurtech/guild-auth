import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Circle, FileCheck2, IndianRupee, MapPin, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { createLedgerRecord } from '../../lib/repository';
import { generateGuildQuestId } from '../../services/workflowService';
import { useAuth } from '../../context/AuthContext';
import type { Quest } from '../../types/guild';

const STEPS = [
  'Quest Identity',
  'Source & Origin',
  'Location',
  'Requirements',
  'Financial Section',
  'Verification & Knowledge',
  'Expected Outcome',
  'Review & Register'
];

function FieldLabel({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span className={required ? 'required' : ''}>{label}</span>
      {children}
      {help && <span className="field-help">{help}</span>}
    </label>
  );
}

function StepHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--card-subtle)] text-[var(--primary)] ring-1 ring-[var(--border)]">{icon}</div>
      <div>
        <h3 className="text-2xl font-black">{title}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
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
    description: '',
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
    estimatedValue: 0,
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
      setError(err.message || 'Quest registration failed. Please check required fields and try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 p-2 md:p-4">
      <div className="hero-panel">
        <p className="eyebrow">Operational Mission Control</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1>Quest Registration</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">Create a complete case file that a receptionist, member, verifier, and founder can all understand without extra explanation.</p>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-center">
            <span className="block text-3xl font-black text-[var(--primary)]">{completeness.score}%</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Completeness</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="panel h-fit lg:sticky lg:top-6">
          <p className="eyebrow">Registration Steps</p>
          <ol className="grid gap-2">
            {STEPS.map((item, idx) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => setStep(idx)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-bold transition ${idx === step ? 'border-[var(--primary)] bg-[#17120b] text-[#f8d987]' : idx < step ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300' : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)]'}`}
                >
                  {idx < step ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                  <span>{idx + 1}. {item}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="panel min-h-[560px] shadow-[var(--shadow-lg)]">
          <div className="min-h-[430px]">
            {step === 0 && (
              <div>
                <StepHeader icon={<Sparkles size={22} />} title="Quest Identity" description="Give the work a name, category, and summary operators can scan quickly." />
                <div className="form-grid">
                  <FieldLabel label="Quest Title" required help="Use an operator-readable title like 'Build sponsor landing page' rather than an internal shorthand."><input value={form.title || ''} onChange={e => updateForm('title', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Category" required help="A short category powers the Guild Quest ID, for example TECH, SALES, DESIGN, OPS."><input value={form.category || ''} onChange={e => updateForm('category', e.target.value.toUpperCase())} /></FieldLabel>
                  <FieldLabel label="Classification" help="Helps founders separate internal work, client work, training, and emergency tasks."><select value={form.classification || ''} onChange={e => updateForm('classification', e.target.value)}><option>Internal Guild</option><option>External Client</option><option>Community Service</option><option>Revenue Generating</option><option>Training</option><option>Partnership</option><option>Research</option><option>Emergency</option></select></FieldLabel>
                  <FieldLabel label="Priority" help="Urgent quests surface higher in receptionist attention queues."><select value={form.priority || 'medium'} onChange={e => updateForm('priority', e.target.value)}><option>low</option><option>medium</option><option>high</option><option>urgent</option></select></FieldLabel>
                  <FieldLabel label="Description" required help="State the problem, expected work, and any non-negotiables." ><textarea value={form.description || ''} onChange={e => updateForm('description', e.target.value)} /></FieldLabel>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <StepHeader icon={<UsersRound size={22} />} title="Source & Origin" description="Tie the quest to the person, organization, need, or opportunity that created it." />
                <div className="form-grid">
                  <FieldLabel label="Source Type" required><select value={form.sourceType || ''} onChange={e => updateForm('sourceType', e.target.value)}><option>Organization</option><option>Individual</option><option>Guild Internal</option><option>Partner Organization</option><option>Government</option><option>Other</option></select></FieldLabel>
                  <FieldLabel label="Source Name" required help="Who asked for or owns this work?"><input value={form.sourceName || ''} onChange={e => updateForm('sourceName', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Contact Person"><input value={form.sourceContactPerson || ''} onChange={e => updateForm('sourceContactPerson', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Contact Phone"><input value={form.sourcePhone || ''} onChange={e => updateForm('sourcePhone', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Source Email"><input type="email" value={form.sourceEmail || ''} onChange={e => updateForm('sourceEmail', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Linked IDs" help="These are prefilled when converting from a need or opportunity."><input readOnly value={[form.organizationId && `Org: ${form.organizationId}`, form.needId && `Need: ${form.needId}`, form.opportunityId && `Opp: ${form.opportunityId}`].filter(Boolean).join(' | ') || 'No linked record yet'} /></FieldLabel>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeader icon={<MapPin size={22} />} title="Location" description="Clarify where the work belongs and how it will be delivered." />
                <div className="form-grid">
                  <FieldLabel label="Mode" required><select value={form.mode || 'Remote'} onChange={e => updateForm('mode', e.target.value)}><option>Remote</option><option>Physical</option><option>Hybrid</option></select></FieldLabel>
                  <FieldLabel label="Country"><input value={form.location?.country || 'India'} onChange={e => updateNested('location', 'country', e.target.value)} /></FieldLabel>
                  <FieldLabel label="City" required><input value={form.location?.city || ''} onChange={e => updateNested('location', 'city', e.target.value)} /></FieldLabel>
                  <FieldLabel label="State" required><input value={form.location?.state || ''} onChange={e => updateNested('location', 'state', e.target.value)} /></FieldLabel>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeader icon={<UsersRound size={22} />} title="Requirements" description="Define who can take this quest and what capacity the receptionist must arrange." />
                <div className="form-grid">
                  <FieldLabel label="Required Rank" required><select value={form.requiredRank || 'Applicant'} onChange={e => updateForm('requiredRank', e.target.value)}><option>Applicant</option><option>F</option><option>E</option><option>D</option><option>C</option><option>B</option><option>A</option><option>S</option></select></FieldLabel>
                  <FieldLabel label="Members Required" required><input type="number" min={1} value={form.membersRequired || 1} onChange={e => updateForm('membersRequired', Number(e.target.value))} /></FieldLabel>
                  <FieldLabel label="Estimated Hours"><input type="number" min={0} value={form.estimatedHours || 0} onChange={e => updateForm('estimatedHours', Number(e.target.value))} /></FieldLabel>
                  <FieldLabel label="Difficulty" required><select value={form.difficulty || 'medium'} onChange={e => updateForm('difficulty', e.target.value)}><option>easy</option><option>medium</option><option>hard</option><option>legendary</option></select></FieldLabel>
                  <FieldLabel label="Quest Nature"><select value={form.questNature || 'Guild Duty'} onChange={e => updateForm('questNature', e.target.value)}><option>Volunteer</option><option>Paid</option><option>Internship</option><option>Guild Duty</option><option>Training</option><option>Research</option><option>Community Service</option><option>Other</option></select></FieldLabel>
                  <FieldLabel label="Required Skills" help="Comma separated. Example: React, content writing, client calling."><input value={(form.requiredSkills || []).join(', ')} onChange={e => updateSkills(e.target.value)} /></FieldLabel>
                  <label className="span-2 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.isMandatory)} onChange={e => updateForm('isMandatory', e.target.checked)} /> This quest is mandatory for assigned members</label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeader icon={<IndianRupee size={22} />} title="Financial Section" description="Make payment, value, Guild revenue, and member payout visible from day one." />
                <div className="form-grid">
                  <label className="span-2 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.isPaid)} onChange={e => updateForm('isPaid', e.target.checked)} /> This is a paid quest</label>
                  <FieldLabel label="Payment Amount" required={Boolean(form.isPaid)}><input type="number" min={0} value={form.paymentAmount || 0} onChange={e => updateForm('paymentAmount', Number(e.target.value))} /></FieldLabel>
                  <FieldLabel label="Currency"><input value={form.paymentCurrency || 'INR'} onChange={e => updateForm('paymentCurrency', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Payment Type"><select value={form.paymentType || 'UPI'} onChange={e => updateForm('paymentType', e.target.value)}><option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Guild Treasury</option><option>External Organization</option><option>Other</option></select></FieldLabel>
                  <FieldLabel label="Who Pays?"><select value={form.whoPays || 'Organization'} onChange={e => updateForm('whoPays', e.target.value)}><option>Organization</option><option>Guild</option><option>Partner</option><option>Government</option><option>Individual</option><option>Other</option></select></FieldLabel>
                  <FieldLabel label="Estimated Value"><input type="number" min={0} value={form.estimatedValue || 0} onChange={e => updateForm('estimatedValue', Number(e.target.value))} /></FieldLabel>
                  <FieldLabel label="Expected Guild Revenue"><input type="number" min={0} value={form.guildRevenue || 0} onChange={e => updateForm('guildRevenue', Number(e.target.value))} /></FieldLabel>
                  <FieldLabel label="Expected Member Payout"><input type="number" min={0} value={form.memberPayout || 0} onChange={e => updateForm('memberPayout', Number(e.target.value))} /></FieldLabel>
                  <FieldLabel label="Payment Notes"><textarea value={form.paymentNotes || ''} onChange={e => updateForm('paymentNotes', e.target.value)} /></FieldLabel>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <StepHeader icon={<ShieldCheck size={22} />} title="Verification & Knowledge" description="Define what counts as done, who verifies it, and whether knowledge capture is required." />
                <div className="form-grid">
                  <FieldLabel label="Verification Method" required><select value={form.verificationMethod || 'manualReview'} onChange={e => updateForm('verificationMethod', e.target.value)}><option value="manualReview">Manual Review</option><option value="reportReview">Report Review</option><option value="documentUpload">Document Upload</option><option value="receiptUpload">Receipt Upload</option><option value="organizationConfirmation">Organization Confirmation</option></select></FieldLabel>
                  <FieldLabel label="Verification Level" required><select value={form.verificationLevel || 'Receptionist Verified'} onChange={e => updateForm('verificationLevel', e.target.value)}><option>Self Verified</option><option>Receptionist Verified</option><option>Manager Verified</option><option>External Verified</option></select></FieldLabel>
                  <FieldLabel label="Member Reward"><input value={form.rewards || ''} onChange={e => updateForm('rewards', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Reputation Points"><input type="number" min={0} value={form.reputationPoints || 0} onChange={e => updateForm('reputationPoints', Number(e.target.value))} /></FieldLabel>
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.knowledgeRequired)} onChange={e => updateForm('knowledgeRequired', e.target.checked)} /> Knowledge entry required</label>
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.portfolioEligible)} onChange={e => updateForm('portfolioEligible', e.target.checked)} /> Portfolio eligible</label>
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={Boolean(form.certificateEligible)} onChange={e => updateForm('certificateEligible', e.target.checked)} /> Certificate eligible</label>
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <StepHeader icon={<FileCheck2 size={22} />} title="Expected Outcome" description="Write the acceptance criteria in plain language so there are no verification surprises later." />
                <div className="form-grid">
                  <FieldLabel label="Expected Outcome" required help="Describe the visible result, deliverable, or verified change the quest must produce."><textarea value={form.expectedOutcome || ''} onChange={e => updateForm('expectedOutcome', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Submission Method" help="Example: final report, GitHub link, uploaded receipt, organization confirmation."><input value={form.submissionMethod || ''} onChange={e => updateForm('submissionMethod', e.target.value)} /></FieldLabel>
                  <FieldLabel label="Requirements" help="Any constraints, assets, approvals, or special instructions."><textarea value={form.requirements || ''} onChange={e => updateForm('requirements', e.target.value)} /></FieldLabel>
                </div>
              </div>
            )}

            {step === 7 && (
              <div>
                <StepHeader icon={<FileCheck2 size={22} />} title="Review & Register" description="Sanity-check the case file before it enters the National Federation Ledger." />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-subtle)] p-5">
                    <p className="eyebrow">Case Summary</p>
                    <h3>{form.title || 'Untitled Quest'}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">{form.sourceName || 'Unknown source'} | {form.location?.city}, {form.location?.state}</p>
                    <div className="mt-4 flex flex-wrap gap-2"><span className="role-pill">{form.classification}</span><span className="role-pill">{form.priority}</span><span className="role-pill">{form.isPaid ? 'Paid' : 'Volunteer'}</span></div>
                  </div>
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-subtle)] p-5">
                    <p className="eyebrow">Operational Readiness</p>
                    <div className="mb-3 h-3 overflow-hidden rounded-full bg-[var(--bg-alt)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${completeness.score}%` }} /></div>
                    {completeness.missing.length > 0 ? <ul className="grid gap-2 text-sm text-[var(--muted)]">{completeness.missing.map(item => <li key={item}>- {item}</li>)}</ul> : <p className="text-sm font-bold text-[var(--success)]">Ready for registration. Assignments can begin after creation.</p>}
                  </div>
                </div>
                {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-between">
            <button className="ghost px-8" disabled={step === 0 || isSubmitting} onClick={() => setStep(step - 1)}>Back</button>
            {step < STEPS.length - 1 ? (
              <button className="primary px-8" disabled={!canContinue()} onClick={() => setStep(step + 1)}>Continue</button>
            ) : (
              <button className="primary px-8" disabled={isSubmitting || completeness.score < 70} onClick={handleRegister}>
                {isSubmitting ? 'Registering...' : 'Confirm Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
