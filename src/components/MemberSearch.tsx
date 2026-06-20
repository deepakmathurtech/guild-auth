import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GuildUser } from '../types/guild';
import { Search, User, MapPin, Star, X, ChevronRight } from 'lucide-react';

interface Props {
  onSelect: (user: GuildUser) => void;
  selectedId?: string;
}

const MEMBER_ROLES = ['member', 'contributor', 'receptionistCandidate', 'receptionist'];

export function MemberSearch({ onSelect, selectedId }: Props) {
  const [users, setUsers] = useState<GuildUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const q = query(
          collection(db, 'users'),
          where('archiveStatus', '==', 'active'),
          limit(100)
        );
        const snap = await getDocs(q);
        const allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));
        // Filter to member roles in JavaScript (Firestore 'in' has limitations)
        const filtered = allUsers.filter(u => u.role && MEMBER_ROLES.includes(u.role));
        setUsers(filtered);
      } catch (err) {
        console.error('Failed to load users:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const results = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.fullName.toLowerCase().includes(lower) || 
      u.email.toLowerCase().includes(lower) ||
      u.city?.toLowerCase().includes(lower) ||
      u.skills?.some(s => s.toLowerCase().includes(lower))
    ).slice(0, 5); 
  }, [users, search]);

  const selectedUser = useMemo(() => users.find(u => u.uid === selectedId), [users, selectedId]);

  return (
    <div className="space-y-4">
      {selectedUser ? (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
              {selectedUser.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text)]">{selectedUser.fullName}</p>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                {selectedUser.email} <span className="w-1 h-1 rounded-full bg-[var(--border)]" /> Rep: {selectedUser.reputationScore}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="p-2 hover:bg-emerald-500/10 rounded-full text-emerald-500 transition-colors" 
            onClick={() => onSelect({} as GuildUser)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={loading ? "Loading personnel..." : "Search personnel by name, skill, or city..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={loading}
              className="pl-10 !bg-[var(--bg)]"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 rounded-full animate-spin border-[var(--border)] border-t-[var(--primary)]" />
              </div>
            )}
          </div>
          
          {search && (
            <div className="absolute top-full left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl mt-2 z-20 shadow-[var(--shadow-lg)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {results.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {results.map(u => (
                    <button 
                      key={u.uid} 
                      type="button" 
                      className="w-full text-left p-4 hover:bg-[var(--card-subtle)] flex items-center justify-between group transition-colors"
                      onClick={() => {
                        onSelect(u);
                        setSearch('');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <strong className="text-sm font-bold text-[var(--text)]">{u.fullName}</strong>
                            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> {u.reputationScore || 0}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-2">
                             <MapPin className="w-3 h-3" /> {u.city || 'National'} &middot; {u.email}
                          </p>
                          {u.skills && u.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {u.skills.slice(0, 3).map(s => (
                                <span key={s} className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--text-muted)]">
                   <p className="text-sm font-medium">No personnel matched &quot;{search}&quot;</p>
                   <p className="text-xs mt-1">Try another name, skill, or city.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

