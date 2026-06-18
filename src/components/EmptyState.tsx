import type { ReactNode } from 'react';
import { Box } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--card-subtle)]/30 p-16 text-center animate-in fade-in duration-700">
      <div className="w-16 h-16 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] shadow-sm">
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

