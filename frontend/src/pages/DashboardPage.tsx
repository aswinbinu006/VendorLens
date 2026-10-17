import React from 'react';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useRunIngestion } from '@/hooks/useIngestion';
import { ErrorState, StaleDataBanner, EmptyState } from '@/components/common/States';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CriticalityBadge, AlertStatusBadge } from '@/components/common/Badges';
import {
  Building2,
  Bell,
  GitCompare,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RiskLevel } from '@/types/api';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch, isFetching } = useDashboardSummary();
  const runIngestion = useRunIngestion();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load dashboard metrics"
        message={error instanceof Error ? error.message : 'Unable to connect to surveillance engine'}
        onRetry={() => refetch()}
      />
    );
  }

  const handleManualSync = async () => {
    try {
      await runIngestion.mutateAsync();
      await refetch();
    } catch (err) {
      console.error('Failed to trigger ingestion:', err);
    }
  };

  const totalScored =
    data.distribution.low +
    data.distribution.medium +
    data.distribution.high +
    data.distribution.critical;

  const distributionItems: Array<{
    level: RiskLevel;
    label: string;
    count: number;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  }> = [
    {
      level: 'low',
      label: 'Low (< 25)',
      count: data.distribution.low,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-500',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
    },
    {
      level: 'medium',
      label: 'Medium (25–49)',
      count: data.distribution.medium,
      color: 'text-amber-700',
      bgColor: 'bg-amber-500',
      icon: <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />,
    },
    {
      level: 'high',
      label: 'High (50–74)',
      count: data.distribution.high,
      color: 'text-orange-700',
      bgColor: 'bg-orange-500',
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" aria-hidden="true" />,
    },
    {
      level: 'critical',
      label: 'Critical (>= 75)',
      count: data.distribution.critical,
      color: 'text-red-700',
      bgColor: 'bg-red-600',
      icon: <ShieldAlert className="w-4 h-4 text-red-600" aria-hidden="true" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Risk Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Live surveillance across active vendors</span>
            {data.lastDataRefresh && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Clock className="w-3 h-3" /> Last updated: {new Date(data.lastDataRefresh).toLocaleString()}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            aria-label="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={runIngestion.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            aria-label="Trigger manual ingestion sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runIngestion.isPending ? 'animate-spin' : ''}`} />
            {runIngestion.isPending ? 'Syncing...' : 'Sync FDA'}
          </button>
        </div>
      </div>

      {/* Stale Data Warning Banner */}
      <StaleDataBanner
        lastRefresh={data.lastDataRefresh}
        isOverdue={data.isStale}
        onRefreshClick={handleManualSync}
      />

      {/* System Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs py-2 px-3.5 bg-slate-100/70 rounded-lg border border-slate-200/80 text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="font-medium text-slate-800">Deterministic Regulatory Inference Engine</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">Recalls and firm criticality scored</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
          <span>PIPELINE: ACTIVE</span>
          <span>•</span>
          <span className="text-slate-700 font-semibold">{totalScored} AUDITED</span>
        </div>
      </div>

      {/* KPI Metric Strip: Clean, Bordered, Monospaced Metrics (No AI Badges) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monitored Vendors */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Monitored Vendors</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">{data.totalVendors}</span>
            <span className="text-xs text-slate-400">firms</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Active supplier registry</p>
        </div>

        {/* High & Critical Risk */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Critical / High Risk</span>
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono tracking-tight ${data.highOrCriticalVendors > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {data.highOrCriticalVendors}
            </span>
            <span className="text-xs text-slate-400">flagged</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Score ≥ 50 threshold</p>
        </div>

        {/* Pending Matches */}
        <Link
          to="/matches"
          className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-400/80 transition-colors group block"
        >
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span className="group-hover:text-blue-600 transition-colors">Pending Matches</span>
            <GitCompare className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              {data.pendingMatches}
            </span>
            <span className="text-xs text-slate-400">review</span>
          </div>
          <p className="mt-2 text-[11px] text-blue-600 font-medium flex items-center justify-between">
            <span>Trigram entity links</span>
            <span>View →</span>
          </p>
        </Link>

        {/* Regulatory Alerts */}
        <Link
          to="/alerts"
          className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-400/80 transition-colors group block"
        >
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span className="group-hover:text-blue-600 transition-colors">Compliance Alerts</span>
            <Bell className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              {data.newAlerts}
            </span>
            <span className="text-xs text-slate-400">unreviewed</span>
          </div>
          <p className="mt-2 text-[11px] text-blue-600 font-medium flex items-center justify-between">
            <span>OpenFDA signals</span>
            <span>Inbox →</span>
          </p>
        </Link>
      </div>

      {/* Portfolio Risk Breakdown: Compact Table / Density Bar */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Portfolio Risk Distribution</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated fuzzy categorization across {totalScored} suppliers</p>
          </div>
          <span className="text-xs font-mono text-slate-600">100% AUDITED</span>
        </div>

        {/* Minimal Thin Distribution Strip */}
        <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden flex mb-4">
          {distributionItems.map((item) => {
            const pct = totalScored > 0 ? (item.count / totalScored) * 100 : 0;
            return (
              <div
                key={item.level}
                style={{ width: `${pct}%` }}
                className={`${item.bgColor}`}
                title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Clean Data Strip (Linear / Vercel style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {distributionItems.map((item) => {
            const pct = totalScored > 0 ? ((item.count / totalScored) * 100).toFixed(0) : '0';
            return (
              <div key={item.level} className="flex items-center justify-between py-1.5 px-3 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.bgColor}`} />
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900">{item.count}</span>
                  <span className="text-[10px] font-mono text-slate-400">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Grid: Top Risky Vendors & Latest Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Top Risky Vendors */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Top Risky Vendors</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Highest priority suppliers requiring surveillance review</p>
            </div>
            <Link
              to="/vendors"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100">
            {data.topRiskyVendors && data.topRiskyVendors.length > 0 ? (
              data.topRiskyVendors.map((vendor) => (
                <div key={vendor.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/vendors/${vendor.id}`}
                      className="font-medium text-xs text-slate-900 hover:text-blue-600 truncate block"
                    >
                      {vendor.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{vendor.country || 'Global'}</span>
                      {vendor.category && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{vendor.category}</span>
                        </>
                      )}
                      <span>•</span>
                      <CriticalityBadge value={vendor.criticality} />
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <RiskBadge level={vendor.currentLevel} score={vendor.currentScore} size="sm" />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No risky vendors detected"
                description="All monitored suppliers currently reflect low regulatory risk."
              />
            )}
          </div>
        </section>

        {/* Latest Alerts */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Recent Compliance Alerts</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Official recall signals and risk level increases</p>
            </div>
            <Link
              to="/alerts"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Inbox <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100">
            {data.latestAlerts && data.latestAlerts.length > 0 ? (
              data.latestAlerts.map((alert) => (
                <div key={alert.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-normal text-slate-800 flex-1 leading-snug">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <RiskBadge level={alert.level} size="sm" showScore={false} />
                      <AlertStatusBadge status={alert.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="uppercase text-slate-500">{alert.kind.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No recent alerts"
                description="Zero unreviewed compliance or regulatory events recorded."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
