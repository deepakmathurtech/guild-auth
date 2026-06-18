import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { ActivityLog, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord } from '../../types/guild';
import { 
  ShieldCheck, Clock, CheckCircle2, Sparkles, Building2, 
  MapPin, TrendingUp, Wallet, Star, ArrowRight,
  ChevronRight, Info
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';

interface Props {
  organizations: Organization[];
  needs: Need[];
  opportunities: Opportunity[];
  submissions: QuestSubmission[];
  revenue: RevenueEvent[];
}

export function MemberDashboard({ opportunities, submissions, revenue }: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  if (profile?.role === 'applicant') {
    return (
      <div className="max-w-3xl mx-auto py-12 md:py-20 animate-fade-up">
         <div className="flex flex-col items-center text-center mb-12">
           <div className="w-24 h-24 bg-[var(--primary)]/10 text-[var(--primary)] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border border-[var(--primary)]/20">
              <ShieldCheck size={48} className="animate-pulse-slow" />
           </div>
           <h1 className="text-4xl font-bold tracking-tight mb-4">Application Under Review</h1>
           <p className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-xl">
             Welcome to the Guild, <span className="text-[var(--text)] font-semibold">{profile.fullName}</span>. 
             Your credentials for the <span className="text-[var(--primary)] font-semibold">{profile.jurisdiction.cityName} City Guild</span> 
             are being verified by the Federation Command.
           </p>
         </div>

         <div className="grid gap-6 md:grid-cols-3 mb-12">
            {[
              { label: 'Step 1', title: 'Identity Verification', status: 'Completed', color: 'text-emerald-500' },
              { label: 'Step 2', title: 'Skill Audit', status: 'In Progress', color: 'text-amber-500' },
              { label: 'Step 3', title: 'Guild Induction', status: 'Pending', color: 'text-[var(--text-muted)]' },
            ].map((step, i) => (
              <div key={i} className="panel p-6 flex flex-col justify-between h-32">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{step.label}</span>
                <div>
                  <p className="font-bold text-sm mb-1">{step.title}</p>
                  <p className={`text-xs font-bold uppercase tracking-wider ${step.color}`}>{step.status}</p>
                </div>
              </div>
            ))}
         </div>

         <div className="panel p-8 md:p-10 border-dashed border-2">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Operational Briefing</h3>
            </div>
            <ul className="space-y-6">
               <li className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-sm font-bold mb-1 text-[var(--text)]">Receptionist Review</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">A local Receptionist will review your profile to ensure your skills align with current Guild needs.</p>
                  </div>
               </li>
               <li className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-[var(--card-subtle)] text-[var(--text-muted)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-[var(--border)]">2</div>
                  <div>
                    <p className="text-sm font-bold mb-1 text-[var(--text-secondary)]">Verification Callback</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">You may receive a secure communication to verify your specialized skill sets or interests.</p>
                  </div>
               </li>
               <li className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-[var(--card-subtle)] text-[var(--text-muted)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-[var(--border)]">3</div>
                  <div>
                    <p className="text-sm font-bold mb-1 text-[var(--text-secondary)]">Activation</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Once activated, your Command Center will unlock access to the National Quest Board.</p>
                  </div>
               </li>
            </ul>
         </div>
      </div>
    );
  }

  const mySubmissions = submissions.filter(s => s.memberId === profile?.uid);
  const myRevenue = revenue.filter(r => r.participants.includes(profile?.uid || '')).reduce((s, i) => s + (i.amount || 0), 0);
  
  return (
    <div className="space-y-10 pb-20 animate-fade-up">
      {/* Hero Welcome */}
      <div className="hero-panel border-none shadow-none bg-[var(--card-subtle)] !p-10 overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-10 transition-opacity group-hover:opacity-20">
           <Sparkles size={120} className="text-[var(--primary)]" />
         </div>
         <div className="relative z-10">
           <p className="eyebrow">Member Portal</p>
           <h1 className="text-4xl md:text-5xl font-bold mb-6">Hello, {profile?.fullName.split(' ')[0]}</h1>
           <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold backdrop-blur-sm">
                 <MapPin size={14} className="text-[var(--primary)]" />
                 {profile?.jurisdiction.cityName}, {profile?.jurisdiction.stateName}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs font-bold text-[var(--primary)] uppercase tracking-widest">
                 Rank: {profile?.guildRank || 'Initiate'}
              </div>
           </div>
         </div>
      </div>

      {/* KPI Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Reputation Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-emerald-500">{profile?.reputationScore || 0}</strong>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mt-2">Guild Standing</p>
        </div>
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Completed Quests</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <strong className="text-blue-500">{profile?.completedQuests || 0}</strong>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mt-2">Operational Success</p>
        </div>
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Total Earnings</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <strong className="text-amber-500">₹{myRevenue.toLocaleString('en-IN')}</strong>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mt-2">Revenue Tracked</p>
        </div>
        <div className="metric-card">
          <div className="flex justify-between items-start">
            <span>Active Quests</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <strong className="text-purple-500">{opportunities.filter(o => o.assignedMembers?.includes(profile?.uid || '')).length}</strong>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mt-2">Current Assignments</p>
        </div>
      </div>

      {/* Opportunities Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-xl font-bold tracking-tight">Available Opportunities</h2>
          </div>
          <button onClick={() => navigate('/opportunities')} className="ghost text-xs flex items-center gap-2">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th className="pl-6">Quest Title</th>
                <th>Category</th>
                <th>Est. Revenue</th>
                <th>Status</th>
                <th className="pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {opportunities.filter(o => ['open', 'matching'].includes(o.status)).map(o => (
                <tr key={o.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                  <td className="pl-6 py-5">
                    <p className="font-bold text-sm text-[var(--text)]">{o.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{o.organizationName}</p>
                  </td>
                  <td>
                    <span className="role-pill">{o.category}</span>
                  </td>
                  <td>
                    <p className="font-bold text-emerald-500 text-sm">₹{o.estimatedRevenue.toLocaleString('en-IN')}</p>
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="pr-6 text-right">
                    <button className="secondary !py-2 !px-4 text-xs group-hover:bg-[var(--primary)] group-hover:text-black group-hover:border-[var(--primary)] transition-all" onClick={() => navigate(`/opportunities/${o.id}`)}>
                      Explore
                    </button>
                  </td>
                </tr>
              ))}
              {opportunities.filter(o => ['open', 'matching'].includes(o.status)).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-[var(--text-muted)] italic">No open opportunities in your jurisdiction at this time.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

