import { useAuth } from '../../context/AuthContext';
import type { ActivityLog, DashboardMetric, Organization, RevenueEvent } from '../../types/guild';

interface Props {
  metrics: DashboardMetric[];
  organizations: Organization[];
  revenue: RevenueEvent[];
  logs: ActivityLog[];
}

export function AdminDashboard({ metrics, organizations, revenue, logs }: Props) {
  const { profile } = useAuth();
  
  const totalRevenue = revenue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  return (
    <section className="page-grid">
      <div className="hero-panel">
        <h2>Admin Dashboard</h2>
        <p>System health, financial oversight, and global audit trail.</p>
      </div>
      <div className="metrics-grid">
        <article className="metric-card"><span>Total Organizations</span><strong>{organizations.length}</strong></article>
        <article className="metric-card"><span>Total Revenue Tracked</span><strong>?{totalRevenue.toLocaleString('en-IN')}</strong></article>
      </div>
      <section className="panel wide">
        <h3>System Audit Trail</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>User</th><th>Time</th></tr></thead>
            <tbody>
              {logs.slice(0, 8).map(log => (
                <tr key={log.id}>
                  <td><strong>{log.action}</strong></td>
                  <td>{log.userName || log.userId}</td>
                  <td>{new Date(log.time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
