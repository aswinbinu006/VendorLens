import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useVendor,
  useVendorScore,
  useVendorScoreHistory,
  useVendorSignals,
} from '@/hooks/useVendor';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CriticalityBadge, TrustBadge } from '@/components/common/Badges';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { RiskLevel } from '@/types/api';

export const VendorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const vendorId = Number(id);

  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'history'>('overview');
  const [signalPage, setSignalPage] = useState(1);

  // API Hooks
  const { data: vendor, isLoading: vendorLoading, error: vendorError, refetch: refetchVendor } = useVendor(vendorId);
  const { data: scoreDetail, isLoading: scoreLoading } = useVendorScore(vendorId);
  const { data: scoreHistory, isLoading: historyLoading } = useVendorScoreHistory(vendorId);
  const { data: signalsData, isLoading: signalsLoading } = useVendorSignals(vendorId, signalPage, 10);

  if (vendorLoading || scoreLoading) {
    return <LoadingState message="Loading supplier dossier and regulatory score..." count={4} />;
  }

  if (vendorError || !vendor) {
    return (
      <ErrorState
        title="Vendor Not Found"
        message={vendorError instanceof Error ? vendorError.message : 'Unable to find requested vendor profile.'}
        onRetry={() => refetchVendor()}
      />
    );
  }

  const scoreValue = scoreDetail?.score ?? vendor.currentScore ?? 0;
  const scoreLevel: RiskLevel = (scoreDetail?.level ?? vendor.currentLevel ?? 'low') as RiskLevel;

  // SVG Radial Gauge calculation
  // Angle: -90 deg to +90 deg (half-circle gauge)
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * Math.PI; // Half-circle
  const clampedScore = Math.max(0, Math.min(100, scoreValue));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const gaugeColors: Record<RiskLevel, string> = {
    low: '#10b981', // emerald-500
    medium: '#f59e0b', // amber-500
    high: '#f97316', // orange-500
    critical: '#ef4444', // red-500
  };

  const currentGaugeColor = gaugeColors[scoreLevel] || '#10b981';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/vendors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vendors Watchlist
        </Link>
      </div>

      {/* Supplier Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{vendor.name}</h1>
              <RiskBadge level={scoreLevel} score={scoreValue} size="md" />
              <CriticalityBadge value={vendor.criticality} />
            </div>

            {vendor.aliases && vendor.aliases.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                <strong>Trading Aliases:</strong> {vendor.aliases.map((a: any) => typeof a === 'string' ? a : a.alias).join(', ')}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-3">
              <span>
                <strong>Country:</strong> {vendor.country || 'Global'}
              </span>
              <span>•</span>
              <span>
                <strong>Category:</strong> {vendor.category || 'General Pharma Supplier'}
              </span>
              {vendor.scoredAt && (
                <>
                  <span>•</span>
                  <span>
                    <strong>Scored:</strong> {new Date(vendor.scoredAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>

            {vendor.notes && (
              <p className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700 italic">
                "{vendor.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Circular Risk Gauge */}
        <div className="flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200 p-4 rounded-xl min-w-[200px] flex-shrink-0">
          <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
            <svg height="160" width="160" className="rotate-[180deg]">
              <circle
                stroke="#e2e8f0"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset: 0 }}
                r={normalizedRadius}
                cx="80"
                cy="80"
              />
              <circle
                stroke={currentGaugeColor}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx="80"
                cy="80"
              />
            </svg>
            <div className="absolute bottom-0 text-center">
              <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {scoreValue.toFixed(1)}
              </span>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Overall Risk (0-100)
              </span>
            </div>
          </div>
          <span className="text-xs font-bold uppercase mt-2" style={{ color: currentGaugeColor }}>
            {scoreLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Vendor detail sections">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Explainable Risk Score
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signals')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'signals'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Official FDA Signals ({signalsData?.total ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Score Audit History
          </button>
        </nav>
      </div>

      {/* TAB 1: Explainable Risk Score ("Why this score?") */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {scoreDetail ? (
            <>
              {/* Fuzzy Inputs Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Two-Stage Mamdani Inference Inputs
                    </h2>
                    <p className="text-xs text-slate-500">
                      Exact parameters fed into the fuzzy rules engine (Configuration v{scoreDetail.configVersion})
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Calculated: {new Date(scoreDetail.computedAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Recalls (12m)</p>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                      {scoreDetail.inputs.recalls12m}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Distinct event_ids</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Worst Class</p>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                      {scoreDetail.inputs.worstClass === 3
                        ? 'Class I (3)'
                        : scoreDetail.inputs.worstClass === 2
                        ? 'Class II (2)'
                        : scoreDetail.inputs.worstClass === 1
                        ? 'Class III (1)'
                        : 'None (0)'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">FDA severity level</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Days Since Latest</p>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                      {scoreDetail.inputs.daysSinceLatest}d
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cap: 730 days</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-medium text-slate-500 uppercase">Criticality</p>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                      {scoreDetail.inputs.criticality} / 5
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Supplier impact tier</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-medium text-slate-500 uppercase">News Signal</p>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                      {scoreDetail.inputs.newsSignal.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Scale: 0.0 – 1.0</p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
                    <p className="text-[11px] font-medium text-blue-700 uppercase">Stage 1 Reg Risk</p>
                    <p className="text-lg font-bold text-blue-900 mt-1 font-mono">
                      {scoreDetail.inputs.regulatoryRisk.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Fed to Stage 2</p>
                  </div>
                </div>
              </div>

              {/* Fired Rules Table */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Top Fired Fuzzy Rules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Transparent rule evaluation sorted by firing strength (&mu; &gt; 0)
                  </p>
                </div>

                {scoreDetail.firedRules && scoreDetail.firedRules.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Rule ID</th>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3">Plain-Language Proposition</th>
                          <th className="py-2.5 px-3">Consequent</th>
                          <th className="py-2.5 px-3 text-right">Firing Strength ($\mu$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scoreDetail.firedRules.map((rule) => (
                          <tr key={rule.ruleId} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{rule.ruleId}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                Stage {rule.stage}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-medium">{rule.description}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900">{rule.outputSet}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {(rule.strength * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No rules fired"
                    description="No inference rules exceeded activation thresholds for this vendor."
                  />
                )}
              </div>

              {/* News Surveillance Notice */}
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900">Media &amp; News Monitoring Status</h4>
                  <p className="mt-0.5 leading-relaxed">
                    News monitoring not enabled in this version. Unverified media chatter is not factored into this
                    supplier's score; calculation is driven strictly by FDA enforcement data and supplier criticality.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Score Not Yet Calculated"
              description="This vendor has not undergone fuzzy risk scoring yet. Run sync to evaluate."
            />
          )}
        </div>
      )}

      {/* TAB 2: Official FDA Signals Timeline */}
      {activeTab === 'signals' && (
        <div className="space-y-4">
          {signalsLoading ? (
            <LoadingState message="Fetching official recall records..." count={3} />
          ) : signalsData?.data && signalsData.data.length > 0 ? (
            <div className="space-y-3">
              {signalsData.data.map((sig) => (
                <article
                  key={sig.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <TrustBadge trust={sig.trust} size="sm" />
                      <span className="font-bold text-sm text-slate-900">{sig.title || 'FDA Recall Notice'}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {sig.severityRaw || 'Unclassified'}
                    </span>
                  </div>

                  {sig.summary && (
                    <p className="text-xs text-slate-700 leading-relaxed mb-3">
                      {sig.summary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>
                        <strong>Initiated:</strong>{' '}
                        {sig.eventDate ? new Date(sig.eventDate).toLocaleDateString() : 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>
                        <strong>FDA Reported:</strong>{' '}
                        {sig.reportDate ? new Date(sig.reportDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    {sig.url && (
                      <a
                        href={sig.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
                      >
                        FDA Record ({sig.sourceDomain || 'fda.gov'}) <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination */}
              {signalsData.total > 10 && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-500">
                    Showing {signalsData.data.length} of {signalsData.total} signals
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={signalPage <= 1}
                      onClick={() => setSignalPage((p) => p - 1)}
                      className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={signalPage * 10 >= signalsData.total}
                      onClick={() => setSignalPage((p) => p + 1)}
                      className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="No matched recall signals"
              description="No FDA recall records match this vendor within the active 12-month evaluation window."
            />
          )}
        </div>
      )}

      {/* TAB 3: Score History Chart & Table */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Risk Score History Audit</h2>
            <p className="text-xs text-slate-500">
              Track historical scoring recalculations and configuration version changes (E21 audit compliance)
            </p>
          </div>

          {historyLoading ? (
            <LoadingState message="Loading score history..." count={3} />
          ) : scoreHistory && scoreHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Computed At</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Risk Level</th>
                    <th className="py-2.5 px-3 text-center">Fuzzy Config Version</th>
                    <th className="py-2.5 px-3">E21 Version Transition Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scoreHistory.map((item, idx) => {
                    const prevItem = scoreHistory[idx + 1];
                    const configChanged = prevItem && prevItem.configVersion !== item.configVersion;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono">{new Date(item.computedAt).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{item.score.toFixed(1)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <RiskBadge level={item.level} size="sm" showScore={false} />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">v{item.configVersion}</td>
                        <td className="py-2.5 px-3">
                          {configChanged ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              Config upgrade (v{prevItem.configVersion} &rarr; v{item.configVersion}) — S1 alerts suppressed
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Stable config</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No historical scores"
              description="No historical score snapshots exist for this vendor."
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VendorDetailPage;
