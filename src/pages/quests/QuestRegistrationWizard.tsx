import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

export function QuestRegistrationWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState<Partial<Quest>>({
    title: location.state?.title || '',
    description: '',
    category: '',
    classification: 'Internal Guild',
    priority: 'medium',
    
    sourceType: 'Organization',
    sourceName: location.state?.orgName || '',
    organizationId: location.state?.orgId || '',
    opportunityId: location.state?.oppId || '',
    needId: location.state?.needId || '',
    
    location: { city: 'LDH', state: 'PB', country: 'IN' },
    mode: 'Remote',
    
    requiredRank: 'Applicant',
    membersRequired: 1,
    estimatedHours: 0,
    
    isPaid: false,
    paymentAmount: 0,
    paymentCurrency: 'INR',
    whoPays: 'Organization',
    
    verificationMethod: 'manualReview',
    knowledgeRequired: false,
    portfolioEligible: false,
    certificateEligible: false,
    
    expectedOutcome: ''
  });

  const updateForm = (field: keyof Quest, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const updateNested = (parent: string, field: string, value: any) => setForm(prev => ({ ...prev, [parent]: { ...(prev as any)[parent], [field]: value } }));

  function calculateCompleteness() {
    let score = 0;
    const missing: string[] = [];
    
    if (form.title && form.description && form.category) score += 20; else missing.push('Identity Incomplete');
    if (form.sourceName) score += 10; else missing.push('Source Name Missing');
    if (form.requiredRank) score += 10; else missing.push('Requirements Missing');
    
    // Financial checks
    if (form.isPaid && !form.paymentAmount) missing.push('Payment Amount Missing');
    else score += 20;
    
    if (form.verificationMethod) score += 10; else missing.push('Verification Method Missing');
    if (form.expectedOutcome) score += 10; else missing.push('Expected Outcome Missing');
    
    // We max at 80 at creation. Operational handles the rest (100).
    return { score, missing };
  }

  async function handleRegister() {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      const { score, missing } = calculateCompleteness();
      const newId = await generateGuildQuestId(form.location?.city || 'LDH', form.category || 'GEN');
      
      const questData: Partial<Quest> = {
        ...form,
        guildQuestId: newId,
        assignedReceptionistId: profile.uid,
        assignedReceptionistName: profile.fullName || profile.email,
        status: 'draft',
        completenessScore: score,
        missingActions: [...missing, 'Assignments Needed'],
        timeline: {
          created: new Date().toISOString()
        }
      };

      const record = await createLedgerRecord('quests', questData as any, profile, 'Quest Registered');
      navigate(`/quests/${record.id}`);
    } catch (err: any) {
      alert(err.message || 'Registration failed');
      setIsSubmitting(false);
    }
  }

  return (
    <section className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <p className="eyebrow text-blue-400">Receptionist Workflow</p>
        <h1 className="text-3xl font-bold">Quest Registration Wizard</h1>
        <p className="text-[var(--muted)]">Fully define the operational scope before the Quest is created.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Steps */}
        <div className="md:w-1/4">
          <ul className="space-y-2">
            {STEPS.map((s, idx) => (
              <li key={s} className={`p-3 rounded-md border text-sm font-bold transition-colors ${idx === step ? 'bg-blue-900 border-blue-500 text-white' : idx < step ? 'bg-[var(--bg-alt)] border-green-500 text-green-400' : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)]'}`}>
                {idx + 1}. {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Form Area */}
        <div className="md:w-3/4 panel relative min-h-[400px] pb-20">
          
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 1: Quest Identity</h3>
              <label className="block">Title <input required className="w-full mt-1" value={form.title} onChange={e => updateForm('title', e.target.value)} /></label>
              <label className="block">Category (e.g. TECH) <input required className="w-full mt-1" value={form.category} onChange={e => updateForm('category', e.target.value)} /></label>
              <label className="block">Description <textarea required className="w-full mt-1" rows={4} value={form.description} onChange={e => updateForm('description', e.target.value)} /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">Classification
                  <select className="w-full mt-1" value={form.classification} onChange={e => updateForm('classification', e.target.value)}>
                    <option>Internal Guild</option><option>External Client</option><option>Community Service</option>
                    <option>Revenue Generating</option><option>Training</option><option>Research</option><option>Partnership</option><option>Emergency</option>
                  </select>
                </label>
                <label className="block">Priority
                  <select className="w-full mt-1" value={form.priority} onChange={e => updateForm('priority', e.target.value)}>
                    <option>low</option><option>medium</option><option>high</option><option>urgent</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 2: Source & Origin</h3>
              <label className="block">Source Type
                <select className="w-full mt-1" value={form.sourceType} onChange={e => updateForm('sourceType', e.target.value)}>
                  <option>Organization</option><option>Individual</option><option>Partner</option><option>Government</option><option>Guild Internal</option><option>Other</option>
                </select>
              </label>
              <label className="block">Source Name <input required className="w-full mt-1" value={form.sourceName} onChange={e => updateForm('sourceName', e.target.value)} /></label>
              <label className="block">Contact Person <input className="w-full mt-1" value={form.sourceContactPerson || ''} onChange={e => updateForm('sourceContactPerson', e.target.value)} /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">Phone <input className="w-full mt-1" value={form.sourcePhone || ''} onChange={e => updateForm('sourcePhone', e.target.value)} /></label>
                <label className="block">Email <input className="w-full mt-1" value={form.sourceEmail || ''} onChange={e => updateForm('sourceEmail', e.target.value)} /></label>
              </div>
              <p className="text-xs text-[var(--muted)] mt-4">Pre-linked Context: Org={form.organizationId || 'None'} | Opp={form.opportunityId || 'None'}</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 3: Location</h3>
              <label className="block">Operating Mode
                <select className="w-full mt-1" value={form.mode} onChange={e => updateForm('mode', e.target.value)}>
                  <option>Remote</option><option>Physical</option><option>Hybrid</option>
                </select>
              </label>
              <div className="grid grid-cols-3 gap-4">
                <label className="block">City <input className="w-full mt-1" value={form.location?.city || ''} onChange={e => updateNested('location', 'city', e.target.value)} /></label>
                <label className="block">State <input className="w-full mt-1" value={form.location?.state || ''} onChange={e => updateNested('location', 'state', e.target.value)} /></label>
                <label className="block">Country <input className="w-full mt-1" value={form.location?.country || ''} onChange={e => updateNested('location', 'country', e.target.value)} /></label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 4: Requirements</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">Required Rank
                  <select className="w-full mt-1" value={form.requiredRank} onChange={e => updateForm('requiredRank', e.target.value)}>
                    <option>Applicant</option><option>F</option><option>E</option><option>D</option><option>C</option><option>B</option><option>A</option><option>S</option>
                  </select>
                </label>
                <label className="block">Members Required <input type="number" min={1} className="w-full mt-1" value={form.membersRequired || 1} onChange={e => updateForm('membersRequired', Number(e.target.value))} /></label>
              </div>
              <label className="block">Estimated Hours <input type="number" className="w-full mt-1" value={form.estimatedHours || 0} onChange={e => updateForm('estimatedHours', Number(e.target.value))} /></label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 5: Financial Section</h3>
              <label className="flex items-center space-x-2 bg-blue-900/20 p-4 border border-blue-500/30 rounded">
                <input type="checkbox" checked={form.isPaid} onChange={e => updateForm('isPaid', e.target.checked)} />
                <span className="font-bold">This is a Paid Quest</span>
              </label>
              
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-4 border-l-2 border-green-500 pl-4">
                  <label className="block">Payment Amount <input type="number" className="w-full mt-1" value={form.paymentAmount || 0} onChange={e => updateForm('paymentAmount', Number(e.target.value))} /></label>
                  <label className="block">Currency <input className="w-full mt-1" value={form.paymentCurrency || 'INR'} onChange={e => updateForm('paymentCurrency', e.target.value)} /></label>
                  <label className="block">Who Pays
                    <select className="w-full mt-1" value={form.whoPays} onChange={e => updateForm('whoPays', e.target.value)}>
                      <option>Organization</option><option>Guild</option><option>Partner</option><option>Individual</option>
                    </select>
                  </label>
                  <label className="block">Payment Type
                    <select className="w-full mt-1" value={form.paymentType || ''} onChange={e => updateForm('paymentType', e.target.value)}>
                      <option>Bank Transfer</option><option>Cash</option><option>UPI</option><option>Guild Treasury</option><option>External Organization</option>
                    </select>
                  </label>
                  <label className="block">Expected Guild Revenue <input type="number" className="w-full mt-1" value={form.guildRevenue || 0} onChange={e => updateForm('guildRevenue', Number(e.target.value))} /></label>
                  <label className="block">Expected Member Payout <input type="number" className="w-full mt-1" value={form.memberPayout || 0} onChange={e => updateForm('memberPayout', Number(e.target.value))} /></label>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 6: Verification & Knowledge</h3>
              <label className="block">Verification Method
                <select className="w-full mt-1" value={form.verificationMethod} onChange={e => updateForm('verificationMethod', e.target.value)}>
                  <option value="reportReview">Report/Photo Review</option><option value="documentUpload">Deliverable Upload</option><option value="manualReview">Manual Review (Meeting)</option><option value="organizationConfirmation">External Confirmation</option>
                </select>
              </label>
              <div className="space-y-2 mt-4 border-t border-[var(--border)] pt-4">
                <label className="flex items-center space-x-2"><input type="checkbox" checked={form.knowledgeRequired} onChange={e => updateForm('knowledgeRequired', e.target.checked)} /> <span>Knowledge Entry Required?</span></label>
                <label className="flex items-center space-x-2"><input type="checkbox" checked={form.portfolioEligible} onChange={e => updateForm('portfolioEligible', e.target.checked)} /> <span>Portfolio Eligible?</span></label>
                <label className="flex items-center space-x-2"><input type="checkbox" checked={form.certificateEligible} onChange={e => updateForm('certificateEligible', e.target.checked)} /> <span>Certificate Eligible?</span></label>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Step 7: Expected Outcome</h3>
              <label className="block">What does completion look like? <textarea required className="w-full mt-1" rows={4} placeholder="Define success criteria clearly..." value={form.expectedOutcome} onChange={e => updateForm('expectedOutcome', e.target.value)} /></label>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-400 mb-4">Step 8: Review & Register</h3>
              <div className="p-4 bg-[var(--bg-alt)] border border-[var(--border)] rounded text-sm space-y-2">
                <p><strong>Identity:</strong> {form.title} ({form.classification})</p>
                <p><strong>Source:</strong> {form.sourceName} [{form.sourceType}]</p>
                <p><strong>Requirements:</strong> Rank {form.requiredRank}, {form.membersRequired} Member(s)</p>
                <p><strong>Financial:</strong> {form.isPaid ? `PAID (${form.paymentCurrency}${form.paymentAmount})` : 'UNPAID'}</p>
                <p><strong>Verification:</strong> {form.verificationMethod}</p>
              </div>
              <div className="bg-yellow-900/30 p-4 border border-yellow-500/50 rounded mt-4">
                <p className="text-sm text-yellow-200">By clicking register, a formal Guild Document ID will be generated and this Quest will be officially registered. Please ensure all definitions are correct.</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-between pt-4 border-t border-[var(--border)]">
            <button className="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</button>
            {step < STEPS.length - 1 ? (
              <button className="primary" onClick={() => setStep(step + 1)}>Next Step</button>
            ) : (
              <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded" disabled={isSubmitting} onClick={handleRegister}>
                {isSubmitting ? 'Registering...' : 'Register Guild Quest'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
