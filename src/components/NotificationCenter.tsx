import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { query, collection, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { updateLedgerRecord } from '../lib/repository';
import type { NotificationRecord } from '../types/guild';

export function NotificationCenter() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => doc.data() as NotificationRecord));
    });
    return unsubscribe;
  }, [profile]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAsRead(notification: NotificationRecord) {
    if (!profile) return;
    await updateLedgerRecord('notifications', notification.id, { read: true }, profile, 'Notification Read');
  }

  return (
    <div className="relative">
      <button className="ghost relative" type="button" onClick={() => setOpen(!open)}>
        <Bell size={18} /> 
        {unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-alt)] flex justify-between items-center">
            <h4 className="font-bold text-sm">Notifications</h4>
            <span className="text-xs bg-[var(--primary)] text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-0">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`p-4 border-b border-[var(--border)] last:border-b-0 cursor-pointer transition-colors ${n.read ? 'opacity-60' : 'bg-blue-500/5 hover:bg-blue-500/10'}`}
                onClick={() => {
                  if (!n.read) markAsRead(n);
                  setOpen(false);
                }}
              >
                <strong className="block text-sm mb-1">{n.title}</strong>
                <p className="text-xs text-[var(--muted)]">{n.body}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-6 text-center text-[var(--muted)] text-sm">You're all caught up!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
