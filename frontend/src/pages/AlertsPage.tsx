import React, { useState } from 'react';
import { useAlerts, useUpdateAlert } from '@/hooks/useAlert';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { RiskBadge } from '@/components/common/RiskBadge';
import { AlertStatusBadge } from '@/components/common/Badges';
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  FileText,
} from 'lucide-react';
import type { AlertStatus, RiskLevel, AlertItem } from '@/types/api';

export const AlertsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | RiskLevel>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  const activeStatus = statusFilter === 'all' ? undefined : statusFilter;
  const activeLevel = levelFilter === 'all' ? undefined : levelFilter;

  const { data, isLoading, error, refetch, isFetching } = useAlerts(
    activeStatus,
    activeLevel,
    page,
    pageSize
  );

  const updateAlertMutation = useUpdateAlert();

  const handleStatusUpdate = async (alertId: number, newStatus: AlertStatus) => {
    try {
      await updateAlertMutation.mutateAsync({ id: alertId, status: newStatus });
      refetch();
    } catch (err: any) {
      alert(`Update failed: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleSaveNote = async (alertId: number, currentStatus: AlertStatus) => {
    try {
      await updateAlertMutation.mutateAsync({
        id: alertId,
        status: currentStatus,
        note: noteText.trim() || undefined,
      });
      setEditingNoteId(null);
      setNoteText('');
      refetch();
    } catch (err: any) {
      alert(`Note save failed: ${err?.message || 'Error occurred'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Alerts Inbox</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated notifications triggered by official recalls, severe Class I events, and score escalations
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New (Unread)</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Severity:</span>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Total Alerts: {data?.total ?? 0}
        </span>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <LoadingState message="Loading compliance notifications..." count={4} />
      ) : error ? (
        <ErrorState
          title="Could not load alerts"
          message={error instanceof Error ? error.message : 'Error communicating with server'}
          onRetry={() => refetch()}
        />
      ) : data?.data && data.data.length > 0 ? (
        <div className="space-y-3">
          {data.data.map((alert: AlertItem) => {
            const isExpanded = expandedId === alert.id;
            return (
              <article
                key={alert.id}
                className={`bg-white rounded-xl border transition-all ${
                  alert.status === 'new'
                    ? 'border-blue-300 shadow-xs ring-1 ring-blue-100'
                    : 'border-slate-200'
                } p-5`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Message & Meta */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={alert.level} size="sm" showScore={false} />
                      <AlertStatusBadge status={alert.status} />
                      <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                        {alert.kind.replace(/_/g, ' ')}
                      </span>
                      {alert.vendorName && (
                        <span className="text-xs font-bold text-slate-900">
                          {alert.vendorName}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {alert.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                      {alert.sourceUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={alert.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Source Record ({(() => {
                              try {
                                return new URL(alert.sourceUrl).hostname;
                              } catch {
                                return 'source';
                              }
                            })()}) <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-start">
                    {alert.status === 'new' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(alert.id, 'reviewed')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Reviewed
                      </button>
                    )}

                    {alert.status !== 'dismissed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(alert.id, 'dismissed')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-500" /> Dismiss
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      aria-label={isExpanded ? 'Collapse note' : 'Expand note'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Note Section */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> Compliance Note &amp; Audit Trail
                      </span>
                      {editingNoteId !== alert.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(alert.id);
                            setNoteText(alert.note || '');
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {alert.note ? 'Edit Note' : 'Add Note'}
                        </button>
                      )}
                    </div>

                    {editingNoteId === alert.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Document clinical risk assessment, vendor review notes, or CAPA tracking ID..."
                          rows={3}
                          className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNote(alert.id, alert.status)}
                            className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        {alert.note || 'No review note entered yet.'}
                      </p>
                    )}

                    {alert.reviewedAt && (
                      <p className="text-[10px] text-slate-400 pt-1">
                        Reviewed at: {new Date(alert.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* Pagination */}
          {data.total > pageSize && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Showing {data.data.length} of {data.total} alerts
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
          title="No alerts match criteria"
          description="Your inbox contains zero notifications for the selected filters."
        />
      )}
    </div>
  );
};

export default AlertsPage;
