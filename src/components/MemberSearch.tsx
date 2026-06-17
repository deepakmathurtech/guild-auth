import { useState, useEffect, useMemo } from 'react';
import { listRecords } from '../lib/repository';
import type { GuildUser } from '../types/guild';
import { where } from 'firebase/firestore';

interface Props {
  onSelect: (user: GuildUser) => void;
  selectedId?: string;
}

export function MemberSearch({ onSelect, selectedId }: Props) {
  const [users, setUsers] = useState<GuildUser[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Only load members and contributors for assignment
    listRecords('users', [
      where('archiveStatus', '==', 'active'),
      where('role', 'in', ['member', 'contributor'])
    ]).then(setUsers);
  }, []);

  const results = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.fullName.toLowerCase().includes(lower) || 
      u.email.toLowerCase().includes(lower) ||
      u.city?.toLowerCase().includes(lower) ||
      u.skills?.some(s => s.toLowerCase().includes(lower))
    ).slice(0, 5); // show top 5
  }, [users, search]);

  const selectedUser = useMemo(() => users.find(u => u.uid === selectedId), [users, selectedId]);

  return (
    <div className="member-search">
      {selectedUser ? (
        <div className="p-3 border border-green-500 bg-green-900 rounded flex justify-between items-center">
          <div>
            <strong>{selectedUser.fullName}</strong>
            <p className="text-sm text-gray-300">{selectedUser.email} &middot; Rep: {selectedUser.reputationScore}</p>
          </div>
          <button type="button" className="ghost text-xs" onClick={() => onSelect({} as GuildUser)}>Change</button>
        </div>
      ) : (
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by Name, Email, Skill, or City..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full"
          />
          {search && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded mt-1 z-10 max-h-48 overflow-y-auto">
              {results.map(u => (
                <button 
                  key={u.uid} 
                  type="button" 
                  className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                  onClick={() => {
                    onSelect(u);
                    setSearch('');
                  }}
                >
                  <div className="flex justify-between">
                    <strong>{u.fullName}</strong>
                    <span className="text-xs bg-gray-900 px-2 py-1 rounded">Rep: {u.reputationScore || 0}</span>
                  </div>
                  <p className="text-sm text-gray-400">{u.email} &middot; {u.city || 'No City'}</p>
                  {u.skills?.length > 0 && <p className="text-xs text-blue-400 mt-1">{u.skills.join(', ')}</p>}
                </button>
              ))}
            </div>
          )}
          {search && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded mt-1 p-3 z-10 text-gray-400 text-sm">
              No members found matching "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
