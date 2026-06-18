import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, MessageSquare, Shield, Sparkles, X, Archive, Trash2, CheckCheck } from 'lucide-react';
import { query, collection, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { NotificationService } from '../services/notificationService';
import type { NotificationRecord, NotificationStatus } from '../types/guild';

export function NotificationCenter() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', profile.uid),
      where('status', 'in', ['unread', 'read']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationRecord)));
    });
    return unsubscribe;
  }, [profile]);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  async function markAllAsRead() {
    if (!profile) return;
    await NotificationService.bulkAction(profile.uid, 'read');
  }

  return (
    <div className="relative">
      <button 
        className={`p-2.5 rounded-xl transition-all relative ${open ? 'bg-[var(--card-subtle)] text-[var(--text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)]/50'}`} 
        type="button" 
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-4 h-4" /> 
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--primary)] rounded-full ring-2 ring-[var(--bg)] animate-pulse" />
        )}
      </button>

      {open && (
        <>
          <div className="absolute right-0 top-full mt-4 w-[400px] bg-[var(--card)] border border-[var(--border-light)] rounded-[1.5rem] shadow-[var(--shadow-lg)] z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--card-subtle)] flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Operational Briefs</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Live Federation Pulse</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1">
                    <CheckCheck size={12}/> MARK ALL READ
                  </button>
                )}
                <span className="text-[10px] font-bold bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-full border border-[var(--primary)]/20">
                  {unreadCount} UNREAD
                </span>
              </div>
            </div>
            
            <div className="max-h-[420px] overflow-y-auto p-2 custom-scrollbar">
              {notifications.map(n => {
                let Icon = MessageSquare;
                let color = 'text-[var(--primary)] bg-[var(--primary)]/5';
                
                if (n.type.startsWith('quest')) { Icon = Sparkles; color = 'text-sky-500 bg-sky-500/5'; }
                if (n.type.includes('verify') || n.type.includes('audit')) { Icon = Shield; color = 'text-purple-500 bg-purple-500/5'; }
                if (n.type.includes('approved')) { Icon = CheckCircle2; color = 'text-emerald-500 bg-emerald-500/5'; }
                if (n.priority === 'high' || n.priority === 'critical') { color = 'text-red-500 bg-red-500/5'; }

                return (
                  <div 
                    key={n.id} 
                    className={`p-4 rounded-xl border border-transparent hover:bg-[var(--card-subtle)]/50 cursor-pointer transition-all flex gap-4 group mb-1 ${n.status === 'unread' ? 'bg-[var(--primary)]/5 !border-[var(--primary)]/10' : ''}`}
                    onClick={() => {
                      if (n.status === 'unread') NotificationService.markAsRead(n.id, profile!);
                    }}
                  >
                    <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <strong className="block text-xs font-bold text-[var(--text)] truncate pr-4">
                          {n.title} {n.aggregatedCount && n.aggregatedCount > 1 && `(${n.aggregatedCount})`}
                        </strong>
                        <span className="text-[9px] font-medium text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">{n.body}</p>
                      
                      <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); NotificationService.archive(n.id, profile!); }} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1">
                           <Archive size={10}/> ARCHIVE
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); NotificationService.dismiss(n.id, profile!); }} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1">
                           <Trash2 size={10}/> DISMISS
                         </button>
                      </div>
                    </div>
                    {n.status === 'unread' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />}
                  </div>
                );
              })}
              
              {notifications.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--card-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                    <CheckCircle2 className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text)]">Operational Silence</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">No active briefs recorded for your post.</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-[var(--card-subtle)] border-t border-[var(--border)] flex gap-2">
               <button onClick={() => setOpen(false)} className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border border-[var(--border)] rounded-lg">
                 Close Brief
               </button>
               <button className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity">
                 View Full Archive
               </button>
            </div>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

