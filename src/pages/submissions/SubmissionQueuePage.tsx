import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { QuestSubmission } from '../../types/guild';

export function SubmissionQueuePage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);

  useEffect(() => {
    return subscribeRecords('questSubmissions', setSubmissions, [
      where('archiveStatus', '==', 'active'),
      where('status', '==', 'pending'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, []);

  return (
    <section className="workbench">
      <div className="panel intro">
        <p className="eyebrow">Submission Review</p>
        <h2>Verification Queue</h2>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="responsive-table">
            <thead><tr><th>Quest Title</th><th>Member UID</th><th>Status</th><th>Submitted At</th><th>Actions</th></tr></thead>
            <tbody>
              {submissions.map(sub => (
                <tr key={sub.id}>
                  <td><strong>{sub.questTitle || sub.questId}</strong></td>
                  <td>{sub.memberId}</td>
                  <td><StatusBadge status={{sub.status}} /></td>
                  <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
                  <td><button className="ghost" onClick={() => navigate(`/submissions/${sub.id}`)}>Review</button></td>
                </tr>
              ))}
              {submissions.length === 0 && <tr><td colSpan={5}>No pending submissions. All caught up!</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
