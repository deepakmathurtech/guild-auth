import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, BarChart, FileSearch, GraduationCap } from 'lucide-react';
import type { ActivityLog, DashboardMetric, Organization, RevenueEvent, RankReviewTicket, GuildUser } from '../../types/guild';
import { StatusBadge } from '../StatusBadge';

interface Props {
  metrics: DashboardMetric[];
  organizations: Organization[];
  revenue: RevenueEvent[];
  logs: ActivityLog[];
}

export function AdminDashboard({ organizations, revenue, logs }: Props) {
  const [rankTickets, setRankTickets] = useState<RankReviewTicket[]>([]);
  const [rankDistribution, setRankDistribution] = useState<Record<string, number>>({});
  const [healthScore, setHealthScore] = useState(0);
  
  useEffect(() => {
    async function fetchAdminData() {
      // Fetch Pending Rank Reviews
      const ticketsSnap = await getDocs(query(collection(db, 'rankReviews'), where('status', '==', 'pending')));
      setRankTickets(ticketsSnap.docs.map(d => {
        const data = d.data() as RankReviewTicket;
        return { ...data, id: d.id };
      }));

      // Fetch Users to calculate Rank Distribution and basic Health Score
      const usersSnap = await getDocs(collection(db, 'users'));
      const dist: Record<string, number> = {};
      usersSnap.docs.forEach(doc => {
        const rank = (doc.data() as GuildUser).guildRank || 'Applicant';
        dist[rank] = (dist[rank] || 0) + 1;
      });
      setRankDistribution(dist);
      
      const knowledgeSnap = await getDocs(collection(db, 'knowledgeBase'));
      
      // Calculate a rough Health Score (similar to Founder, but we can display different details)
      let health = 0;
      if (usersSnap.docs.length > 0) health += 20;
      if (organizations.length > 0) health += 20;
      if (knowledgeSnap.docs.length > 0) health += 20;
      if (revenue.length > 0) health += 20;
      if (logs.length > 0) health += 20;
      setHealthScore(health);
    }
    fetchAdminData();
  }, [organizations, revenue, logs]);

  const totalRevenue = revenue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  return (
    <section className="page-grid">
      <div className="hero-panel flex justify-between items-start">
        <div>
          <h2 className="flex items-center gap-2"><ShieldAlert size={28} /> Guild Administrator</h2>
          <p>Protecting the Trust, Safety, and Law of The Guild.</p>
        </div>
        <div className="text-right">
           <p className="eyebrow">Guild Health Score</p>
           <p className="text-3xl font-bold text-blue-500">{healthScore} / 100</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Next Actions */}
        <div className="space-y-6">
          <section className="panel p-0 overflow-hidden">
             <div className="bg-red-500/10 border-b border-[var(--border)] p-4 flex justify-between items-center">
               <h3 className="text-red-700 dark:text-red-400 font-bold">My Next Actions</h3>
             </div>
             <div className="p-0">
               {rankTickets.map(ticket => (
                 <div key={ticket.id} className="border-b border-[var(--border)] last:border-0 p-4 hover:bg-[var(--bg-alt)] flex justify-between items-center">
                   <div>
                     <strong className="block text-sm">Review D Rank Candidate</strong>
                     <span className="text-xs text-[var(--muted)]">Member ID: {ticket.memberId}</span>
                   </div>
                   <button className="primary bg-red-600 text-xs px-3 py-1">Review Profile</button>
                 </div>
               ))}
               {rankTickets.length === 0 && (
                 <div className="p-8 text-center text-[var(--muted)]">No pending Rank Candidates or Escalations.</div>
               )}
             </div>
          </section>

          <section className="panel">
             <h3 className="flex items-center gap-2 mb-4"><GraduationCap size={18} /> Rank Distribution</h3>
             <div className="grid grid-cols-4 gap-2">
               {['S', 'A', 'B', 'C', 'D', 'E', 'F', 'Applicant'].map(rank => (
                 <div key={rank} className="bg-[var(--bg-alt)] p-2 rounded text-center">
                    <span className="block text-xs font-bold text-[var(--muted)]">{rank}</span>
                    <span className="block text-lg">{rankDistribution[rank] || 0}</span>
                 </div>
               ))}
             </div>
          </section>
        </div>

        {/* Global Stats & Audit */}
        <div className="space-y-6">
          <div className="metrics-grid">
            <article className="metric-card"><span>Total Organizations</span><strong>{organizations.length}</strong></article>
            <article className="metric-card"><span>Total Revenue Tracked</span><strong className="text-green-500">?{totalRevenue.toLocaleString('en-IN')}</strong></article>
          </div>

          <section className="panel p-0 overflow-hidden">
            <div className="bg-[var(--card)] border-b border-[var(--border)] p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><FileSearch size={18} /> Permanent Audit Trail</h3>
            </div>
            <div className="p-0">
               {logs.slice(0, 5).map(log => (
                 <div key={log.id} className="border-b border-[var(--border)] last:border-0 p-3 flex justify-between items-start text-sm">
                   <div>
                     <strong className="block text-blue-400">{log.action}</strong>
                     <span className="text-xs text-[var(--muted)]">Operator: {log.userName || log.userId}</span>
                   </div>
                   <span className="text-xs text-[var(--muted)]">{new Date(log.time).toLocaleString()}</span>
                 </div>
               ))}
            </div>
            <div className="p-2 bg-[var(--bg-alt)] text-center text-xs">
               <button className="ghost text-[var(--muted)] hover:text-white">View Full Audit Log &rarr;</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
