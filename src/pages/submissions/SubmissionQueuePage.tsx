import { StatusBadge } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limit, orderBy, where } from 'firebase/firestore';
import { subscribeRecords } from '../../lib/repository';
import type { QuestSubmission } from '../../types/guild';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { ClipboardCheck, Search, Filter, ArrowUpRight, Clock, User, CheckCircle2 } from 'lucide-react';

export function SubmissionQueuePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    const base = [
      where('archiveStatus', '==', 'active'),
      where('status', '==', 'pending')
    ];
    if (['guildFounder', 'centralGuildMaster', 'founder'].includes(profile.role)) {
       // National see all
    } else if (profile.role === 'stateGuildMaster') {
       base.push(where('jurisdiction.stateId', '==', profile.jurisdiction.stateId));
    } else {
       base.push(where('jurisdiction.cityId', '==', profile.jurisdiction.cityId));
    }

    return subscribeRecords('questSubmissions', setSubmissions, [
      ...base,
      orderBy('updatedAt', 'desc'),
      limit(200)
    ]);
  }, [profile]);

  const visible = submissions.filter(sub => 
    (sub.questTitle || sub.questId).toLowerCase().includes(search.toLowerCase()) ||
    sub.memberId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Quality Assurance</p>
          <h1>Verification Queue</h1>
          <p className="text-[var(--text-secondary)] max-w-lg">
            Review pending mission evidence, audit protocol compliance, and authorize quest closeouts.
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest">
           <Clock className="w-4 h-4 animate-pulse" /> {submissions.length} Items Awaiting
        </div>
      </div>

      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              className="pl-10" 
              placeholder="Search by mission title or member ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        {/* List View */}
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th className="pl-6">Mission Deployment</th>
                <th>Submitted Personnel</th>
                <th>Protocol Status</th>
                <th>Submission Time</th>
                <th className="pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map(sub => (
                <tr key={sub.id} className="hover:bg-[var(--card-subtle)]/50 transition-all group">
                  <td className="pl-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-amber-500 transition-colors">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text)]">{sub.questTitle || 'Untitled Mission'}</p>
                        <p className="text-xs text-[var(--text-muted)] font-mono">{sub.questId.slice(0, 12)}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                      <User className="w-3.5 h-3.5" />
                      {sub.memberId.slice(0, 16)}...
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={sub.status} />
                  </td>
                  <td>
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      {new Date(sub.createdAt).toLocaleDateString()} at {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="pr-6 text-right">
                    <button 
                      className="secondary !py-2 !px-4 text-xs group-hover:bg-[var(--primary)] group-hover:text-black group-hover:border-[var(--primary)] transition-all" 
                      onClick={() => navigate(`/submissions/${sub.id}`)}
                    >
                      Enter Audit <ArrowUpRight className="w-3 h-3 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {visible.length === 0 && (
            <div className="p-10 border-t border-[var(--border)]">
              <EmptyState 
                title="Review Chamber Empty" 
                description={search ? "No submissions match your search. Protocol check complete." : "All guild work is currently verified. New submissions will appear here automatically."}
                icon={<CheckCircle2 className="w-8 h-8 opacity-40 text-emerald-500" />}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

