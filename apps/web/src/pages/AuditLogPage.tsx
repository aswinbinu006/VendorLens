import React, { useState } from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { DataTable, type Column } from '@/components/common/DataTable';
import { RefreshCw, User } from 'lucide-react';
import type { AuditLogItem } from '@/types/api';

export const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useAuditLog(
    entityFilter.trim() || undefined,
    actionFilter.trim() || undefined,
    page,
    pageSize
  );

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'id',
      header: 'Event ID',
      cell: (row) => <span className="font-mono text-xs font-bold text-slate-700">#{row.id}</span>,
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-800">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User / Actor',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-800">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.userEmail || (row.userId ? `User #${row.userId}` : 'System Agent')}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {row.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Target Entity',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900">{row.entity}</span>
          {row.entityId && (
            <span className="font-mono text-slate-400 ml-1">({row.entityId})</span>
          )}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Payload Details',
      cell: (row) => (
        <div className="text-xs max-w-sm truncate font-mono text-slate-600" title={JSON.stringify(row.details)}>
          {row.details ? JSON.stringify(row.details) : '—'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable 21 CFR Part 11 compliant audit log of user decisions, override events, and system triggers
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
          <input
            type="text"
            placeholder="Filter action (e.g. match:confirm)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Filter entity (e.g. vendors)..."
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Total Logged Events: {data?.total ?? 0}
        </span>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <LoadingState message="Loading compliance audit trail..." count={5} />
      ) : error ? (
        <ErrorState
          title="Could not load audit log"
          message={error instanceof Error ? error.message : 'Error communicating with server'}
          onRetry={() => refetch()}
        />
      ) : data?.data && data.data.length > 0 ? (
        <DataTable
          data={data.data}
          columns={columns}
          keyExtractor={(row) => row.id}
          caption="Compliance audit trail"
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={(p) => setPage(p)}
          isLoading={isFetching}
        />
      ) : (
        <EmptyState
          title="No audit events found"
          description="Zero compliance events match your specified filters."
        />
      )}
    </div>
  );
};

export default AuditLogPage;
