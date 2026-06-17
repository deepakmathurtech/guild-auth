import React from 'react';

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const norm = status.toLowerCase();
  
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'; // Default gray
  
  if (['completed', 'verified', 'approved', 'partner'].includes(norm)) {
    colorClass = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800';
  } else if (['active', 'open', 'inprogress', 'assigned'].includes(norm)) {
    colorClass = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800';
  } else if (['pending', 'draft', 'matching'].includes(norm)) {
    colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800';
  } else if (['rejected', 'error'].includes(norm)) {
    colorClass = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass} ${className}`}>
      {status}
    </span>
  );
}
