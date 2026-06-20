import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { ActivityLog, DashboardMetric, Need, Opportunity, Organization, QuestSubmission, VerificationRecord } from '../../types/guild';
import {
  ArrowUpRight, CheckCircle, Clock, AlertTriangle, Shield, Users, Briefcase, Target
} from 'lucide-react';

interface Props {
  metrics: DashboardMetric[];
  organizations: Organization[];
  opportunities: Opportunity[];
  verifications: VerificationRecord[];
  submissions: QuestSubmission[];
}

export function ManagerDashboard({ metrics, organizations, opportunities, verifications, submissions }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // GM-specific metrics - use decision for verification status
  const pendingVerifications = verifications.filter(v => v.decision === 'pending');
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  const kpis = [
    { label: 'Pending Verifications', value: pendingVerifications.length, color: 'text-amber-500', icon: Shield },
    { label: 'Active Opps', value: opportunities.filter(o => ['open', 'matching', 'assigned', 'inProgress'].includes(o.status)).length, color: 'text-blue-500', icon: Briefcase },
    { label: 'Submissions Review', value: pendingSubmissions.length, color: 'text-emerald-500', icon: CheckCircle },
    { label: 'Organizations', value: organizations.length, color: 'text-purple-500', icon: Users },
  ];

  return (
    <section className="page-grid">
      <div className="hero-panel">
        <p className="eyebrow">Command Center</p>
        <h2>Guild Master Operations</h2>
        <p className="text-[var(--text-secondary)]">
          Coordinate member verification, manage quest assignments, and track organizational outcomes across your jurisdiction.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="metrics-grid">
        {kpis.map((kpi, idx) => (
          <article key={idx} className="metric-card group hover:border-[var(--primary)]/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              <span className="text-[var(--text-secondary)]">{kpi.label}</span>
            </div>
            <strong className="text-2xl">{kpi.value}</strong>
          </article>
        ))}
      </div>

      {/* Verification Queue */}
      <section className="panel wide">
        <div className="flex justify-between items-center">
          <h3 className="flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" /> Verification Queue</h3>
          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded">{pendingVerifications.length} Pending</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Target</th><th>Method</th><th>Decision</th><th>Date</th></tr></thead>
            <tbody>
              {pendingVerifications.slice(0,5).map(v => (
                <tr key={v.id}>
                  <td className="font-medium">{v.targetCollection}:{v.targetId}</td>
                  <td>{v.method}</td>
                  <td><span className="status-badge pending">{v.decision}</span></td>
                  <td>{v.timestamp ? new Date(v.timestamp).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {pendingVerifications.length === 0 && <tr><td colSpan={4} className="text-center text-[var(--text-muted)]">No pending verifications.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Submissions Queue */}
      <section className="panel wide">
        <div className="flex justify-between items-center">
          <h3 className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Quest Submissions</h3>
          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">{pendingSubmissions.length} Pending</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Quest</th><th>Member</th><th>Status</th></tr></thead>
            <tbody>
              {pendingSubmissions.slice(0,5).map(s => (
                <tr key={s.id}>
                  <td className="font-medium">{s.questTitle || s.questId}</td>
                  <td>{s.memberId}</td>
                  <td><span className="status-badge">{s.status}</span></td>
                </tr>
              ))}
              {pendingSubmissions.length === 0 && <tr><td colSpan={3} className="text-center text-[var(--text-muted)]">No pending submissions.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
