import React, { useState } from 'react';
import { usePendingMatches, useConfirmMatch, useRejectMatch } from '@/hooks/useMatch';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { MatchStatusBadge } from '@/components/common/Badges';
import {
  Check,
  X,
  ExternalLink,
  Info,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import type { PendingMatchItem } from '@/types/api';

export const MatchesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, error, refetch, isFetching } = usePendingMatches(page, pageSize);
  const confirmMatch = useConfirmMatch();
  const rejectMatch = useRejectMatch();

  const handleConfirm = async (id: number) => {
    try {
      await confirmMatch.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(`Confirm failed: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMatch.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(`Reject failed: ${err?.message || 'Error occurred'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Signal Match Review Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Human review queue for trigram similarity candidates (0.60 &le; score &lt; 0.85)
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Review Guidelines Notice (E17 Compliance) */}
      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Review Guidelines: </span>
          Scores above 0.85 are auto-matched by the surveillance engine. Candidates below 0.85 are queued here for human verification.
          Confirming an FDA signal links it to the supplier and immediately triggers rescoring; rejecting safely discounts it.
        </div>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <LoadingState message="Loading pending candidate matches..." count={4} />
      ) : error ? (
        <ErrorState
          title="Failed to load match review queue"
          message={error instanceof Error ? error.message : 'Unable to communicate with matching engine'}
          onRetry={() => refetch()}
        />
      ) : data?.data && data.data.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {data.data.map((match: PendingMatchItem) => (
              <article
                key={match.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{match.vendorName}</span>
                    <span className="text-xs text-slate-400">&larr; Trigram Match &rarr;</span>
                    <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {match.firmName || 'Unknown FDA Firm'}
                    </span>
                    <MatchStatusBadge status={match.status} />
                  </div>

                  <p className="text-xs font-semibold text-slate-800">
                    {match.signalTitle || 'FDA Enforcement Notice'}
                  </p>

                  {match.signalSummary && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {match.signalSummary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
                      Similarity: {(match.similarityScore * 100).toFixed(1)}%
                    </span>
                    <span>•</span>
                    <span>
                      Classification:{' '}
                      <strong className="text-slate-700">{match.severityRaw || 'Unclassified'}</strong>
                    </span>
                    {match.eventDate && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(match.eventDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                    {match.url && (
                      <>
                        <span>•</span>
                        <a
                          href={match.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Raw FDA Record ({(() => {
                            try {
                              return new URL(match.url).hostname;
                            } catch {
                              return 'fda.gov';
                            }
                          })()}) <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleConfirm(match.id)}
                    disabled={confirmMatch.isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirm Match
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(match.id)}
                    disabled={rejectMatch.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {data.total > pageSize && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Showing {data.data.length} of {data.total} pending candidates
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs rounded border border-slate-300 bg-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs rounded border border-slate-300 bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="Review Queue Clear"
          description="There are currently zero pending signal matches requiring human verification."
        />
      )}
    </div>
  );
};

export default MatchesPage;
