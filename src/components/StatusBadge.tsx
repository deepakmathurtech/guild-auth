import React from 'react';

interface Props {
  status: string;
  className?: string;
}

// Extended status mappings for comprehensive coverage
const STATUS_MAP: Record<string, { bg: string; text: string; border: string; dot: string; group: string }> = {
  // Success / Positive
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  verified: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  partner: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  success: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  archived: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  closed: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },
  paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500', group: 'success' },

  // Active / In Progress
  active: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', dot: 'bg-sky-500', group: 'active' },
  open: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', dot: 'bg-sky-500', group: 'active' },
  inprogress: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', dot: 'bg-sky-500', group: 'active' },
  assigned: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', dot: 'bg-sky-500', group: 'active' },
  matching: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', dot: 'bg-sky-500', group: 'active' },
  live: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', dot: 'bg-sky-500', group: 'active' },

  // Pending / Warning
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500', group: 'warning' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500', group: 'warning' },
  review: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500', group: 'warning' },
  underReview: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500', group: 'warning' },
  submitted: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500', group: 'warning' },
  requested: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500', group: 'warning' },

  // Error / Negative
  rejected: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500', group: 'error' },
  error: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500', group: 'error' },
  failed: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500', group: 'error' },
  cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500', group: 'error' },
  blocked: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500', group: 'error' },
  inactive: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500', group: 'error' },

  // Info / Neutral
  member: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', dot: 'bg-blue-500', group: 'info' },
  system: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', dot: 'bg-blue-500', group: 'info' },
};

const DEFAULT_STYLES = {
  bg: 'bg-[var(--card-subtle)]',
  text: 'text-[var(--text-muted)]',
  border: 'border-[var(--border)]',
  dot: 'bg-[var(--text-muted)]'
};

const DOT_STATUSES = new Set(['active', 'open', 'inprogress', 'assigned', 'matching', 'pending', 'draft', 'review', 'underReview', 'submitted']);

export function StatusBadge({ status, className = '' }: Props) {
  const norm = status.toLowerCase();
  const mapped = STATUS_MAP[norm];

  // Use mapping or default styles
  const styles = mapped ? {
    bg: mapped.bg,
    text: mapped.text,
    border: mapped.border,
    dot: mapped.dot
  } : DEFAULT_STYLES;

  const showDot = DOT_STATUSES.has(norm);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles.bg} ${styles.text} ${styles.border} ${className}`}>
      {showDot && <span className={`w-1 h-1 rounded-full ${styles.dot} animate-pulse`} />}
      {status}
    </span>
  );
}

