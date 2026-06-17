import React, { useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, Organization, Opportunity, Quest, GuildUser } from '../../types/guild';
import { Shield, Target, Activity, TrendingUp, Users, BookOpen } from 'lucide-react';

export function FounderDashboard() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState({
    healthScore: 0,
    activeOrgs: 0,
    activeOpportunities: 0,
    activeMembers: 0,
    knowledgeGrowth: 0,
    totalRevenue: 0
  });

  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    async function loadFounderData() {
      // Load raw counts for metrics
      const usersSnap = await getDocs(collection(db, 'users'));
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const oppsSnap = await getDocs(collection(db, 'opportunities'));
      const knowledgeSnap = await getDocs(collection(db, 'knowledgeBase'));
      const revenueSnap = await getDocs(collection(db, 'revenueEvents'));
      const logsSnap = await getDocs(query(collection(db, 'activityLogs')));

      let revenue = 0;
      revenueSnap.docs.forEach(d => revenue += (d.data().amount || 0));

      const activeMembers = usersSnap.docs.length;
      const verifiedWorkCount = oppsSnap.docs.filter(d => d.data().status === 'completed').length;
      
      // Guild Health Score calculation (simple logic)
      let health = 0;
      if (activeMembers > 0) health += 20;
      if (verifiedWorkCount > 0) health += 20;
      if (knowledgeSnap.docs.length > 0) health += 20;
      if (orgsSnap.docs.length > 0) health += 20;
      if (revenue > 0) health += 20;

      setMetrics({
        healthScore: health,
        activeOrgs: orgsSnap.docs.length,
        activeOpportunities: oppsSnap.docs.filter(d => d.data().status === 'open' || d.data().status === 'inProgress').length,
        activeMembers: activeMembers,
        knowledgeGrowth: knowledgeSnap.docs.length,
        totalRevenue: revenue
      });

      const sortedLogs = logsSnap.docs.map(d => d.data() as ActivityLog).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
      setRecentActivity(sortedLogs);
    }
    loadFounderData();
  }, []);

  return (
    <div className="page-grid">
      <div className="topbar">
        <div className="flex gap-4 items-center">
          <Shield className="w-8 h-8 text-[var(--primary)]" />
          <div>
            <h1 className="text-2xl font-bold">Founder Oversight</h1>
            <p className="text-[var(--muted)]">Permanent Audit & System Health</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="panel flex flex-col items-center justify-center py-8">
          <Activity className="w-12 h-12 text-blue-500 mb-2" />
          <h3 className="text-4xl font-bold">{metrics.healthScore} / 100</h3>
          <p className="text-[var(--muted)] font-medium uppercase text-xs tracking-wider mt-1">Guild Health Score</p>
        </div>
        
        <div className="panel">
          <h3 className="eyebrow flex items-center gap-2"><Target className="w-4 h-4"/> Guild Metrics</h3>
          <div className="grid gap-3 mt-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted)]">Active Members</span>
              <span className="font-bold">{metrics.activeMembers}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted)]">Active Organizations</span>
              <span className="font-bold">{metrics.activeOrgs}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted)]">Active Opportunities</span>
              <span className="font-bold">{metrics.activeOpportunities}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 className="eyebrow flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Growth Trends</h3>
          <div className="grid gap-3 mt-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted)]">Total Revenue Flow</span>
              <span className="font-bold text-green-600">₹{metrics.totalRevenue}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted)] flex items-center gap-1"><BookOpen className="w-3 h-3"/> Knowledge Added</span>
              <span className="font-bold">{metrics.knowledgeGrowth} Entries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 className="eyebrow mb-4">Live Operational Audit</h3>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Entity Type</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(log => (
                <tr key={log.id}>
                  <td data-label="Time">{new Date(log.time).toLocaleString()}</td>
                  <td data-label="Operator" className="font-medium text-[var(--primary)]">{log.userName || log.userId}</td>
                  <td data-label="Action">{log.action}</td>
                  <td data-label="Type"><span className="role-pill">{log.relatedEntityType}</span></td>
                </tr>
              ))}
              {recentActivity.length === 0 && (
                <tr><td colSpan={4} className="text-center py-4">No recent activity found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
