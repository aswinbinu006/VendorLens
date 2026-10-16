import React from 'react';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useRunIngestion } from '@/hooks/useIngestion';
import { LoadingState, ErrorState, StaleDataBanner, EmptyState } from '@/components/common/States';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CriticalityBadge, AlertStatusBadge } from '@/components/common/Badges';
import {
  Building2,
  Bell,
  GitCompare,
  TrendingUp,
  RefreshCw,
  Info,
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
    return <LoadingState message="Loading executive compliance dashboard..." count={4} />;
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

      {/* Stale Data Warning Banner (Flagging Logic: > 36h) */}
      <StaleDataBanner
        lastRefresh={data.lastDataRefresh}
        isOverdue={data.isStale}
        onRefreshClick={handleManualSync}
      />

      {/* Mandatory Notice: News Monitoring Not Enabled */}
      {!data.newsEnabled && (
        <div
          className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs text-slate-700 flex items-center justify-between"
          role="note"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
            <span>
              <strong>Surveillance Notice:</strong> News monitoring not enabled in this version.
              Vendor scores reflect verified regulatory recalls and firm criticality only.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
            v2 Official Only
          </span>
        </div>
      )}

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monitored Vendors</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.totalVendors}</p>
            <p className="text-[11px] text-slate-500 mt-1">Active supplier registry</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* High & Critical Risk Vendors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">High &amp; Critical Risk</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{data.highOrCriticalVendors}</p>
            <p className="text-[11px] text-slate-500 mt-1">Requires immediate remediation</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Match Review */}
        <Link
          to="/matches"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-amber-400 hover:shadow-sm transition-all group"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide group-hover:text-amber-800">
              Pending Matches
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{data.pendingMatches}</p>
            <p className="text-[11px] text-slate-500 mt-1">Review candidate FDA links</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <GitCompare className="w-6 h-6" />
          </div>
        </Link>

        {/* New Regulatory Alerts */}
        <Link
          to="/alerts"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide group-hover:text-blue-800">
              New Alerts
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{data.newAlerts}</p>
            <p className="text-[11px] text-slate-500 mt-1">Unread compliance notices</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Bell className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Risk Level Distribution (Four Levels: Low, Medium, High, Critical) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Risk Distribution Across Portfolio</h2>
            <p className="text-xs text-slate-500">Mamdani two-stage fuzzy evaluation (four crisp levels)</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {totalScored} Scored Vendors
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner mb-6">
          {distributionItems.map((item) => {
            const pct = totalScored > 0 ? (item.count / totalScored) * 100 : 0;
            return (
              <div
                key={item.level}
                style={{ width: `${pct}%` }}
                className={`${item.bgColor} transition-all duration-300`}
                title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* 4 Discrete Level Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {distributionItems.map((item) => {
            const pct = totalScored > 0 ? ((item.count / totalScored) * 100).toFixed(0) : '0';
            return (
              <div key={item.level} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{pct}%</span>
                </div>
                <p className={`text-xl font-bold mt-2 ${item.color}`}>{item.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Grid: Top Risky Vendors & Latest Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risky Vendors */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Top Risky Vendors</h2>
              <p className="text-xs text-slate-500">Highest priority suppliers requiring surveillance review</p>
            </div>
            <Link
              to="/vendors"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5 flex-1 divide-y divide-slate-100">
            {data.topRiskyVendors && data.topRiskyVendors.length > 0 ? (
              data.topRiskyVendors.map((vendor) => (
                <div key={vendor.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/vendors/${vendor.id}`}
                      className="font-semibold text-sm text-slate-900 hover:text-blue-600 truncate block"
                    >
                      {vendor.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
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
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Compliance Alerts</h2>
              <p className="text-xs text-slate-500">Official recall signals and risk level increases</p>
            </div>
            <Link
              to="/alerts"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Inbox <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5 flex-1 divide-y divide-slate-100">
            {data.latestAlerts && data.latestAlerts.length > 0 ? (
              data.latestAlerts.map((alert) => (
                <div key={alert.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium text-slate-900 flex-1 leading-snug">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <RiskBadge level={alert.level} size="sm" showScore={false} />
                      <AlertStatusBadge status={alert.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500 uppercase">{alert.kind.replace(/_/g, ' ')}</span>
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
