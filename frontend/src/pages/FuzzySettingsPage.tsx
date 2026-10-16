import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LoadingState, ErrorState } from '@/components/common/States';
import {
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { FuzzyConfigData } from '@/types/api';

export const FuzzySettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stage1' | 'stage2' | 'thresholds'>('stage1');

  const { data, isLoading, error, refetch, isFetching } = useQuery<FuzzyConfigData, Error>({
    queryKey: ['fuzzy-config'],
    queryFn: () => apiClient.getFuzzyConfig(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <LoadingState message="Loading fuzzy engine specifications..." count={4} />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Could not load fuzzy rules"
        message={error instanceof Error ? error.message : 'Error communicating with engine'}
        onRetry={() => refetch()}
      />
    );
  }

  const rawConfig = (data as any)?.config || {};
  const stage1 = data.stage1 || rawConfig.stage1 || { inputs: [], rules: [], output: { name: '', range: [0, 100], sets: [] } };
  const stage2 = data.stage2 || rawConfig.stage2 || { inputs: [], rules: [], output: { name: '', range: [0, 100], sets: [] } };
  const thresholds = data.crispThresholds || rawConfig.crispThresholds || { low: 25, medium: 50, high: 75, critical: 100 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fuzzy Inference System Rules</h1>
          <p className="text-xs text-slate-500 mt-1">
            Two-stage Mamdani inference engine parameters matching docs/07 specification exactly
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
            Active Config: v{data.version}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh config"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit & Immutability Notice (E21) */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Engine Immutability (E21): </span>
          Fuzzy configuration versions are immutable. Tuning parameters creates a subsequent active version (e.g., v2).
          When recalculating historical vendor scores under upgraded configs, S1 level-increase alerts are automatically
          suppressed to prevent false alarm cascades.
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Fuzzy configuration sections">
          <button
            type="button"
            onClick={() => setActiveTab('stage1')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'stage1'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Stage 1: Regulatory Risk ({stage1.rules?.length || 11} Rules)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stage2')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'stage2'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Stage 2: Overall Risk ({stage2.rules?.length || 12} Rules)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('thresholds')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'thresholds'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Crisp Level Cutoffs (4 Levels)
          </button>
        </nav>
      </div>

      {/* TAB 1: Stage 1 Rules */}
      {activeTab === 'stage1' && (
        <div className="space-y-6">
          {/* Membership Curves Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> Stage 1 Input Variables &amp; Membership Sets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stage1.inputs?.map((input: any) => (
                <div key={input.name} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 font-mono">{input.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">[{input.range?.join('–')}]</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {input.sets?.map((set: any) => (
                      <div key={set.name} className="flex justify-between text-[11px]">
                        <span className="font-medium text-slate-700">{set.name}</span>
                        <span className="font-mono text-slate-400">
                          {set.type}({set.params?.join(', ')})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">Stage 1 Linguistic Rule Base</h2>
              <p className="text-xs text-slate-500">Mamdani minimum conjunction (AND) with clipped output set</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Rule</th>
                    <th className="py-2.5 px-4">Antecedents (IF)</th>
                    <th className="py-2.5 px-4">Consequent (THEN)</th>
                    <th className="py-2.5 px-4">Clinical Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stage1.rules?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{r.id}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-800">
                        {r.antecedents?.map((a: any) => `${a.variable} is ${Array.isArray(a.set) ? a.set.join('|') : a.set}`).join(' AND ')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {r.consequent?.set}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Stage 2 Rules */}
      {activeTab === 'stage2' && (
        <div className="space-y-6">
          {/* Membership Curves Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> Stage 2 Input Variables &amp; Output Sets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stage2.inputs?.map((input: any) => (
                <div key={input.name} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 font-mono">{input.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">[{input.range?.join('–')}]</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {input.sets?.map((set: any) => (
                      <div key={set.name} className="flex justify-between text-[11px]">
                        <span className="font-medium text-slate-700">{set.name}</span>
                        <span className="font-mono text-slate-400">
                          {set.type}({set.params?.join(', ')})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">Stage 2 Overall Risk Rule Base</h2>
              <p className="text-xs text-slate-500">Mamdani inference defuzzified via 0..100 centroid</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Rule</th>
                    <th className="py-2.5 px-4">Antecedents (IF)</th>
                    <th className="py-2.5 px-4">Consequent (THEN)</th>
                    <th className="py-2.5 px-4">Clinical Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stage2.rules?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{r.id}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-800">
                        {r.antecedents?.map((a: any) => `${a.variable} is ${Array.isArray(a.set) ? a.set.join('|') : a.set}`).join(' AND ')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {r.consequent?.set}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Crisp Level Cutoffs (E20) */}
      {activeTab === 'thresholds' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Crisp Level Cutoffs (E20)</h2>
            <p className="text-xs text-slate-500">
              Cutoffs read directly from active fuzzy_config version 2 (Low &lt; 25, Medium 25–49, High 50–74, Critical &ge; 75)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="font-bold text-xs text-emerald-800 uppercase tracking-wide">Low Risk</span>
              <p className="text-2xl font-bold font-mono text-emerald-900 mt-2">&lt; {thresholds.low}</p>
              <p className="text-xs text-emerald-700 mt-1">Normal surveillance interval</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
              <span className="font-bold text-xs text-amber-800 uppercase tracking-wide">Medium Risk</span>
              <p className="text-2xl font-bold font-mono text-amber-900 mt-2">
                {thresholds.low} – &lt;{thresholds.medium}
              </p>
              <p className="text-xs text-amber-700 mt-1">Heightened review</p>
            </div>

            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/60">
              <span className="font-bold text-xs text-orange-800 uppercase tracking-wide">High Risk</span>
              <p className="text-2xl font-bold font-mono text-orange-900 mt-2">
                {thresholds.medium} – &lt;{thresholds.high}
              </p>
              <p className="text-xs text-orange-700 mt-1">Immediate quality unit alert</p>
            </div>

            <div className="p-4 rounded-xl border border-red-200 bg-red-50/60">
              <span className="font-bold text-xs text-red-800 uppercase tracking-wide">Critical Risk</span>
              <p className="text-2xl font-bold font-mono text-red-900 mt-2">&ge; {thresholds.high}</p>
              <p className="text-xs text-red-700 mt-1">Executive &amp; CAPA intervention</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuzzySettingsPage;
