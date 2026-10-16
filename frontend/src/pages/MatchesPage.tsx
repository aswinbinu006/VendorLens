import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePendingMatches, useConfirmMatch, useRejectMatch } from '@/hooks/useMatch';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
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

  const { data, isLoading, error, refetch, isFetching } = usePendingMatches(page, pageSize);
  const confirmMatch = useConfirmMatch();
  const rejectMatch = useRejectMatch();

  const [processingVendors, setProcessingVendors] = useState<Record<string, boolean>>({});

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
          <h1 className="text-xl font-semibold text-[#161616] tracking-tight">Signal Match Review Queue</h1>
          <p className="text-xs text-[#525252] mt-0.5">
            Human review queue: Incidents clubbed by supplier for faster verification and business continuity decisions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E0E0E0] bg-[#FFFFFF] text-xs font-semibold text-[#161616] hover:bg-[#E8E8E8] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh queue
        </button>
      </div>

      {/* Human Governance Policy Notice */}
      <div className="bg-[#EDF5FF] border border-[#0F62FE] p-4 text-xs text-[#161616] flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-[#0F62FE] flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#0F62FE]">Human Decision Authority (FDA 21 CFR Part 11): </span>
          The surveillance engine computes trigram similarities and risk indices, but <strong>the AI will never automatically cancel, suspend, or disqualify a supplier</strong>.
          Authorized human compliance officers review these incidents, confirm true matches, and finalize whether your organization continues business with each vendor.
        </div>
      </div>

      {/* Queue Content */}
      {isLoading ? (
        <LoadingState message="Loading and grouping candidate matches..." count={3} />
      ) : error ? (
        <ErrorState
          title="Failed to load match review queue"
          message={error instanceof Error ? error.message : 'Unable to communicate with matching engine'}
          onRetry={() => refetch()}
        />
      ) : vendorGroups.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-[#525252] pb-1 border-b border-[#E0E0E0]">
            <span>
              Showing <strong>{vendorGroups.length} suppliers</strong> with <strong>{data?.data.length || 0} total pending incidents</strong> (Page {page})
            </span>
            <span className="font-mono text-[11px]">Threshold: 0.60 &le; similarity &lt; 0.85</span>
          </div>

          {/* Grouped Vendor Cards */}
          <div className="space-y-6">
            {vendorGroups.map((group) => {
              const isGroupBusy = processingVendors[group.vendorName] || false;

              return (
                <section
                  key={group.vendorName}
                  className="bg-[#FFFFFF] border border-[#E0E0E0] overflow-hidden"
                  aria-label={`Match review for ${group.vendorName}`}
                >
                  {/* Supplier Clubbed Header */}
                  <div className="bg-[#F4F4F4] border-b border-[#E0E0E0] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#161616]" />
                        <span className="font-semibold text-sm text-[#161616]">{group.vendorName}</span>
                        <span className="text-xs text-[#525252]">&rarr; Matched FDA Firm:</span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-[#FFFFFF] border border-[#E0E0E0] text-[#161616]">
                          {group.firmName || 'Unknown FDA Firm'}
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#0F62FE] px-1.5 py-0.5 bg-[#EDF5FF] border border-[#0F62FE]">
                          {(group.similarityScore * 100).toFixed(1)}% match
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#525252] pt-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#161616]">
                          <Layers className="w-3.5 h-3.5" />
                          {group.items.length} pending {group.items.length === 1 ? 'incident' : 'incidents'} for this supplier
                        </span>
                        <span>•</span>
                        <Link
                          to={`/vendors/${group.vendorId}`}
                          className="inline-flex items-center gap-1 text-[#0F62FE] hover:underline font-semibold"
                        >
                          View supplier profile &amp; finalize business decision <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Batch Actions for this Supplier */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleConfirmAllForVendor(group)}
                        disabled={isGroupBusy || confirmMatch.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0E6027] hover:bg-[#094019] text-[#FFFFFF] border border-[#0E6027] disabled:opacity-50 cursor-pointer"
                        title={`Confirm all ${group.items.length} incidents as belonging to ${group.vendorName}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isGroupBusy ? 'Processing...' : `Confirm all (${group.items.length})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectAllForVendor(group)}
                        disabled={isGroupBusy || rejectMatch.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#A2191F] border border-[#A2191F] disabled:opacity-50 cursor-pointer"
                        title={`Reject all ${group.items.length} incidents as unrelated`}
                      >
                        <X className="w-3.5 h-3.5" />
                        {isGroupBusy ? 'Processing...' : `Reject all`}
                      </button>
                    </div>
                  </div>

                  {/* List of Incidents under this Supplier */}
                  <div className="divide-y divide-[#E0E0E0]">
                    {group.items.map((match, idx) => (
                      <div
                        key={match.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F4F4F4]"
                      >
                        {/* Incident Specifics */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono px-1.5 py-0.5 bg-[#F4F4F4] border border-[#E0E0E0] text-[#525252]">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-[#161616]">
                              {match.signalTitle || 'FDA Enforcement Notice'}
                            </span>
                            {match.severityRaw && (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 border ${
                                match.severityRaw.includes('I') && !match.severityRaw.includes('II') && !match.severityRaw.includes('III')
                                  ? 'bg-[#FFD7D9] text-[#A2191F] border-[#A2191F]'
                                  : match.severityRaw.includes('II')
                                  ? 'bg-[#FFD9BE] text-[#8A3800] border-[#8A3800]'
                                  : 'bg-[#FCF4D6] text-[#684E00] border-[#684E00]'
                              }`}>
                                {match.severityRaw}
                              </span>
                            )}
                          </div>

                          {match.signalSummary && (
                            <p className="text-xs text-[#525252] leading-relaxed">
                              {match.signalSummary}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#525252] pt-0.5">
                            {match.eventDate && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-[#525252]" />
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
                                  className="inline-flex items-center gap-1 text-[#0F62FE] hover:underline font-semibold"
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

                        {/* Individual Incident Confirm / Reject Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => handleConfirmSingle(match.id)}
                            disabled={confirmMatch.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#DEFBE6] hover:bg-[#c2f2ce] text-[#0E6027] border border-[#0E6027] disabled:opacity-50 cursor-pointer"
                            title="Confirm this single incident"
                          >
                            <Check className="w-3 h-3" />
                            Confirm match
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectSingle(match.id)}
                            disabled={rejectMatch.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#525252] border border-[#E0E0E0] disabled:opacity-50 cursor-pointer"
                            title="Reject this single incident"
                          >
                            <X className="w-3 h-3 text-[#A2191F]" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {data && data.total > pageSize && (
            <div className="flex justify-between items-center pt-2 border-t border-[#E0E0E0]">
              <span className="text-xs text-[#525252]">
                Showing {data.data.length} of {data.total} pending candidates
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs border border-[#E0E0E0] bg-[#FFFFFF] hover:bg-[#E8E8E8] disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs border border-[#E0E0E0] bg-[#FFFFFF] hover:bg-[#E8E8E8] disabled:opacity-50 cursor-pointer"
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
