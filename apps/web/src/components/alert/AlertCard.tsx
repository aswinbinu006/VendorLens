import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { AlertItem } from '@/types/api';

interface AlertCardProps {
  alert: AlertItem;
  onReview?: (id: number) => void;
  onDismiss?: (id: number) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onReview, onDismiss }) => {
  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:shadow-sm transition-shadow">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900">{alert.message}</h3>
        {alert.status && (
          <div className="flex items-center gap-2">
            {/* Status Badge (imported from common badges) */}
            {/* Assuming a <AlertStatusBadge status={alert.status} /> component exists */}
            {/* Placeholder if not: */}
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              {alert.status}
            </span>
          </div>
        )}
      </header>

      <div className="space-y-2 text-sm text-slate-700">
        {alert.kind && (
          <p className="font-medium">Kind: {alert.kind}</p>
        )}
        {alert.note && (
          <p className="text-xs text-slate-500">{alert.note}</p>
        )}
        {alert.sourceUrl && (
          <p className="text-xs text-blue-600 underline">
            <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer">
              View source ({(() => {
                try {
                  return new URL(alert.sourceUrl).hostname;
                } catch {
                  return 'source';
                }
              })()})
            </a>
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>{new Date(alert.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        {onReview && (
          <button
            type="button"
            onClick={() => onReview(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4" /> Review
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
          >
            <XCircle className="w-4 h-4" /> Dismiss
          </button>
        )}
      </div>
    </article>
  );
};