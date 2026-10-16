import React from 'react';
import type { TrustLevel } from '@/types/api';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface TrustBadgeProps {
  trust: TrustLevel;
  size?: 'sm' | 'md';
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ trust, size = 'md' }) => {
  const isOfficial = trust === 'official';

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-0.5 tracking-wide',
  }[size];

  if (isOfficial) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold uppercase rounded bg-blue-900 text-white shadow-xs border border-blue-800 ${sizeClasses}`}
        title="Verified Official Record from Regulatory Authority (e.g., FDA)"
      >
        <CheckCircle2 className="w-3 h-3 text-blue-200" aria-hidden="true" />
        OFFICIAL
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold uppercase rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 ${sizeClasses}`}
      title="Unverified Public Chatter / Media Signal (Requires Review, capped influence)"
    >
      <AlertTriangle className="w-3 h-3 text-amber-600" aria-hidden="true" />
      UNVERIFIED
    </span>
  );
};
