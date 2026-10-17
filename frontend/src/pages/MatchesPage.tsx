import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePendingMatches, useConfirmMatch, useRejectMatch, useScanMatches } from '@/hooks/useMatch';
import { ErrorState } from '@/components/common/States';
import { TableSkeleton } from '@/components/common/Skeleton';
import {
  Check,
  X,
  ExternalLink,
  Calendar,
  RefreshCw,
  Building2,
  ShieldCheck,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { PendingMatchItem } from '@/types/api';

interface VendorMatchGroup {
  vendorId: number;
  vendorName: string;
  firmName?: string;
  similarityScore: number;
  items: PendingMatchItem[];
}

export const MatchesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 50; // Larger page size to cluster vendor groups cleanly
  const [statusFilter, setStatusFilter] = useState<'pending' | 'auto' | 'confirmed' | 'all'>('pending');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = usePendingMatches(page, pageSize, statusFilter);
  const confirmMatch = useConfirmMatch();
  const rejectMatch = useRejectMatch();
  const scanMatches = useScanMatches();

  const [processingVendors, setProcessingVendors] = useState<Record<string, boolean>>({});
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

  const toggleVendorExpanded = (vendorName: string) => {
    setExpandedVendors((prev) => ({
      ...prev,
      [vendorName]: !prev[vendorName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    vendorGroups.forEach((g) => {
      all[g.vendorName] = true;
    });
    setExpandedVendors(all);
  };

  const retractAll = () => {
    setExpandedVendors({});
  };

  // Group pending matches by Vendor Name
  const vendorGroups = useMemo<VendorMatchGroup[]>(() => {
    if (!data?.data) return [];
    const map = new Map<string, VendorMatchGroup>();

    for (const item of data.data) {
      const key = item.vendorName || `Vendor #${item.vendorId}`;
      if (!map.has(key)) {
        map.set(key, {
          vendorId: item.vendorId,
          vendorName: key,
          firmName: item.firmName || undefined,
          similarityScore: item.similarityScore,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }

    return Array.from(map.values());
  }, [data?.data]);

  const handleRunScan = async () => {
    setScanFeedback(null);
    try {
      const res = await scanMatches.mutateAsync();
      setScanFeedback(
        `Surveillance scan complete: Evaluated ${res.vendorsScanned} suppliers against ${res.signalsScanned} signals. Found ${res.matchesFound} total matches!`
      );
      refetch();
    } catch (err: any) {
      alert(`Scan failed: ${err?.message || 'Error occurred during scan'}`);
    }
  };

  const handleConfirmSingle = async (id: number) => {
    try {
      await confirmMatch.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(`Confirm failed: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleRejectSingle = async (id: number) => {
    try {
      await rejectMatch.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(`Reject failed: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleConfirmAllForVendor = async (group: VendorMatchGroup) => {
    setProcessingVendors((prev) => ({ ...prev, [group.vendorName]: true }));
    try {
      for (const item of group.items) {
        await confirmMatch.mutateAsync(item.id);
      }
      refetch();
    } catch (err: any) {
      alert(`Batch confirm failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setProcessingVendors((prev) => ({ ...prev, [group.vendorName]: false }));
    }
  };

  const handleRejectAllForVendor = async (group: VendorMatchGroup) => {
    setProcessingVendors((prev) => ({ ...prev, [group.vendorName]: true }));
    try {
      for (const item of group.items) {
        await rejectMatch.mutateAsync(item.id);
      }
      refetch();
    } catch (err: any) {
      alert(`Batch reject failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setProcessingVendors((prev) => ({ ...prev, [group.vendorName]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Signal Match Review Queue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Human verification queue: Incidents clubbed by supplier for faster review and business continuity decisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={scanMatches.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${scanMatches.isPending ? 'animate-spin' : ''}`} />
            <span>{scanMatches.isPending ? 'Scanning Watchlist...' : 'Scan Watchlist Matches'}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Scan Feedback Banner */}
      {scanFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{scanFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Human Governance Policy Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-4 sm:p-5 text-xs text-slate-800 flex items-start gap-3.5 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
        </div>
        <div className="leading-relaxed">
          <span className="font-bold text-blue-900">Human Decision Authority (FDA 21 CFR Part 11): </span>
          The surveillance engine computes trigram similarities and risk indices, but <strong>the AI will never automatically cancel, suspend, or disqualify a supplier</strong>.
          Authorized human compliance officers review these incidents, confirm true matches, and finalize whether your organization continues business with each vendor.
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Verification</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('auto'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'auto'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto-Confirmed by AI</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('confirmed'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'confirmed'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Human Confirmed</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('all'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Incident Matches</span>
        </button>
      </div>

      {/* Queue Content */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState
          title="Failed to load match review queue"
          message={error instanceof Error ? error.message : 'Unable to communicate with matching engine'}
          onRetry={() => refetch()}
        />
      ) : vendorGroups.length > 0 ? (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-200 gap-2">
            <span>
              Showing <strong className="text-slate-900 font-semibold">{vendorGroups.length} suppliers</strong> with <strong className="text-slate-900 font-semibold">{data?.data.length || 0} total pending incidents</strong> (Page {page})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all cursor-pointer"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={retractAll}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all cursor-pointer"
              >
                Retract all
              </button>
            </div>
          </div>

          {/* Grouped Vendor Cards */}
          <div className="space-y-4">
            {vendorGroups.map((group) => {
              const isGroupBusy = processingVendors[group.vendorName] || false;
              const isExpanded = expandedVendors[group.vendorName] ?? false;

              return (
                <section
                  key={group.vendorName}
                  className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300"
                  aria-label={`Match review for ${group.vendorName}`}
                >
                  {/* Supplier Clubbed Header - Clickable to Retract/Expand */}
                  <div
                    onClick={() => toggleVendorExpanded(group.vendorName)}
                    className="bg-slate-50/80 border-b border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-blue-700" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{group.vendorName}</span>
                        <span className="text-xs text-slate-500">&rarr; Matched FDA Firm:</span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800 shadow-xs">
                          {group.firmName || 'Unknown FDA Firm'}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-700 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                          {(group.similarityScore * 100).toFixed(1)}% match
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          {group.items.length} pending {group.items.length === 1 ? 'incident' : 'incidents'} for this supplier
                        </span>
                        <span>•</span>
                        <Link
                          to={`/vendors/${group.vendorId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                        >
                          View supplier profile &amp; finalize business decision <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Batch Actions & Retract/Expand Toggle for this Supplier */}
                    <div
                      className="flex items-center gap-2 flex-shrink-0 self-end md:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleVendorExpanded(group.vendorName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs transition-all cursor-pointer"
                        title={isExpanded ? 'Retract incident list' : 'Expand incident list'}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                            <span>Retract ({group.items.length})</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            <span>Expand ({group.items.length})</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmAllForVendor(group)}
                        disabled={isGroupBusy || confirmMatch.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        title={`Confirm all ${group.items.length} incidents as belonging to ${group.vendorName}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isGroupBusy ? 'Processing...' : `Confirm all (${group.items.length})`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectAllForVendor(group)}
                        disabled={isGroupBusy || rejectMatch.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        title={`Reject all ${group.items.length} incidents as unrelated`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isGroupBusy ? 'Processing...' : `Reject all`}</span>
                      </button>
                    </div>
                  </div>

                  {/* Retracted Notice Bar when collapsed */}
                  {!isExpanded && (
                    <div
                      onClick={() => toggleVendorExpanded(group.vendorName)}
                      className="p-3.5 bg-white text-xs text-slate-500 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold text-slate-800">Retracted:</span>
                        <span>{group.items.length} pending incidents hidden for this supplier. Click header or Expand button to inspect.</span>
                      </span>
                      <span className="text-blue-600 font-semibold flex items-center gap-1">
                        Expand supplier incidents &rarr;
                      </span>
                    </div>
                  )}

                  {/* List of Incidents under this Supplier (Conditionally rendered when expanded) */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {group.items.map((match, idx) => (
                        <div
                          key={match.id}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Incident Specifics */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {match.signalTitle || 'FDA Enforcement Notice'}
                              </span>
                              {match.severityRaw && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  match.severityRaw.includes('I') && !match.severityRaw.includes('II') && !match.severityRaw.includes('III')
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : match.severityRaw.includes('II')
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {match.severityRaw}
                                </span>
                              )}
                            </div>

                            {match.signalSummary && (
                              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                                {match.signalSummary}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                              {match.eventDate && (
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  Initiated: {new Date(match.eventDate).toLocaleDateString()}
                                </span>
                              )}

                              {match.url && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={match.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                                  >
                                    Raw FDA record ({(() => {
                                      try {
                                        return new URL(match.url).hostname;
                                      } catch {
                                        return 'api.fda.gov';
                                      }
                                    })()}) <ExternalLink className="w-3 h-3" />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Individual Incident Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                            <button
                              type="button"
                              onClick={() => handleConfirmSingle(match.id)}
                              disabled={confirmMatch.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm match</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectSingle(match.id)}
                              disabled={rejectMatch.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-600 border border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {(() => {
            const totalPages = Math.ceil((data?.total || 0) / pageSize);
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
                <div>
                  Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {statusFilter === 'pending'
                ? 'No Pending Ambiguous Matches'
                : statusFilter === 'auto'
                ? 'No Auto-Confirmed Matches'
                : 'No Incident Matches Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {statusFilter === 'pending'
                ? 'All exact supplier matches were either automatically confirmed by the AI engine or no unreviewed signals are pending.'
                : 'Scan your registered suppliers against all synchronized openFDA drug enforcement recalls.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunScan}
            disabled={scanMatches.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`w-4 h-4 ${scanMatches.isPending ? 'animate-spin' : ''}`} />
            <span>{scanMatches.isPending ? 'Scanning Watchlist...' : 'Run Signal Match Scan'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
