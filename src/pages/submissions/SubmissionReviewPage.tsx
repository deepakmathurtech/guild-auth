import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, updateLedgerRecord, createLedgerRecord } from '../../lib/repository';
import { approveSubmission } from '../../services/workflowService';
import { useAuth } from '../../context/AuthContext';
import type { QuestSubmission } from '../../types/guild';

export function SubmissionReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [sub, setSub] = useState<QuestSubmission | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecord('questSubmissions', id).then(data => {
      if (data) {
        setSub(data);
        setNotes(data.reviewerNotes || '');
      }
    });
  }, [id]);

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (!sub || !profile) return;
    setStatus('Processing...');
    try {
      if (decision === 'approved') {
        await approveSubmission(sub, profile, notes);
      } else {
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
      }

      setStatus('');
      navigate('/submissions');
    } catch (err: any) {
      setStatus(err.message || 'Processing failed.');
    }
  }

  if (!sub) return <p className="p-8">Loading submission...</p>;

  return (
    <section className="page-grid">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">Submission Review</p>
          <h2>{sub.questTitle || sub.questId}</h2>
          <p>Submitted by: {sub.memberId}</p>
        </div>
        <button className="ghost" onClick={() => navigate('/submissions')}>&larr; Back to Queue</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel">
          <h3>Evidence & Report</h3>
          <div className="space-y-4 mt-4">
            <div>
              <strong>Report:</strong>
              <p className="mt-1 bg-gray-900 p-3 rounded text-gray-300">{sub.report || 'No written report provided.'}</p>
            </div>
            {sub.evidenceUrls && sub.evidenceUrls.length > 0 && (
              <div>
                <strong>Evidence URLs:</strong>
                <ul className="list-disc ml-6 mt-1 text-blue-400">
                  {sub.evidenceUrls.map((url, i) => <li key={i}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>)}
                </ul>
              </div>
            )}
            {sub.links && sub.links.length > 0 && (
              <div>
                <strong>External Links:</strong>
                <ul className="list-disc ml-6 mt-1 text-blue-400">
                  {sub.links.map((url, i) => <li key={i}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="panel form-grid">
          <h3 className="span-2">Reviewer Action</h3>
          {sub.status === 'pending' ? (
            <>
              <label className="span-2">Reviewer Notes (Feedback)
                <textarea 
                  placeholder="Explain your decision..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </label>
              <div className="span-2 flex space-x-4 mt-4">
                <button className="primary flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleDecision('approved')}>Approve & Verify</button>
                <button className="primary flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleDecision('rejected')}>Reject</button>
              </div>
              {status && <p className="muted span-2">{status}</p>}
            </>
          ) : (
            <div className="span-2">
              <p className="mb-2">This submission has already been processed.</p>
              <p><strong>Status:</strong> <StatusBadge status={{sub.status}} /></p>
              <p className="mt-2"><strong>Notes:</strong> {sub.reviewerNotes || 'None'}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
