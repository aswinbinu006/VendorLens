import React from 'react';
import type { MatchStatus } from '@/types/api';
import { Check, X, Clock } from 'lucide-react';

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status }) => {
  const config = {
    auto: { label: 'Auto', icon: <Check className='w-3 h-3' />, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    pending: { label: 'Pending', icon: <Clock className='w-3 h-3 text-amber-600 animate-pulse' />, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
    confirmed: { label: 'Confirmed', icon: <Check className='w-3 h-3' />, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    rejected: { label: 'Rejected', icon: <X className='w-3 h-3' />, bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      {config.label}
    </span>
  );
};
