import React from 'react';
import type { PendingMatchItem } from '@/types/api';
import { MatchStatusBadge } from '../common/Badges';
import { Clock, Check, X } from 'lucide-react';

interface MatchCardProps {
  match: PendingMatchItem;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onConfirm, onReject }) => {
  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:shadow-sm transition-shadow">
      <header className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900">{match.vendorName}</h3>
        <MatchStatusBadge status={match.status} />
      </header>

      <div className="space-y-2 text-sm text-slate-700">
        {match.signalTitle && (
          <p className="font-medium">{match.signalTitle}</p>
        )}
        {match.signalSummary && (
          <p className="text-xs text-slate-500">{match.signalSummary}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{new Date(match.eventDate ?? '').toLocaleDateString()}</span>
          <span className="mx-1">·</span>
          <span>Score: {match.similarityScore.toFixed(2)}</span>
        </div>
      </div>

      <MatchActions matchId={match.id} onConfirm={onConfirm} onReject={onReject} />
    </article>
  );
};

interface MatchActionsProps {
  matchId: number;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
}

export const MatchActions: React.FC<MatchActionsProps> = ({ matchId, onConfirm, onReject }) => {
  return (
    <div className="mt-4 flex gap-3">
      <button
        type="button"
        onClick={() => onConfirm(matchId)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
      >
        <Check className="w-4 h-4" />
        Confirm
      </button>
      <button
        type="button"
        onClick={() => onReject(matchId)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
      >
        <X className="w-4 h-4" />
        Reject
      </button>
    </div>
  );
};