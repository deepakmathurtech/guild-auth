import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { RevenueEvent, RevenueCategory, User } from '../../types/guild';
import {
  DollarSign, TrendingUp, TrendingDown, PieChart, BarChart3,
  Calendar, ArrowUpRight, ArrowDownRight, Users, Building,
  Target, Gift, Handshake, CreditCard, UsersRound, Award, MapPin,
  Clock, Activity, Filter, Download, Wallet
} from 'lucide-react';

const REVENUE_CATEGORIES: { value: RevenueCategory; label: string; color: string }[] = [
  { value: 'donation', label: 'Donations', color: 'text-blue-400' },
  { value: 'sponsorship', label: 'Sponsorships', color: 'text-purple-400' },
  { value: 'partnership', label: 'Partnerships', color: 'text-indigo-400' },
  { value: 'service', label: 'Services', color: 'text-cyan-400' },
  { value: 'membership', label: 'Membership', color: 'text-teal-400' },
  { value: 'grant', label: 'Grants', color: 'text-amber-400' },
  { value: 'event', label: 'Events', color: 'text-orange-400' },
  { value: 'quest_payout', label: 'Quest Payouts', color: 'text-rose-400' },
  { value: 'other', label: 'Other', color: 'text-gray-400' }
];

export function RevenueDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'quarter' | 'year'>('year');

  useEffect(() => {
    async function loadData() {
      try {
        const [re, us, org] = await Promise.all([
          getDocs(query(collection(db, 'revenueEvents'), orderBy('date', 'desc'), limit(500))),
          getDocs(query(collection(db, 'users'), where('archiveStatus', '==', 'active'), limit(300))),
          getDocs(query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'), limit(200)))
        ]);
        setEvents(re.docs.map(d => ({ id: d.id, ...d.data() } as RevenueEvent)));
        setUsers(us.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        setOrgs(org.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load revenue data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredEvents = useMemo(() => {
    if (timeRange === 'all') return events;
    const now = new Date();
    let startDate = new Date();
    if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
    return events.filter(e => new Date(e.date) >= startDate);
  }, [events, timeRange]);

  const summary = useMemo(() => {
    const total = filteredEvents.reduce((s, e) => s + (e.amount || 0), 0);
    const inHand = filteredEvents.reduce((s, e) => s + (e.amountInHand || 0), 0);
    const byCategory: Record<string, number> = {};
    const byBranch: Record<string, number> = {};
    const byReceptionist: Record<string, number> = {};
    const byOrg: Record<string, number> = {};
    const monthlyData: Record<string, number> = {};

    filteredEvents.forEach(e => {
      // By category
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
      // By branch
      if (e.attributedBranchId) {
        byBranch[e.attributedBranchId] = (byBranch[e.attributedBranchId] || 0) + (e.amount || 0);
      }
      // By receptionist
      if (e.attributedReceptionistId) {
        byReceptionist[e.attributedReceptionistId] = (byReceptionist[e.attributedReceptionistId] || 0) + (e.amount || 0);
      }
      // By organization
      if (e.organizationId) {
        byOrg[e.organizationId] = (byOrg[e.organizationId] || 0) + (e.amount || 0);
      }
      // Monthly trend
      const month = e.date?.substring(0, 7) || 'unknown';
      monthlyData[month] = (monthlyData[month] || 0) + (e.amount || 0);
    });

    // Calculate growth rate
    const months = Object.keys(monthlyData).sort();
    let growthRate = 0;
    if (months.length >= 2) {
      const recent = monthlyData[months[months.length - 1]] || 0;
      const previous = monthlyData[months[months.length - 2]] || 0;
      if (previous > 0) {
        growthRate = ((recent - previous) / previous) * 100;
      }
    }

    // Get top performers
    const topReceptionists = Object.entries(byReceptionist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, amount]) => {
        const user = users.find(u => u.id === id);
        return { id, name: user?.fullName || 'Unknown', amount };
      });

    const topOrgs = Object.entries(byOrg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, amount]) => {
        const org = orgs.find(o => o.id === id);
        return { id, name: org?.name || 'Unknown', amount };
      });

    // Recurring revenue
    const recurring = filteredEvents
      .filter(e => e.recurring)
      .reduce((s, e) => s + (e.amount || 0), 0);

    return {
      total,
      inHand,
      byCategory,
      byBranch,
      byReceptionist,
      byOrg,
      monthlyData,
      topReceptionists,
      topOrgs,
      growthRate,
      recurring,
      eventsCount: filteredEvents.length
    };
  }, [filteredEvents, users, orgs]);

  const getUserName = (id?: string) => {
    if (!id) return '-';
    const user = users.find(u => u.id === id);
    return user?.fullName || 'Unknown';
  };

  const getOrgName = (id?: string) => {
    if (!id) return '-';
    const org = orgs.find(o => o.id === id);
    return org?.name || 'Unknown';
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Financial Operations</p>
          <h1>Revenue Dashboard</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Track income, sustainability, and attribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input w-auto"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="panel p-12 text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto" />
          <p className="text-sm mt-4 text-[var(--text-muted)]">Loading revenue data...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Total Revenue</span>
              </div>
              <div className="text-2xl font-black">${summary.total.toLocaleString()}</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">In Hand</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">${summary.inHand.toLocaleString()}</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Growth Rate</span>
              </div>
              <div className={`text-2xl font-black ${summary.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {summary.growthRate >= 0 ? '+' : ''}{summary.growthRate.toFixed(1)}%
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Recurring</span>
              </div>
              <div className="text-2xl font-black text-amber-400">${summary.recurring.toLocaleString()}</div>
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="panel">
            <h2 className="text-lg font-bold mb-4">Revenue by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {REVENUE_CATEGORIES.map(cat => {
                const amount = summary.byCategory[cat.value] || 0;
                const pct = summary.total > 0 ? (amount / summary.total) * 100 : 0;
                return (
                  <div key={cat.value} className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                    <div className={`text-sm font-bold ${cat.color}`}>{cat.label}</div>
                    <div className="text-xl font-black mt-1">${amount.toLocaleString()}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Receptionists */}
            <div className="panel">
              <div className="flex items-center gap-2 mb-4">
                <UsersRound className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-lg font-bold">Top Revenue Generators</h2>
              </div>
              {summary.topReceptionists.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {summary.topReceptionists.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-subtle)]">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-[var(--text-muted)] w-6">{i + 1}</span>
                        <div>
                          <div className="font-bold">{r.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">Receptionist</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">${r.amount.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Organizations */}
            <div className="panel">
              <div className="flex items-center gap-2 mb-4">
                <Building className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-lg font-bold">Top Organizations</h2>
              </div>
              {summary.topOrgs.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {summary.topOrgs.map((o, i) => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-subtle)]">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-[var(--text-muted)] w-6">{i + 1}</span>
                        <div>
                          <div className="font-bold">{o.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">Organization</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">${o.amount.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="panel">
            <h2 className="text-lg font-bold mb-4">Monthly Revenue Trend</h2>
            <div className="h-48 flex items-end gap-1">
              {Object.entries(summary.monthlyData)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .slice(-12)
                .map(([month, amount]) => {
                  const maxAmount = Math.max(...Object.values(summary.monthlyData));
                  const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-[var(--primary)] rounded-t transition-all hover:bg-[var(--primary)]/80"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${month}: $${amount.toLocaleString()}`}
                      />
                      <span className="text-[9px] text-[var(--text-muted)] -rotate-45 origin-top transform truncate w-full text-center">
                        {month.slice(5)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Recent Events */}
          <div className="panel">
            <h2 className="text-lg font-bold mb-4">Recent Revenue Events</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Date</th>
                    <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Source</th>
                    <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Category</th>
                    <th className="text-left p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Attribution</th>
                    <th className="text-right p-3 text-xs font-bold text-[var(--text-muted)] uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.slice(0, 10).map(event => (
                    <tr key={event.id} className="border-b border-[var(--border)] hover:bg-[var(--card-subtle)]">
                      <td className="p-3 text-sm">{event.date?.slice(0, 10)}</td>
                      <td className="p-3 text-sm">{event.sourceName || event.source}</td>
                      <td className="p-3">
                        <span className="badge badge-gray">{event.category}</span>
                      </td>
                      <td className="p-3 text-sm">
                        {getUserName(event.attributedReceptionistId)}
                      </td>
                      <td className="p-3 text-sm text-right font-bold text-emerald-400">
                        ${(event.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}