import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, createLedgerRecord } from '../../lib/repository';
import { approveSubmission, verifyPayment, completeQuestAfterPayment } from '../../services/workflowService';
import { useAuth } from '../../context/AuthContext';
import type { QuestSubmission, Quest } from '../../types/guild';
import { calculateGuildShare, formatCurrency } from '../../lib/financials';
import {
  ChevronLeft, ClipboardCheck, User, Link as LinkIcon,
  ExternalLink, FileText, CheckCircle2, XCircle,
  MessageSquare, Save, History, Target, ShieldCheck, RotateCcw,
  DollarSign, CreditCard, Building2, Receipt, FileCheck
} from 'lucide-react';

export function SubmissionReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [sub, setSub] = useState<QuestSubmission | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [showPaymentVerify, setShowPaymentVerify] = useState(false);
  // Payment verification form state
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Razorpay' | 'Stripe' | 'Cash Receipt' | 'Custom' | 'Guild Treasury'>('UPI');
  const [paymentReferenceId, setPaymentReferenceId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [whoPaid, setWhoPaid] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecord('questSubmissions', id).then(data => {
      console.log('[SubmissionReviewPage] Raw data from Firestore:', JSON.stringify(data));
      if (data) {
        setSub(data);
        setNotes(data.reviewerNotes || '');
        // Load quest data for payment info
        if (data.questId) {
          getRecord('quests', data.questId).then(q => {
            if (q) setQuest(q);
          });
        }
      }
    });
  }, [id]);

  async function handleDecision(decision: 'approved' | 'rejected' | 'changes_requested') {
    if (!sub || !profile) return;
    setStatus('Synchronizing Ledger...');
    try {
      if (decision === 'approved') {
        await approveSubmission(sub, profile, notes);

        // If paid quest, show payment verification section
        if (quest?.isPaid && quest.paymentAmount) {
          setShowPaymentVerify(true);
          setStatus('');
          return;
        }
      } else if (decision === 'rejected') {
        // Handle Rejection
        await updateLedgerRecord('questSubmissions', sub.id, {
          status: 'rejected',
          reviewerId: profile.uid,
          reviewerNotes: notes,
          reviewedAt: new Date().toISOString()
        }, profile, 'Submission Rejected');

        await createLedgerRecord('verifications', {
          targetCollection: 'questSubmissions',
          targetId: sub.id,
          method: 'manualReview',
          evidence: sub.evidenceUrls || [],
          reviewer: profile.uid,
          decision: 'rejected',
          timestamp: new Date().toISOString(),
          notes: notes
        }, profile, 'Verification Record Created');
      } else {
        // Handle Request Changes
        await updateLedgerRecord('questSubmissions', sub.id, {
          status: 'changes_requested',
          reviewerId: profile.uid,
          reviewerNotes: notes,
          reviewedAt: new Date().toISOString()
        }, profile, 'Changes Requested');

        await createLedgerRecord('verifications', {
          targetCollection: 'questSubmissions',
          targetId: sub.id,
          method: 'manualReview',
          evidence: sub.evidenceUrls || [],
          reviewer: profile.uid,
          decision: 'changes_requested',
          timestamp: new Date().toISOString(),
          notes: notes
        }, profile, 'Verification Record Created');
      }

      setStatus('');
      navigate('/submissions');
    } catch (err: any) {
      setStatus(err.message || 'Processing failed.');
    }
  }

  // Handle payment verification for paid quests
  async function handlePaymentVerify() {
    if (!quest || !profile) return;
    setStatus('Verifying payment...');

    try {
      await verifyPayment(quest.id, {
        paymentReceived,
        paymentMethod,
        paymentReferenceId,
        transactionId,
        invoiceNumber,
        receiptNumber,
        paymentDate,
        verificationNotes,
        whoPaid
      }, profile);

      // If payment received, complete the quest
      if (paymentReceived) {
        await completeQuestAfterPayment(quest.id, profile);
      }

      setStatus('');
      navigate('/submissions');
    } catch (err: any) {
      setStatus(err.message || 'Payment verification failed.');
    }
  }

  // Calculate payout preview
  const payoutPreview = quest?.isPaid && quest.paymentAmount
    ? calculateGuildShare(quest.paymentAmount, quest.guildCommission || 5)
    : null;

  if (!sub) return (
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
            onClick={() => navigate('/submissions')}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            Verification Queue
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="role-pill !bg-amber-500/10 !text-amber-500 !border-amber-500/20">
                Mission Audit
              </span>
              <StatusBadge status={sub.status} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{sub.questTitle || 'Untitled Mission'}</h1>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                <Target className="w-4 h-4 text-sky-500" />
                <button 
                  className="hover:text-[var(--primary)] transition-colors underline underline-offset-4" 
                  onClick={() => navigate(`/quests/${sub.questId}`)}
                >
                  View Original Quest Record
                </button>
              </div>
              <div className="h-4 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <User className="w-4 h-4 text-[var(--primary)]" />
                <span>Personnel: <span className="font-mono text-xs">{sub.memberId.slice(0, 12)}...</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        <div className="space-y-8">
          {/* Evidence Panel */}
          <section className="panel">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold tracking-tight">Mission Evidence & Artifacts</h2>
            </div>
            
            <div className="space-y-8">
               <div className="p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)]">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                   <FileText className="w-3.5 h-3.5" /> Personnel Narrative
                 </p>
                 <p className="text-sm text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap">
                   {sub.report || 'No written report provided for this submission.'}
                 </p>
               </div>

               {(sub.evidenceUrls?.length || 0) > 0 && (
                 <div className="space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Verification Artifacts</h4>
                   <div className="grid gap-3">
                     {sub.evidenceUrls?.map((url, i) => (
                       <a 
                         key={i} 
                         href={url} 
                         target="_blank" 
                         rel="noreferrer" 
                         className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between group hover:border-[var(--primary)] transition-all"
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)]">
                             <ClipboardCheck className="w-4 h-4" />
                           </div>
                           <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[200px] md:max-w-md">{url}</span>
                         </div>
                         <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                       </a>
                     ))}
                   </div>
                 </div>
               )}

               {(sub.links?.length || 0) > 0 && (
                 <div className="space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">External Trace Links</h4>
                   <div className="grid gap-3">
                     {sub.links?.map((url, i) => (
                       <a 
                         key={i} 
                         href={url} 
                         target="_blank" 
                         rel="noreferrer" 
                         className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between group hover:border-sky-500 transition-all"
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-sky-500">
                             <LinkIcon className="w-4 h-4" />
                           </div>
                           <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[200px] md:max-w-md">{url}</span>
                         </div>
                         <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-sky-500" />
                       </a>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          </section>
        </div>

        {/* Action Panel */}
        <aside className="space-y-8">
          <section className="panel p-0 overflow-hidden shadow-[var(--shadow-lg)]">
             <div className="bg-[var(--card-subtle)] px-6 py-4 border-b border-[var(--border)]">
               <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Reviewer Chamber</h3>
             </div>
             
             <div className="p-6 space-y-6">
                {sub.status === 'pending' && !showPaymentVerify ? (
                  <>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                         <MessageSquare className="w-3 h-3" /> Professional Feedback
                       </label>
                       <textarea 
                         rows={5}
                         className="text-sm bg-[var(--bg)] border-[var(--border)]"
                         placeholder="Explain your protocol decision to the personnel..." 
                         value={notes} 
                         onChange={e => setNotes(e.target.value)} 
                       />
                    </div>
                    
                    <div className="grid gap-3 pt-2">
                       <button
                         className="primary !bg-emerald-500 hover:!bg-emerald-600 !text-white !border-none !py-3 shadow-lg shadow-emerald-500/20"
                         onClick={() => handleDecision('approved')}
                         disabled={!!status}
                       >
                         <CheckCircle2 className="w-4 h-4" /> Authorize & Verify
                       </button>
                       <button
                         className="secondary !text-amber-500 hover:!bg-amber-500/5 hover:!border-amber-500/30 !py-3"
                         onClick={() => handleDecision('changes_requested')}
                         disabled={!!status}
                       >
                         <RotateCcw className="w-4 h-4" /> Request Changes
                       </button>
                       <button
                         className="secondary !text-rose-500 hover:!bg-rose-500/5 hover:!border-rose-500/30 !py-3"
                         onClick={() => handleDecision('rejected')}
                         disabled={!!status}
                       >
                         <XCircle className="w-4 h-4" /> Reject Submission
                       </button>
                    </div>

                    {status && (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--primary)] animate-pulse pt-4">
                        <Save className="w-3.5 h-3.5" /> {status}
                      </div>
                    )}
                  </>
                ) : showPaymentVerify && quest?.isPaid ? (
                  <div className="panel border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center gap-3 mb-6">
                      <DollarSign className="w-6 h-6 text-amber-500" />
                      <h2 className="text-xl font-bold tracking-tight">Payment Verification</h2>
                    </div>

                    {payoutPreview && (
                      <div className="mb-6 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Payout Preview</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-[var(--text-muted)]">Gross</p>
                            <p className="font-bold text-lg">{formatCurrency(payoutPreview.grossAmount)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-muted)]">Guild ({payoutPreview.baseGuildPercentage}%)</p>
                            <p className="font-bold text-emerald-400">{formatCurrency(payoutPreview.guildRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-muted)]">Member</p>
                            <p className="font-bold text-amber-400">{formatCurrency(payoutPreview.memberRevenue)}</p>
                          </div>
                        </div>
                        {payoutPreview.roundingAdjustment > 0 && (
                          <p className="text-xs text-[var(--text-muted)] mt-2">
                            +₹{payoutPreview.roundingAdjustment} rounding adjustment to guild
                          </p>
                        )}
                      </div>
                    )}

                    {quest.organizationId && (
                      <div className="mb-4 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-[var(--primary)]" />
                          <span className="font-medium">{quest.organizationName || quest.organizationId}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentReceived}
                            onChange={e => setPaymentReceived(e.target.checked)}
                            className="w-4 h-4 rounded border-[var(--border)]"
                          />
                          <span className="font-medium">Payment Received?</span>
                        </label>
                      </div>

                      {paymentReceived && (
                        <>
                          <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Payment Method</label>
                            <select
                              value={paymentMethod}
                              onChange={e => setPaymentMethod(e.target.value as any)}
                              className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                            >
                              <option value="UPI">UPI</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Razorpay">Razorpay</option>
                              <option value="Stripe">Stripe</option>
                              <option value="Cash Receipt">Cash Receipt</option>
                              <option value="Custom">Custom Reference</option>
                              <option value="Guild Treasury">Guild Treasury</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Payment Reference ID</label>
                              <input
                                type="text"
                                value={paymentReferenceId}
                                onChange={e => setPaymentReferenceId(e.target.value)}
                                className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                                placeholder="UPI ID / Transaction Ref"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Transaction ID</label>
                              <input
                                type="text"
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value)}
                                className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Invoice Number</label>
                              <input
                                type="text"
                                value={invoiceNumber}
                                onChange={e => setInvoiceNumber(e.target.value)}
                                className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Receipt Number</label>
                              <input
                                type="text"
                                value={receiptNumber}
                                onChange={e => setReceiptNumber(e.target.value)}
                                className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Who Paid?</label>
                            <input
                              type="text"
                              value={whoPaid}
                              onChange={e => setWhoPaid(e.target.value)}
                              className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                              placeholder="Organization name or individual"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Payment Date</label>
                            <input
                              type="date"
                              value={paymentDate}
                              onChange={e => setPaymentDate(e.target.value)}
                              className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Verification Notes</label>
                        <textarea
                          rows={3}
                          value={verificationNotes}
                          onChange={e => setVerificationNotes(e.target.value)}
                          className="w-full p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg"
                          placeholder="Notes about payment verification..."
                        />
                      </div>

                      <div className="grid gap-3 pt-2">
                        <button
                          className="primary !bg-amber-500 hover:!bg-amber-600 !text-white !border-none !py-3"
                          onClick={handlePaymentVerify}
                          disabled={!!status}
                        >
                          <FileCheck className="w-4 h-4" /> {paymentReceived ? 'Verify Payment & Complete Quest' : 'Mark Payment Pending'}
                        </button>
                        <button
                          className="secondary !py-3"
                          onClick={() => navigate('/submissions')}
                        >
                          Skip for Now
                        </button>
                      </div>

                      {status && (
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-500 animate-pulse pt-4">
                          <Save className="w-3.5 h-3.5" /> {status}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                     <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-2">This audit is concluded.</p>
                        <StatusBadge status={sub.status} className="!text-sm !px-4" />
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Historical Notes</p>
                        <p className="text-sm text-[var(--text-secondary)] italic bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                          &quot;{sub.reviewerNotes || 'No notes archived.'}&quot;
                        </p>
                     </div>
                  </div>
                )}
             </div>
          </section>

          {/* Audit Trace */}
          <section className="p-6 rounded-[2rem] bg-[var(--card-subtle)] border border-[var(--border)]">
             <div className="flex items-center gap-2 mb-4">
               <History className="w-4 h-4 text-[var(--text-muted)]" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Audit Information</span>
             </div>
             <div className="space-y-4">
               <div>
                 <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Submitted On</p>
                 <p className="text-xs font-medium">{new Date(sub.createdAt).toLocaleString()}</p>
               </div>
               {sub.reviewedAt && (
                 <div>
                   <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Reviewed On</p>
                   <p className="text-xs font-medium">{new Date(sub.reviewedAt).toLocaleString()}</p>
                 </div>
               )}
               {sub.reviewerId && (
                 <div>
                   <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Auditor ID</p>
                   <p className="text-xs font-mono text-[var(--text-secondary)]">{sub.reviewerId.slice(0, 16)}...</p>
                 </div>
               )}
             </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

