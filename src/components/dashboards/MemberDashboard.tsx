import { useAuth } from '../../context/AuthContext';
import type { ActivityLog, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord } from '../../types/guild';

interface Props {
  organizations: Organization[];
  needs: Need[];
  opportunities: Opportunity[];
  submissions: QuestSubmission[];
  revenue: RevenueEvent[];
  verifications: VerificationRecord[];
  logs: ActivityLog[];
}

export function MemberDashboard({ opportunities, submissions }: Props) {
  const { profile } = useAuth();
  
  const mySubmissions = submissions.filter(s => s.memberId === profile?.uid);
  const myRevenue = profile?.revenueEarned || 0;
  
  return (
    <section className="page-grid">
      <div className="hero-panel">
        <h2>Welcome back, {profile?.fullName}</h2>
        <p>Your current Guild Rank: <strong>{profile?.guildRank}</strong></p>
      </div>
      <div className="metrics-grid">
        <article className="metric-card"><span>Total Earned</span><strong>₹{myRevenue.toLocaleString('en-IN')}</strong></article>
        <article className="metric-card"><span>Quests Completed</span><strong>{profile?.completedQuests || 0}</strong></article>
        <article className="metric-card"><span>Reputation</span><strong>{profile?.reputationScore || 0}</strong></article>
        <article className="metric-card"><span>Pending Submissions</span><strong>{mySubmissions.filter(s => s.status === 'pending').length}</strong></article>
      </div>
      <section className="panel wide">
        <h3>Available Opportunities</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Category</th><th>Required Skills</th><th>Est. Value</th></tr></thead>
            <tbody>
              {opportunities.filter(o => !o.assignedMembers?.includes(profile?.uid || '') && ['open', 'matching', 'assigned', 'inProgress'].includes(o.status)).slice(0,5).map(o => (
                <tr key={o.id}>
                  <td>{o.title}</td><td>{o.category}</td><td>{o.skillsRequired.join(', ')}</td><td>₹{o.estimatedRevenue}</td>
                </tr>
              ))}
              {opportunities.filter(o => !o.assignedMembers?.includes(profile?.uid || '') && ['open', 'matching', 'assigned', 'inProgress'].includes(o.status)).length === 0 && <tr><td colSpan={4}>No new opportunities right now.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
