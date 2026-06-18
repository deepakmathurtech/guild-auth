import React from 'react';

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const norm = status.toLowerCase();
  
  let styles = {
    bg: 'bg-[var(--card-subtle)]',
    text: 'text-[var(--text-muted)]',
    border: 'border-[var(--border)]',
    dot: 'bg-[var(--text-muted)]'
  };
  
  if (['completed', 'verified', 'approved', 'partner', 'success'].includes(norm)) {
    styles = {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-500'
    };
  } else if (['active', 'open', 'inprogress', 'assigned', 'matching'].includes(norm)) {
    styles = {
      bg: 'bg-sky-500/10',
      text: 'text-sky-500',
      border: 'border-sky-500/20',
      dot: 'bg-sky-500'
    };
  } else if (['pending', 'draft', 'review'].includes(norm)) {
    styles = {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500'
    };
  } else if (['rejected', 'error', 'failed', 'cancelled'].includes(norm)) {
    styles = {
      bg: 'bg-rose-500/10',
      text: 'text-rose-500',
      border: 'border-rose-500/20',
      dot: 'bg-rose-500'
    };
  }

  const showDot = ['active', 'open', 'inprogress', 'assigned', 'matching', 'pending', 'review'].includes(norm);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles.bg} ${styles.text} ${styles.border} ${className}`}>
      {showDot && <span className={`w-1 h-1 rounded-full ${styles.dot} animate-pulse`} />}
      {status}
    </span>
  );
}

