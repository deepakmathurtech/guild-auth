import { useState, useEffect } from 'react';
import { Search, X, Command as CommandIcon, ArrowRight, Building2, Sparkles, ClipboardCheck, User, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StatusBadge } from './StatusBadge';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [queryStr, setQueryStr] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!queryStr || queryStr.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    const searchVal = queryStr.toLowerCase();
    
    const collections = [
      { name: 'organizations', label: 'Organization', path: '/organizations', icon: Building2 },
      { name: 'opportunities', label: 'Opportunity', path: '/opportunities', icon: Sparkles },
      { name: 'quests', label: 'Quest', path: '/quests', icon: ClipboardCheck },
      { name: 'users', label: 'Member', path: '/admin', icon: User }
    ];

    Promise.all(
      collections.map(async (c) => {
        const q = query(collection(db, c.name), where('archiveStatus', '==', 'active'), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id || data.uid,
            title: data.title || data.name || data.fullName,
            subtitle: data.description || data.email || data.category,
            status: data.status,
            type: c.label,
            icon: c.icon,
            path: `${c.path}/${data.id || data.uid}`
          };
        }).filter(r => r.title?.toLowerCase().includes(searchVal) || r.subtitle?.toLowerCase().includes(searchVal));
      })
    ).then(resArray => {
      setResults(resArray.flat().slice(0, 8)); 
      setLoading(false);
    });

  }, [queryStr]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button 
        className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-light)] transition-all group min-w-[240px]" 
        type="button" 
        onClick={() => setOpen(true)}
      >
        <Search className="w-4 h-4 group-hover:text-[var(--primary)] transition-colors" /> 
        <span className="text-xs font-medium flex-1 text-left">Search Federation...</span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[9px] font-bold">
           <CommandIcon className="w-2.5 h-2.5" /> K
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
          <div 
            className="bg-[var(--card)] w-full max-w-2xl rounded-[2rem] shadow-[var(--shadow-lg)] overflow-hidden border border-[var(--border-light)] animate-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center gap-4 bg-[var(--card-subtle)]">
              <Search className="text-[var(--primary)] w-6 h-6" />
              <input 
                autoFocus
                type="text" 
                className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-medium placeholder-[var(--text-muted)]" 
                placeholder="Find organizations, missions, or members..." 
                value={queryStr}
                onChange={e => setQueryStr(e.target.value)}
              />
              <button 
                className="p-2 hover:bg-[var(--bg)] rounded-full transition-colors text-[var(--text-muted)]" 
                onClick={() => setOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[480px] overflow-y-auto p-4 custom-scrollbar">
              {loading && (
                <div className="p-12 text-center">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin border-[var(--muted)] border-t-[var(--primary)] mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Scanning Ledger...</p>
                </div>
              )}
              
              {!loading && queryStr.length >= 2 && results.length === 0 && (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <p className="text-sm font-medium">No records found for &quot;{queryStr}&quot;</p>
                  <p className="text-xs mt-1">Try searching by title, name, or category.</p>
                </div>
              )}

              {!loading && results.map(r => {
                const Icon = r.icon;
                return (
                  <div 
                    key={`${r.type}-${r.id}`} 
                    className="p-4 hover:bg-[var(--card-subtle)] rounded-2xl cursor-pointer flex justify-between items-center transition-all group mb-1 border border-transparent hover:border-[var(--border-light)]"
                    onClick={() => {
                      navigate(r.path);
                      setOpen(false);
                      setQueryStr('');
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:border-[var(--primary)]/30 transition-all">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <strong className="text-base font-bold text-[var(--text)]">{r.title}</strong>
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">{r.type}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-[340px]">{r.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.status && <StatusBadge status={r.status} className="!text-[8px] !px-2" />}
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}

              {!queryStr && (
                <div className="p-8">
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 text-center">Quick Navigation</p>
                   <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Organizations', path: '/organizations', icon: Building2 },
                        { label: 'Mission Board', path: '/quests', icon: ClipboardCheck },
                        { label: 'Intake Needs', path: '/needs', icon: Flag },
                        { label: 'Work Pipeline', path: '/opportunities', icon: Sparkles },
                      ].map(link => (
                        <button 
                          key={link.path}
                          className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all group"
                          onClick={() => { navigate(link.path); setOpen(false); }}
                        >
                           <link.icon className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                           <span className="text-xs font-bold">{link.label}</span>
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-[var(--border)] bg-[var(--card-subtle)]/50 flex justify-between items-center px-8">
               <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  <div className="flex items-center gap-1.5">
                    <div className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">ESC</div>
                    <span>Close</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">ENTER</div>
                    <span>Select</span>
                  </div>
               </div>
               <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.3em]">Guild OS Search</p>
            </div>
          </div>
          {/* Overlay click to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)}></div>
        </div>
      )}
    </>
  );
}

