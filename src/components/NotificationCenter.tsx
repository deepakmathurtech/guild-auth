import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, MessageSquare, Shield, Sparkles, X, Archive, Trash2, CheckCheck, Send, Clock, AlertCircle, Info, TrendingUp, TrendingDown, Star, Zap, Search, ChevronDown } from 'lucide-react';
import { query, collection, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { NotificationService } from '../services/notificationService';
import type { NotificationRecord, NotificationStatus, GuildUser, GuildRole } from '../types/guild';

// Notification type icons and colors mapping
const notificationConfig: Record<string, { icon: typeof MessageSquare; color: string; bgColor: string }> = {
  default: { icon: MessageSquare, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--primary)]/10' },
  quest: { icon: Sparkles, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  quest_complete: { icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  quest_approved: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  quest_rejected: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  verification: { icon: Shield, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  verification_pending: { icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  verification_approved: { icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  verification_rejected: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  revenue: { icon: TrendingUp, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  revenue_generated: { icon: TrendingUp, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  member: { icon: MessageSquare, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--primary)]/10' },
  member_join: { icon: Zap, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  member_leave: { icon: TrendingDown, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  achievement: { icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  system: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  error: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

// Notification types available for sending - matches NotificationType from types/guild.ts
const notificationTypes: { value: string; label: string; icon: typeof Info }[] = [
  { value: 'general_alert', label: 'General Alert', icon: Info },
  { value: 'quest_application', label: 'Quest Application', icon: Sparkles },
  { value: 'quest_accepted', label: 'Quest Accepted', icon: CheckCircle2 },
  { value: 'quest_overdue', label: 'Quest Overdue', icon: AlertCircle },
  { value: 'submission_pending', label: 'Submission Pending', icon: Clock },
  { value: 'submission_verified', label: 'Submission Verified', icon: CheckCircle2 },
  { value: 'submission_rejected', label: 'Submission Rejected', icon: AlertCircle },
  { value: 'verification_pending', label: 'Verification Pending', icon: Shield },
  { value: 'revenue_recorded', label: 'Revenue Recorded', icon: TrendingUp },
  { value: 'application_submitted', label: 'Application Submitted', icon: Send },
  { value: 'application_approved', label: 'Application Approved', icon: CheckCircle2 },
  { value: 'application_rejected', label: 'Application Rejected', icon: AlertCircle },
  { value: 'rank_promotion', label: 'Rank Promotion', icon: Star },
  { value: 'role_assignment', label: 'Role Assignment', icon: Shield },
  { value: 'city_health_warning', label: 'Health Warning', icon: AlertCircle },
  { value: 'escalation_received', label: 'Escalation', icon: TrendingUp },
];

// Role hierarchy for permission checks (higher = more authority)
const roleHierarchy: Record<GuildRole, number> = {
  applicant: 0,
  member: 1,
  contributor: 2,
  receptionistCandidate: 3,
  receptionist: 4,
  cityGuildMaster: 5,
  stateGuildMaster: 6,
  centralGuildMaster: 7,
  nationalGuildMaster: 8,
  guildFounder: 9,
  founder: 10,
  organizationRepresentative: 11,
};

// Role-based permission mapping: which roles can send to which target roles
const canSendToRole: Record<GuildRole, GuildRole[]> = {
  applicant: [], // Cannot send notifications
  member: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder', 'organizationRepresentative'],
  contributor: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder', 'organizationRepresentative'],
  receptionistCandidate: ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder', 'organizationRepresentative'],
  receptionist: ['member', 'contributor'],
  cityGuildMaster: ['member', 'contributor', 'receptionistCandidate', 'receptionist'],
  stateGuildMaster: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster'],
  centralGuildMaster: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster'],
  nationalGuildMaster: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'],
  guildFounder: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'],
  founder: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster'],
  organizationRepresentative: ['member', 'contributor', 'receptionistCandidate', 'receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'],
};

// Check if sender role can send to target role
function canSendTo(senderRole: GuildRole, targetRole: GuildRole): boolean {
  const allowedTargets = canSendToRole[senderRole] || [];
  return allowedTargets.includes(targetRole);
}

// Get role display label
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    applicant: 'Applicant',
    member: 'Member',
    contributor: 'Contributor',
    receptionistCandidate: 'Receptionist Candidate',
    receptionist: 'Receptionist',
    cityGuildMaster: 'City Guild Master',
    stateGuildMaster: 'State Guild Master',
    centralGuildMaster: 'Central Guild Master',
    nationalGuildMaster: 'National Guild Master',
    guildFounder: 'Guild Founder',
    founder: 'Founder',
    organizationRepresentative: 'Organization Rep',
  };
  return labels[role] || role;
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [allNotifications, setAllNotifications] = useState<NotificationRecord[]>([]);

  // Compute if current user can send notifications
  const canSendNotification = profile && (canSendToRole[profile.role as GuildRole]?.length ?? 0) > 0;
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!profile) return;

    async function fetchNotifications() {
      if (!profile) return;

      try {
        // NOTE: Firestore requires composite indexes for where + orderBy queries
        // Fetch simple data and filter/sort in memory instead
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', profile.uid),
          limit(100)
        );
        const snap = await getDocs(q);
        const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationRecord));

        // Filter out archived and sort by createdAt desc in memory
        const filtered = notifs
          .filter(n => n.status !== 'archived')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setAllNotifications(filtered);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    fetchNotifications();
  }, [profile]);

  const notifications = useMemo(() => {
    return allNotifications.filter(n => n.status === 'unread' || n.status === 'read').slice(0, 20);
  }, [allNotifications]);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  async function markAllAsRead() {
    if (!profile) return;
    await NotificationService.bulkAction(profile.uid, 'read');
  }

  // Send Notification Modal Component - Uses existing NotificationService backend
  function SendNotificationModal() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState('general_alert');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [recipientMode, setRecipientMode] = useState<'self' | 'role'>('self');
    const [selectedRole, setSelectedRole] = useState('member');
    const [recipients, setRecipients] = useState<GuildUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch available recipients based on role selection and sender permissions
    useEffect(() => {
      async function fetchRecipients() {
        if (recipientMode === 'self' || !profile) return;

        const senderRole = profile.role as GuildRole;
        const allowedTargets = canSendToRole[senderRole] || [];

        // If sender can't send to anyone, don't fetch
        if (allowedTargets.length === 0) {
          setRecipients([]);
          return;
        }

        setLoadingRecipients(true);
        try {
          // Fetch all users - let Firestore return what it can, then filter in memory
          const q = query(collection(db, 'users'), limit(200));
          const snap = await getDocs(q);
          const users = snap.docs.map(d => {
            const data = d.data();
            return {
              uid: d.id,
              ...data,
            } as unknown as GuildUser;
          });

          // Filter in memory: active users only
          let filteredUsers = users.filter(u => u.archiveStatus === 'active');

          // Filter by role if specific role selected, also check permission
          if (selectedRole !== 'all') {
            filteredUsers = filteredUsers.filter(u => {
              const roleMatch = u.role === selectedRole;
              const hasPermission = canSendTo(senderRole, u.role as GuildRole);
              return roleMatch && hasPermission;
            });
          } else {
            // Filter to only roles the sender can send to
            filteredUsers = filteredUsers.filter(u => canSendTo(senderRole, u.role as GuildRole));
          }

          // Exclude self and sort by name
          filteredUsers = filteredUsers
            .filter(u => u.uid !== profile.uid)
            .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
            .slice(0, 50);

          setRecipients(filteredUsers);
        } catch (err) {
          console.error('Failed to fetch recipients:', err);
        } finally {
          setLoadingRecipients(false);
        }
      }

      fetchRecipients();
    }, [recipientMode, selectedRole, profile]);

    // Compute role options based on sender's permissions
    const roleOptions = (() => {
      if (!profile) return [];
      const senderRole = profile.role as GuildRole;
      const allowedTargets = canSendToRole[senderRole] || [];

      const options = [{ value: 'all', label: 'All Allowed Roles' }];
      for (const role of allowedTargets) {
        options.push({ value: role, label: getRoleLabel(role) });
      }
      return options;
    })();

    // Check if sender has permission to send
    const canSend = profile && (canSendToRole[profile.role as GuildRole]?.length ?? 0) > 0;

    async function handleSend() {
      if (!title.trim() || !body.trim() || !profile) return;

      // Permission check: verify sender can send
      const senderRole = profile.role as GuildRole;
      if (!canSendTo(senderRole, senderRole) && (canSendToRole[senderRole] || []).length === 0) {
        setError('You do not have permission to send notifications.');
        return;
      }

      setSending(true);
      setError(null);
      try {
        // Determine target user IDs based on recipient mode
        let targetUserIds: string[] = [];

        if (recipientMode === 'self') {
          targetUserIds = [profile.uid];
        } else if (selectedUserId) {
          // Find the selected recipient and verify permission
          const selectedRecipient = recipients.find(r => r.uid === selectedUserId);
          if (selectedRecipient && canSendTo(senderRole, selectedRecipient.role as GuildRole)) {
            targetUserIds = [selectedUserId];
          } else {
            setError('You do not have permission to send to this user.');
            return;
          }
        } else {
          // Send to all matching recipients
          targetUserIds = recipients.map(r => r.uid).filter(uid => uid);
        }

        // Send notifications to all selected recipients using the existing backend
        const results = await Promise.all(
          targetUserIds.map(userId =>
            NotificationService.notify(
              userId,
              type as any,
              title.trim(),
              body.trim(),
              priority,
              profile,
              {
                actionUrl: undefined,
                metadata: { sentBy: profile.uid, sentAt: new Date().toISOString() },
                deduplicate: false,
                aggregate: false,
              }
            )
          )
        );

        const successCount = results.filter(Boolean).length;

        if (successCount > 0) {
          // Close modal and reset form on success
          setShowSendModal(false);
          setTitle('');
          setBody('');
          setType('general_alert');
          setPriority('medium');
          setRecipientMode('self');
          setSelectedUserId(null);
        } else {
          setError('Failed to send notifications. Please try again.');
        }
      } catch (err) {
        console.error('Failed to send notification:', err);
        setError('Failed to send notification. Please try again.');
      } finally {
        setSending(false);
      }
    }

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSendModal(false)} />

        {/* Modal */}
        <div className="relative w-full max-w-md mx-4 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header gradient */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-[var(--primary)]/20 via-[var(--primary)]/10 to-transparent pointer-events-none" />

          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">Send Operational Brief</h3>
                <p className="text-xs text-[var(--text-muted)]">Create a new notification</p>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-2 rounded-xl hover:bg-[var(--card-subtle)] transition-colors">
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief headline..."
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Detailed message..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  >
                    {notificationTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Recipient Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Send To</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('self')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      recipientMode === 'self'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    Myself
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecipientMode('role'); setSelectedUserId(null); }}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      recipientMode === 'role'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    Others
                  </button>
                </div>

                {recipientMode === 'role' && (
                  <>
                    <select
                      value={selectedRole}
                      onChange={(e) => { setSelectedRole(e.target.value); setSelectedUserId(null); }}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-all mb-2"
                  >
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                    {loadingRecipients ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                      </div>
                    ) : recipients.length > 0 ? (
                      <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-1">
                        {recipients.map(user => (
                          <button
                            key={user.uid}
                            type="button"
                            onClick={() => setSelectedUserId(user.uid)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                              selectedUserId === user.uid
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:bg-[var(--card-subtle)] border border-[var(--border)]'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              selectedUserId === user.uid ? 'bg-white/20 text-white' : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                            }`}>
                              {user.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 truncate">
                              <span className="font-medium">{user.fullName}</span>
                              <span className="text-[9px] text-[var(--text-muted)] ml-1 capitalize">
                                {user.role?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                        No users found for this role
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSendModal(false)} className="flex-1 py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border border-[var(--border)] rounded-xl hover:bg-[var(--card-subtle)]/50">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="flex-1.5 py-3 px-4 text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/80 text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send className="w-3 h-3" /> Send</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
            {/* Premium header with gradient */}
            <div className="relative px-5 py-4 border-b border-[var(--border)] bg-[var(--card-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/60 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Operational Briefs</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Live Federation Pulse</p>
                  </div>
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
            </div>
            <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--card-subtle)] via-[var(--card)] to-[var(--card-subtle)] flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Notification type filter pills */}
                <div className="flex items-center gap-1 p-1 bg-[var(--bg)]/50 rounded-xl">
                  <button className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-[var(--primary)] text-white">
                    All
                  </button>
                  <button className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)] rounded-lg transition-colors">
                    Unread
                  </button>
                </div>
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
                // Use config mapping for icons and colors
                const config = Object.entries(notificationConfig).find(([key]) => n.type.includes(key));
                const { icon: Icon = MessageSquare, color = 'text-[var(--primary)]', bgColor = 'bg-[var(--primary)]/10' } = config ? config[1] : notificationConfig.default;
                const isHighPriority = n.priority === 'high' || n.priority === 'critical';

                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border border-transparent hover:bg-[var(--card-subtle)]/50 cursor-pointer transition-all duration-200 flex gap-4 group mb-2
                      ${n.status === 'unread' ? 'bg-[var(--primary)]/5 !border-[var(--primary)]/15 shadow-sm' : 'hover:border-[var(--border)]/50 hover:translate-x-0.5'}
                      ${isHighPriority ? 'ring-1 ring-red-500/20' : ''}`}
                    onClick={() => {
                      if (n.status === 'unread') NotificationService.markAsRead(n.id, profile!);
                      setIsAnimating(true);
                      setTimeout(() => setIsAnimating(false), 200);
                      if (n.actionUrl) navigate(n.actionUrl);
                    }}
                  >
                    {/* Icon container with premium styling */}
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${bgColor} ${color} shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <strong className="block text-sm font-semibold text-[var(--text)] truncate pr-3">
                          {n.title}
                        </strong>
                        {n.aggregatedCount && n.aggregatedCount > 1 && (
                          <span className="shrink-0 text-[10px] font-bold bg-[var(--primary)] text-white px-1.5 py-0.5 rounded-md">
                            x{n.aggregatedCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2">{n.body}</p>

                      {/* Priority badge and timestamp */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isHighPriority && (
                            <span className="text-[9px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                              <Zap className="w-3 h-3" /> PRIORITY
                            </span>
                          )}
                          <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {/* Action buttons - visible on hover */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                           <button onClick={(e) => { e.stopPropagation(); NotificationService.archive(n.id, profile!); }} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--card-subtle)] transition-colors">
                             <Archive size={10}/> ARCHIVE
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); NotificationService.dismiss(n.id, profile!); }} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                             <Trash2 size={10}/> DISMISS
                           </button>
                        </div>
                      </div>
                    </div>
                    {/* Unread indicator */}
                    {n.status === 'unread' && (
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-2 shrink-0 animate-pulse" />
                    )}
                  </div>
                );
              })}
              
              {notifications.length === 0 && !loading && (
                <div className="p-12 text-center relative overflow-hidden">
                  {/* Gradient background effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--card-subtle)]/30 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 flex items-center justify-center mx-auto mb-5 border border-[var(--primary)]/20 shadow-lg">
                      <CheckCircle2 className="w-8 h-8 text-[var(--primary)]" />
                    </div>
                    <p className="text-base font-bold text-[var(--text)] mb-1">All Caught Up</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-[200px] mx-auto">No new operational briefs. You're in good standing.</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="p-12 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Premium action footer */}
            <div className="p-4 bg-gradient-to-r from-[var(--card-subtle)] via-[var(--card)] to-[var(--card-subtle)] border-t border-[var(--border)] flex gap-3">
               <button onClick={() => setOpen(false)} className="flex-1 py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-all border border-[var(--border)] rounded-xl hover:bg-[var(--card-subtle)]/50">
                 Close
               </button>
               {canSendNotification ? (
                 <button onClick={() => setShowSendModal(true)} className="flex-1.5 py-3 px-4 text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/80 text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 flex items-center justify-center gap-2">
                   <Send className="w-3 h-3" /> Send Brief
                 </button>
               ) : (
                 <button disabled className="flex-1.5 py-3 px-4 text-xs font-bold uppercase tracking-widest bg-[var(--border)] text-[var(--text-muted)] rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                   <Shield className="w-3 h-3" /> No Access
                 </button>
               )}
            </div>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}

      {/* Send Notification Modal */}
      {showSendModal && <SendNotificationModal />}
    </div>
  );
}

