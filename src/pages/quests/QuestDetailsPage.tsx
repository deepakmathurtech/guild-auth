import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecord, subscribeRecords, updateLedgerRecord } from '../../lib/repository';
import { useAuth } from '../../context/AuthContext';
import type { Quest, QuestSubmission, GuildUser } from '../../types/guild';
import { where } from 'firebase/firestore';
import { MemberSearch } from '../../components/MemberSearch';

export function QuestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [quest, setQuest] = useState<Quest | null>(null);
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);

  useEffect(() => {
    if (!id) return;
    getRecord('quests', id).then(data => setQuest(data));
    return subscribeRecords('questSubmissions', setSubmissions, [where('questId', '==', id), where('archiveStatus', '==', 'active')]);
  }, [id]);

  async function handleAssignOwner(user: GuildUser) {
    if (!quest || !profile) return;
    const newOwnerId = user.uid || '';
    await updateLedgerRecord('quests', quest.id, { ownerId: newOwnerId }, profile, `Quest Assigned to ${newOwnerId}`);
    setQuest({ ...quest, ownerId: newOwnerId });
  }

  if (!quest) return <p className="p-8">Loading quest...</p>;

  return (
    <section className="page-grid">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <p className="eyebrow">Quest Details &middot; {quest.isMandatory ? 'Mandatory' : 'Optional'}</p>
          <h2>{quest.title}</h2>
          <p>{quest.category} &middot; {quest.difficulty} &middot; <StatusBadge status={quest.status} /></p>
        </div>
        <button className="ghost" onClick={() => navigate('/quests')}>&larr; Back</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel">
          <h3>Information</h3>
          <div className="space-y-2 mt-4">
            <p><strong>Description:</strong> {quest.description}</p>
            <p><strong>Rewards:</strong> {quest.rewards}</p>
            <p><strong>Reputation Points:</strong> +{quest.reputationPoints}</p>
            <p><strong>Requirements:</strong> {quest.requirements}</p>
            {quest.opportunityId && <p><strong>Linked Opportunity:</strong> {quest.opportunityId}</p>}
          </div>

          <h3 className="mt-6">Quest Owner</h3>
          <div className="mt-4">
            <MemberSearch onSelect={handleAssignOwner} selectedId={quest.ownerId} />
          </div>
        </div>
        
        <div className="panel">
          <h3>Submissions</h3>
          <div className="space-y-4 mt-4">
            {submissions.map(sub => (
              <div key={sub.id} className="border border-gray-700 p-4 rounded bg-gray-800">
                <div className="flex justify-between mb-2">
                  <strong>Member: {sub.memberId}</strong>
                  <StatusBadge status={sub.status} />
                </div>
                {sub.report && <p className="text-sm italic mb-2">&quot;{sub.report}&quot;</p>}
                <button className="ghost" onClick={() => navigate(`/submissions/${sub.id}`)}>Review Submission &rarr;</button>
              </div>
            ))}
            {submissions.length === 0 && <p className="text-gray-500">No submissions yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
