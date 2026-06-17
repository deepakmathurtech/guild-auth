import { useAuth } from '../../context/AuthContext';
import type { ActivityLog, Need, Opportunity, Organization, QuestSubmission, RevenueEvent, VerificationRecord } from '../../types/guild';
import { ShieldCheck, Clock, CheckCircle2, Sparkles, Building2, MapPin } from 'lucide-react';

interface Props {
  organizations: Organization[];
  needs: Need[];
  opportunities: Opportunity[];
  submissions: QuestSubmission[];
  revenue: RevenueEvent[];
}

export function MemberDashboard({ opportunities, submissions, revenue }: Props) {
  const { profile } = useAuth();
  
  if (profile?.role === 'applicant') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
         <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2.5rem] grid place-items-center mx-auto mb-8 animate-bounce">
            <ShieldCheck size={40} />
         </div>
         <h1 className="text-4xl font-black mb-4">Application Under Review</h1>
         <p className="text-slate-500 text-lg leading-relaxed">
           Welcome to the Guild, <span className="font-bold text-slate-900">{profile.fullName}</span>. 
           Your application for the <span className="font-bold text-blue-600">{profile.jurisdiction.cityName} City Guild</span> 
           is currently being processed by the City Guild Master.
         </p>
         <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left">
            <h3 className="text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">Next Steps</h3>
            <ul className="space-y-4">
               <li className="flex gap-3 items-start text-sm">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white grid place-items-center text-[10px] font-bold mt-0.5">1</div>
                  <span>A Receptionist will verify your skills and interests.</span>
               </li>
               <li className="flex gap-3 items-start text-sm">
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 grid place-items-center text-[10px] font-bold mt-0.5">2</div>
                  <span className="text-slate-400">You will receive an in-app notification once approved.</span>
               </li>
               <li className="flex gap-3 items-start text-sm">
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 grid place-items-center text-[10px] font-bold mt-0.5">3</div>
                  <span className="text-slate-400">You can then browse and apply for active Quests.</span>
               </li>
            </ul>
         </div>
      </div>
    );
  }

  const mySubmissions = submissions.filter(s => s.memberId === profile?.uid);
  const myRevenue = revenue.filter(r => r.participants.includes(profile?.uid || '')).reduce((s, i) => s + (i.amount || 0), 0);
  
  return (
    <section className="space-y-8 max-w-6xl mx-auto">
      <div className="hero-panel bg-blue-600 text-white border-none shadow-blue-600/20">
         <p className="eyebrow text-blue-200">Member Command</p>
         <h1 className="text-4xl">Welcome, {profile?.fullName}</h1>
         <div className="flex gap-4 mt-6">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold">
               <MapPin size={14}/> {profile?.jurisdiction.cityName}, {profile?.jurisdiction.stateName}
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
               Rank {profile?.guildRank}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel flex flex-col items-center justify-center py-10">
          <Sparkles className="text-blue-500 mb-4" size={32}/>
          <span className="text-4xl font-black">{profile?.reputationScore || 0}</span>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Reputation Points</p>
        </div>
        <div className="panel flex flex-col items-center justify-center py-10">
          <CheckCircle2 className="text-green-500 mb-4" size={32}/>
          <span className="text-4xl font-black">{profile?.completedQuests || 0}</span>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Quests Completed</p>
        </div>
        <div className="panel flex flex-col items-center justify-center py-10">
          <div className="text-yellow-500 mb-4 font-black text-3xl">₹</div>
          <span className="text-4xl font-black">{myRevenue.toLocaleString('en-IN')}</span>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Total Earnings</p>
        </div>
      </div>

      <section className="panel p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><Building2 size={16}/> Available Opportunities</h3>
        </div>
        <div className="table-wrap border-none rounded-none">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Revenue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.filter(o => ['open', 'matching'].includes(o.status)).map(o => (
                <tr key={o.id}>
                  <td data-label="Title" className="font-bold text-sm">{o.title}</td>
                  <td data-label="Category"><span className="role-pill text-[9px]">{o.category}</span></td>
                  <td data-label="Revenue" className="font-black text-green-600 text-sm">₹{o.estimatedRevenue.toLocaleString()}</td>
                  <td><button className="primary text-[10px] px-3 py-1.5">View Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
