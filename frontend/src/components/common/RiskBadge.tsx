import React from 'react';
import type { RiskLevel } from '@/types/api';
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel | null | undefined;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  showScore = true,
}) => {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Unscored
      </span>
    );
  }

  const configs: Record<
    RiskLevel,
    {
      label: string;
      icon: React.ReactNode;
      bg: string;
      text: string;
      border: string;
    }
  > = {
    low: {
      label: 'Low',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
    },
    medium: {
      label: 'Medium',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
    },
    high: {
      label: 'High',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-700" aria-hidden="true" />,
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-300',
    },
    critical: {
      label: 'Critical',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-red-700" aria-hidden="true" />,
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-300',
    },
  };

  const config = configs[level];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
      role="status"
      aria-label={`Risk level: ${config.label}${score !== undefined && score !== null ? `, Score: ${Math.round(score)}` : ''}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="font-mono font-semibold ml-0.5 opacity-90">({Math.round(score)})</span>
      )}
    </span>
  );
};
