import type { ReactNode } from 'react';
import { Box } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const VARIANT_ICONS = {
  default: 'text-[var(--text-muted)]',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-rose-500'
};

const VARIANT_BG = {
  default: 'bg-[var(--card-subtle)]/30',
  success: 'bg-emerald-500/5',
  warning: 'bg-amber-500/5',
  error: 'bg-rose-500/5'
};

const VARIANT_BORDER = {
  default: 'border-[var(--border)]',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  error: 'border-rose-500/20'
};

export function EmptyState({ title, description, action, icon, variant = 'default' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 rounded-[var(--radius-xl)] border-2 border-dashed ${VARIANT_BORDER[variant]} ${VARIANT_BG[variant]} p-16 text-center animate-in fade-in duration-700`}>
      <div className={`w-16 h-16 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center ${VARIANT_ICONS[variant]} shadow-sm transition-all`}>
        {icon || <Box className="w-8 h-8 opacity-40" />}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">{title}</h3>
        <p className="max-w-sm text-sm text-[var(--text-muted)] leading-relaxed">{description}</p>
      </div>
      {action && (
        <div className="pt-2">
          {action}
        </div>
      )}
    </div>
  );
}

