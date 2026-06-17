import { useAuth } from '../../context/AuthContext';
import type { ActivityLog, DashboardMetric, Need, Opportunity, Organization, QuestSubmission, VerificationRecord } from '../../types/guild';

interface Props {
  metrics: DashboardMetric[];
  organizations: Organization[];
  opportunities: Opportunity[];
  verifications: VerificationRecord[];
  submissions: QuestSubmission[];
}

export function ManagerDashboard({ metrics, organizations, opportunities, verifications, submissions }: Props) {
  
  
  return (
    <section className="page-grid">
      <div className="hero-panel">
        <h2>Manager Dashboard</h2>
        <p>Coordinate needs, assign opportunities, and verify member submissions.</p>
      </div>
      <div className="metrics-grid">
        <article className="metric-card"><span>Active Opportunities</span><strong>{opportunities.filter(o => ['open', 'matching', 'assigned', 'inProgress'].includes(o.status)).length}</strong></article>
        <article className="metric-card"><span>Submissions to Verify</span><strong>{submissions.filter(s => s.status === 'pending').length}</strong></article>
      </div>
      <section className="panel wide">
        <h3>Verification Queue</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Quest Title</th><th>Member UID</th><th>Status</th></tr></thead>
            <tbody>
              {submissions.filter(s => s.status === 'pending').slice(0,5).map(s => (
                <tr key={s.id}>
                  <td>{s.questTitle || s.questId}</td><td>{s.memberId}</td><td>{s.status}</td>
                </tr>
              ))}
              {submissions.filter(s => s.status === 'pending').length === 0 && <tr><td colSpan={3}>No pending submissions.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
