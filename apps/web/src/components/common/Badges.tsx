import React from 'react';
import type { MatchStatus, AlertStatus } from '@/types/api';

// Re‑export existing components for convenient imports
export { RiskBadge } from './RiskBadge';
export { TrustBadge } from './TrustBadge';

export const CriticalityBadge: React.FC<{ value: 1 | 2 | 3 | 4 | 5 }> = ({ value }) => {
  const labels: Record<number, string> = {
    1: 'Minor',
    2: 'Low',
    3: 'Moderate',
    4: 'High',
    5: 'Critical',
  };
  const colors = {
    1: 'bg-blue-50 text-blue-800 border-blue-200',
    2: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    3: 'bg-amber-50 text-amber-800 border-amber-300',
    4: 'bg-orange-50 text-orange-800 border-orange-300',
    5: 'bg-red-50 text-red-800 border-red-300',
  }[value];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${colors} px-2 py-0.5 text-xs`}
      aria-label={`Criticality level ${value}`}
    >
      <span className="font-semibold">{labels[value]}</span>
    </span>
  );
};

export const MatchStatusBadge: React.FC<{ status: MatchStatus }> = ({ status }) => {
  const config = {
    auto: { label: 'Auto', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
    confirmed: { label: 'Confirmed', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    rejected: { label: 'Rejected', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

export const AlertStatusBadge: React.FC<{ status: AlertStatus }> = ({ status }) => {
  const config = {
    new: { label: 'New', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
    reviewed: { label: 'Reviewed', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    dismissed: { label: 'Dismissed', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};
