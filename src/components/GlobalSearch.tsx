import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
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

  // FUTURE: Replace with dedicated search index (e.g. Algolia or Typesense)
  // For V1.2 we do a naive multi-collection parallel fetch.
  useEffect(() => {
    if (!queryStr || queryStr.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    const searchVal = queryStr.toLowerCase();
    
    const collections = [
      { name: 'organizations', label: 'Organization', path: '/organizations' },
      { name: 'opportunities', label: 'Opportunity', path: '/opportunities' },
      { name: 'quests', label: 'Quest', path: '/quests' },
      { name: 'users', label: 'Member', path: '/admin' } // assuming members go to admin or profile
    ];

    Promise.all(
      collections.map(async (c) => {
        // Very naive "name/title" search using startAt/endAt is not great in Firestore. 
        // Better to pull 20 recent records and filter locally for V1.2.
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
            path: `${c.path}/${data.id || data.uid}`
          };
        }).filter(r => r.title?.toLowerCase().includes(searchVal) || r.subtitle?.toLowerCase().includes(searchVal));
      })
    ).then(resArray => {
      setResults(resArray.flat().slice(0, 10)); // cap at 10 results
      setLoading(false);
    });

  }, [queryStr]);

  // Keyboard shortcut Ctrl+K
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
      <button className="ghost hidden md:flex" type="button" onClick={() => setOpen(true)}>
        <Search size={18} /> <span className="ml-2 text-sm text-[var(--muted)]">Search... (Ctrl+K)</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-[var(--card)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
              <Search className="text-[var(--muted)]" />
              <input 
                autoFocus
                type="text" 
                className="flex-1 bg-transparent border-0 focus:ring-0 text-lg" 
                placeholder="Search organizations, needs, quests..." 
                value={queryStr}
                onChange={e => setQueryStr(e.target.value)}
              />
              <button className="ghost border-0 p-2 rounded-full" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-2">
              {loading && <div className="p-8 text-center text-[var(--muted)]">Searching...</div>}
              {!loading && queryStr.length >= 2 && results.length === 0 && (
                <div className="p-8 text-center text-[var(--muted)]">No results found for "{queryStr}"</div>
              )}
              {!loading && results.map(r => (
                <div 
                  key={`${r.type}-${r.id}`} 
                  className="p-3 hover:bg-[var(--bg-alt)] rounded-lg cursor-pointer flex justify-between items-center transition-colors mb-1"
                  onClick={() => {
                    navigate(r.path);
                    setOpen(false);
                  }}
                >
                  <div>
                    <strong className="block text-[var(--text)]">{r.title}</strong>
                    <span className="text-xs text-[var(--muted)]">{r.type} &middot; {r.subtitle}</span>
                  </div>
                  {r.status && <StatusBadge status={r.status} />}
                </div>
              ))}
              {!queryStr && <div className="p-8 text-center text-[var(--muted)]">Type at least 2 characters to search.</div>}
            </div>
          </div>
          {/* Overlay click to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)}></div>
        </div>
      )}
    </>
  );
}
