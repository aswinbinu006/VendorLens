import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useImportVendors,
} from '@/hooks/useVendor';
import { DataTable, type Column } from '@/components/common/DataTable';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CriticalityBadge } from '@/components/common/Badges';
import { VendorForm } from '@/components/vendor/VendorForm';
import { VendorSearchBar } from '@/components/vendor/VendorSearchBar';
import {
  Plus,
  Upload,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  X,
} from 'lucide-react';
import type { VendorSummary, RiskLevel, CsvImportResponse } from '@/types/api';

export const VendorsPage: React.FC = () => {
  const navigate = useNavigate();

  // Filter & Pagination States
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'criticality'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorSummary | undefined>(undefined);
  const [importResult, setImportResult] = useState<CsvImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const activeLevel = riskFilter === 'all' ? undefined : (riskFilter as RiskLevel);
  const { data, isLoading, error, refetch, isFetching } = useVendors(
    page,
    pageSize,
    activeLevel,
    searchQuery.trim() || undefined,
    sortBy,
    sortOrder
  );

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor(editingVendor?.id || 0);
  const deleteVendor = useDeleteVendor();
  const importCsv = useImportVendors();

  const handleSort = (key: string) => {
    if (key === 'score' || key === 'name' || key === 'criticality') {
      if (sortBy === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(key);
        setSortOrder('desc');
      }
    }
  };

  const handleSaveVendor = async (vendorData: any) => {
    try {
      if (editingVendor) {
        await updateVendor.mutateAsync(vendorData);
      } else {
        await createVendor.mutateAsync(vendorData);
      }
      setFormOpen(false);
      setEditingVendor(undefined);
      refetch();
    } catch (err: any) {
      alert(`Save failed: ${err?.message || 'Error occurred'}`);
    }
  };

  const handleDeleteVendor = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from surveillance?`)) {
      try {
        await deleteVendor.mutateAsync(id);
        refetch();
      } catch (err: any) {
        alert(`Delete failed: ${err?.message || 'Error occurred'}`);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await importCsv.mutateAsync(file);
      setImportResult(res);
      refetch();
    } catch (err: any) {
      setImportError(err?.message || 'Failed to import CSV file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const columns: Column<VendorSummary>[] = [
    {
      key: 'name',
      header: 'Vendor Name',
      sortable: true,
      cell: (row) => (
        <div>
          <button
            type="button"
            onClick={() => navigate(`/vendors/${row.id}`)}
            className="font-semibold text-slate-900 hover:text-blue-600 text-left cursor-pointer"
          >
            {row.name}
          </button>
          {row.aliases && row.aliases.length > 0 && (
            <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
              Aliases: {row.aliases.map((a) => a.alias).join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      cell: (row) => <span className="text-slate-600 text-xs">{row.country || 'Global'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        <span className="text-slate-600 text-xs truncate max-w-[140px] block">
          {row.category || 'General'}
        </span>
      ),
    },
    {
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      align: 'center',
      cell: (row) => <CriticalityBadge value={row.criticality} />,
    },
    {
      key: 'decision',
      header: 'Procurement Status',
      align: 'center',
      cell: (row) => {
        const rawNotes = row.notes || '';
        const match = rawNotes.match(/\[STATUS:\s*([A-Z_]+)\]/);
        const status = match ? match[1] : 'APPROVED';
        if (status === 'DISQUALIFIED') {
          return (
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#FFD7D9] text-[#A2191F] border border-[#A2191F]" title="Human Decision: Disqualified (Do Not Procure)">
              Disqualified
            </span>
          );
        }
        if (status === 'UNDER_REVIEW') {
          return (
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#FCF4D6] text-[#684E00] border border-[#684E00]" title="Human Decision: Under Review (Audit Required)">
              Under Review
            </span>
          );
        }
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#DEFBE6] text-[#0E6027] border border-[#0E6027]" title="Human Decision: Approved (Active Supplier)">
            Approved
          </span>
        );
      },
    },
    {
      key: 'score',
      header: 'Risk Score',
      sortable: true,
      align: 'center',
      cell: (row) => (
        <RiskBadge level={row.currentLevel} score={row.currentScore} size="sm" showScore={true} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/vendors/${row.id}`)}
            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
            title="View vendor details"
            aria-label={`View ${row.name} details`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingVendor(row);
              setFormOpen(true);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Edit vendor"
            aria-label={`Edit ${row.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteVendor(row.id, row.name)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
            title="Delete vendor"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendors Watchlist</h1>
          <p className="text-xs text-slate-500 mt-1">
            Supplier portfolio under continuous FDA regulatory compliance monitoring
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            aria-label="Import vendors from CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingVendor(undefined);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            aria-label="Add new vendor"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* CSV Import Summary Banner & Per-Row Error Report */}
      {importError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{importError}</span>
          </div>
          <button type="button" onClick={() => setImportError(null)} className="p-1 text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importResult && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                CSV Import Complete: {importResult.imported} imported, {importResult.failed} failed out of{' '}
                {importResult.totalRows} rows.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setImportResult(null)}
              className="p-1 text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {importResult.results && importResult.results.some((r) => r.status === 'error') && (
            <div className="mt-2 pt-2 border-t border-blue-200/60 max-h-40 overflow-y-auto space-y-1">
              <p className="font-semibold text-slate-700">Row-level validation reports:</p>
              {importResult.results
                .filter((r) => r.status === 'error')
                .map((r, idx) => (
                  <p key={idx} className="text-rose-700 text-[11px] font-mono">
                    Row {r.row}: {r.name} - {r.error || 'Failed to import'}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <VendorSearchBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        riskFilter={riskFilter}
        onRiskFilterChange={(filter) => {
          setRiskFilter(filter as any);
          setPage(1);
        }}
        onResetFilters={() => {
          setSearchQuery('');
          setRiskFilter('all');
          setPage(1);
        }}
        showFilters={true}
      />

      {/* Main Table Content */}
      {isLoading ? (
        <LoadingState message="Loading vendor watchlist..." count={5} />
      ) : error ? (
        <ErrorState
          title="Could not load vendors"
          message={error instanceof Error ? error.message : 'Error communicating with server'}
          onRetry={() => refetch()}
        />
      ) : data?.data && data.data.length > 0 ? (
        <DataTable
          data={data.data}
          columns={columns}
          keyExtractor={(row) => row.id}
          caption="Vendors surveillance watchlist"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={(p) => setPage(p)}
          isLoading={isFetching}
        />
      ) : (
        <EmptyState
          title="No vendors found"
          description={
            searchQuery || riskFilter !== 'all'
              ? 'No suppliers match your current filter criteria.'
              : 'Add your first supplier to begin automated FDA surveillance.'
          }
          action={
            searchQuery || riskFilter !== 'all'
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchQuery('');
                    setRiskFilter('all');
                    setPage(1);
                  },
                }
              : {
                  label: 'Add Vendor',
                  onClick: () => {
                    setEditingVendor(undefined);
                    setFormOpen(true);
                  },
                }
          }
        />
      )}

      {/* Create / Edit Vendor Modal Form */}
      <VendorForm
        vendor={editingVendor}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingVendor(undefined);
        }}
        onSave={handleSaveVendor}
      />
    </div>
  );
};

export default VendorsPage;
