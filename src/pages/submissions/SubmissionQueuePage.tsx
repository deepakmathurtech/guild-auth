import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { QuestSubmission } from '../../types/guild';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';

export function SubmissionQueuePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);

  useEffect(() => {
    if (!profile) return;
    const base = [
      where('archiveStatus', '==', 'active'),
      where('status', '==', 'pending')
    ];
    if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) {
       // National see all
    } else if (profile.role === 'stateGuildMaster') {
       base.push(where('jurisdiction.stateId', '==', profile.jurisdiction.stateId));
    } else {
       base.push(where('jurisdiction.cityId', '==', profile.jurisdiction.cityId));
    }

    return subscribeRecords('questSubmissions', setSubmissions, [
      ...base,
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, [profile]);

  return (
    <section className="workbench">
      <div className="panel intro">
        <p className="eyebrow">Submission Review</p>
        <h2>Verification Queue</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Review pending member work, approve verified submissions, and keep quest closeout moving.</p>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="responsive-table">
            <thead><tr><th>Quest Title</th><th>Member UID</th><th>Status</th><th>Submitted At</th><th>Actions</th></tr></thead>
            <tbody>
              {submissions.map(sub => (
                <tr key={sub.id}>
                  <td data-label="Quest Title"><strong>{sub.questTitle || sub.questId}</strong></td>
                  <td data-label="Member UID">{sub.memberId}</td>
                  <td data-label="Status"><StatusBadge status={sub.status} /></td>
                  <td data-label="Submitted At">{new Date(sub.createdAt).toLocaleDateString()}</td>
                  <td data-label="Actions"><button className="ghost" onClick={() => navigate(`/submissions/${sub.id}`)}>Review</button></td>
                </tr>
              ))}
              {submissions.length === 0 && <tr><td colSpan={5}><EmptyState title="No Pending Submissions" description="All submitted work is reviewed. When members submit quest evidence, it will appear here automatically." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
