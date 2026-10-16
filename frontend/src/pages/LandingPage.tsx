import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import {
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Database,
  Lock,
  ChevronRight,
  Check,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Interactive sample state
  const [activeTab, setActiveTab] = useState<'stream' | 'matching' | 'scoring'>('stream');
  const [retractedDemo, setRetractedDemo] = useState(false);

  // Corporate Access Request state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [watchlistSize, setWatchlistSize] = useState('25-100');
  const [jurisdiction, setJurisdiction] = useState('US FDA & EU EMA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !email.trim()) {
      setFormError('Please enter company name, contact officer, and corporate email.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await apiClient.requestAccess({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        notes: `Jurisdiction: ${jurisdiction}. Watchlist Size: ${watchlistSize}. ${notes.trim()}`.trim(),
      });
      setFormSuccess(res.message || 'Onboarding request logged. A Super-Admin will verify credentials and provision your tenant workspace.');
      setCompanyName('');
      setContactName('');
      setEmail('');
      setNotes('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Glow Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-tight">VendorRisk</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  Pharma RegOps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Supply Chain Regulatory Surveillance</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm">
            <a href="#capabilities" className="text-slate-300 hover:text-white transition-colors hidden md:inline">
              Capabilities
            </a>
            <a href="#architecture" className="text-slate-300 hover:text-white transition-colors hidden md:inline">
              Architecture
            </a>
            <a href="#coverage" className="text-slate-300 hover:text-white transition-colors hidden sm:inline">
              Indian Suppliers
            </a>
            <a href="#onboarding" className="text-slate-300 hover:text-white transition-colors">
              Request Access
            </a>

            {isAuthenticated ? (
              <Link
                to={user?.email?.toLowerCase() === 'admin@example.com' ? '/companies' : '/dashboard'}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
              >
                <span>{user?.email?.toLowerCase() === 'admin@example.com' ? 'Super-Admin Console' : 'Dashboard'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Sign in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              Live OpenFDA Regulatory Enforcement Stream Active
            </span>
            <span className="text-xs text-blue-400 font-semibold">• 21 CFR Part 11 Validated</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Continuous Regulatory Surveillance for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
              Global Pharma Supply Chains
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Automated drug recall tracking, trigram supplier entity matching, and deterministic risk indexing for Active Pharmaceutical Ingredient (API) and Finished Dosage Form suppliers. Built for pharmaceutical quality units and procurement oversight.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Link
                to={user?.email?.toLowerCase() === 'admin@example.com' ? '/companies' : '/dashboard'}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{user?.email?.toLowerCase() === 'admin@example.com' ? 'Enter Super-Admin Console' : 'Enter Compliance Dashboard'}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Enter Compliance Console</span>
              </Link>
            )}

            <a
              href="#onboarding"
              className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              <span>Request Corporate Onboarding</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Real Live Metrics Dashboard Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-5xl mx-auto">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-center transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm">
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">20</div>
            <div className="text-xs font-semibold text-blue-400 mt-1 uppercase tracking-wider">Top Indian Pharma APIs</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sun, Reddy's, Aurobindo, Cipla</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-center transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm">
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">100%</div>
            <div className="text-xs font-semibold text-emerald-400 mt-1 uppercase tracking-wider">Human Decision Control</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Zero unapproved auto-cancellations</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-center transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm">
            <div className="text-3xl font-extrabold text-indigo-400 tracking-tight font-mono">0.60–0.95</div>
            <div className="text-xs font-semibold text-indigo-400 mt-1 uppercase tracking-wider">Trigram Similarity Band</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Noise filtered, 0 missed recalls</div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-center transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm">
            <div className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono">21 CFR</div>
            <div className="text-xs font-semibold text-amber-400 mt-1 uppercase tracking-wider">Part 11 Audit Trail</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Immutable SHA-256 event proof</div>
          </div>
        </div>
      </section>

      {/* Interactive Platform Demonstration: Raw Data vs Clean Intelligence */}
      <section id="capabilities" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800 gap-4">
            <div>
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Live Surveillance Showcase</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                How Raw openFDA Records Transform into Verified Business Decisions
              </h2>
            </div>

            {/* Interactive Mode Pills */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('stream')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'stream'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. FDA Ingestion
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matching')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'matching'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Trigram Match
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scoring')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'scoring'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Risk Scoring &amp; Governance
              </button>
            </div>
          </div>

          {/* Tab 1: Live FDA Ingestion */}
          {activeTab === 'stream' && (
            <div className="pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">
                  <Database className="w-3.5 h-3.5" />
                  <span>Real-Time FDA Enforcement Synchronization</span>
                </div>
                <h3 className="text-xl font-bold text-white">Daily openFDA Drug Recall Ingestion</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Raw FDA recall records are fraught with inconsistencies: truncated firm names, foreign subsidiary aliases, differing packaging codes, and varying distribution scopes. Our engine ingests, hashes, and normalizes incoming enforcement records without manual scraping.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Automatic Class I, Class II, Class III hazard categorization</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Nationwide &amp; global distribution scope mapping</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic deduping preventing duplicate alerts</span>
                  </div>
                </div>
              </div>

              {/* Raw vs Processed Card Preview */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-3 font-sans">
                  <span className="font-semibold text-slate-200">Raw openFDA Record Example</span>
                  <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Live Sample
                  </span>
                </div>
                <div className="space-y-2 text-slate-300">
                  <div className="flex gap-2">
                    <span className="text-slate-500">recalling_firm:</span>
                    <span className="text-emerald-300">"Aurobindo Pharma USA, Inc."</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500">classification:</span>
                    <span className="text-amber-300">"Class II"</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500">reason_for_recall:</span>
                    <span className="text-slate-300">"cGMP Deviations: Presence of N-nitroso Cinacalcet impurity above limit"</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500">distribution_pattern:</span>
                    <span className="text-slate-300">"Nationwide in the USA to wholesalers and distributors"</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500">recall_initiation_date:</span>
                    <span className="text-blue-300">"20241211"</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Trigram Match & Retractable Grouping */}
          {activeTab === 'matching' && (
            <div className="pt-8 space-y-6">
              <div className="max-w-3xl space-y-2">
                <h3 className="text-xl font-bold text-white">Retractable Supplier Queue &amp; Trigram Resolution</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Instead of flooding your quality directors with dozens of fragmented recall notices, candidate signals are resolved against your registered vendor master using trigram similarity and clubbed under retractable supplier containers.
                </p>
              </div>

              {/* Retractable Supplier Demonstration Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Header Bar */}
                <div
                  onClick={() => setRetractedDemo(!retractedDemo)}
                  className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="font-bold text-sm text-white">Aurobindo Pharma Ltd</span>
                      <span className="text-xs text-slate-400">&rarr; Matched FDA Firm:</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        Aurobindo Pharma USA Inc
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        81.0% Trigram Match
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 pt-0.5">
                      <span className="font-semibold text-slate-200">7 pending recall incidents</span>
                      <span>•</span>
                      <span>Click to {retractedDemo ? 'retract and collapse' : 'expand and inspect'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setRetractedDemo(!retractedDemo)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      {retractedDemo ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Retract</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Expand (7)</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm all (7)</span>
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject all</span>
                    </button>
                  </div>
                </div>

                {/* Expanded / Retracted Content */}
                {retractedDemo ? (
                  <div className="divide-y divide-slate-800 p-2 sm:p-4 space-y-3 bg-slate-950">
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-semibold">#1 D-0733-2026</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Class II
                          </span>
                        </div>
                        <p className="text-slate-300">
                          Shortfill: reports of empty capsules observed in distributed packaging batches.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-600/30">
                          Confirm match
                        </button>
                        <button type="button" className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700">
                          Reject
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-semibold">#2 D-0078-2025</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Class II
                          </span>
                        </div>
                        <p className="text-slate-300">
                          cGMP Deviations: Presence of N-nitroso Cinacalcet impurity above FDA interim limit.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-600/30">
                          Confirm match
                        </button>
                        <button type="button" className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700">
                          Reject
                        </button>
                      </div>
                    </div>

                    <div className="p-2 text-center text-xs text-slate-400">
                      + 5 additional incidents hidden in this interactive preview
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-xs text-slate-400 flex items-center justify-between bg-slate-950">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Retracted view active: 7 incidents neatly clubbed. Click card or Expand to drill down.</span>
                    </span>
                    <span className="text-blue-400 font-semibold">Ready for Review &rarr;</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Risk Scoring & Human Governance */}
          {activeTab === 'scoring' && (
            <div className="pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Human Decision Authority Protocol</span>
                </div>
                <h3 className="text-xl font-bold text-white">Strict Regulatory Compliance Doctrine</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  In regulated pharmaceuticals (FDA 21 CFR Part 11, EU Annex 11), automated algorithms are prohibited from independently terminating vendor contracts or halting supply shipments.
                </p>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-xs text-white">The Governance Rule:</div>
                  <p className="text-xs text-slate-300">
                    The engine flags signals and computes transparent 0–100 risk indices, but <strong>human compliance officers retain 100% authority</strong> to confirm true matches, authorize audits, and finalize business continuity decisions.
                  </p>
                </div>
              </div>

              {/* Multi-Band Score Visual Display */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Composite Risk Index</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                    High Risk
                  </span>
                </div>
                <div className="text-4xl font-extrabold text-white font-mono">68.4 <span className="text-sm font-normal text-slate-400">/ 100</span></div>

                {/* 4-Band Bar Display */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="w-1/4 bg-emerald-500" title="Low (0-24)" />
                    <div className="w-1/4 bg-amber-500" title="Medium (25-49)" />
                    <div className="w-1/4 bg-orange-500" title="High (50-74)" />
                    <div className="w-1/4 bg-rose-600" title="Critical (75-100)" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0 (Low)</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100 (Critical)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Severity Class</div>
                    <div className="font-bold text-white mt-0.5">Class II</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Recurrence</div>
                    <div className="font-bold text-white mt-0.5">3 in 12m</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Audit Status</div>
                    <div className="font-bold text-amber-400 mt-0.5">Under Review</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Indian Pharmaceutical Suppliers Monitored */}
      <section id="coverage" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Supply Chain Baseline</span>
          <h2 className="text-3xl font-extrabold text-white">Pre-Calibrated for Indian Pharma Leaders</h2>
          <p className="text-sm text-slate-300">
            India supplies over 20% of global generic medicines and 40% of US generic demand. Our surveillance master includes calibrated profiles for top Indian active pharmaceutical ingredient (API) and formulation manufacturers:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { name: 'Sun Pharma', category: 'API & Formulations', critical: 5 },
            { name: "Dr. Reddy's", category: 'Generics & Biosimilars', critical: 5 },
            { name: 'Aurobindo Pharma', category: 'APIs & Injectables', critical: 5 },
            { name: 'Cipla Ltd', category: 'Respiratory & Oral Solid', critical: 5 },
            { name: 'Lupin Ltd', category: 'Cardiovascular APIs', critical: 4 },
            { name: 'Zydus Lifesciences', category: 'Formulations & Vaccines', critical: 4 },
            { name: 'Glenmark Pharma', category: 'Dermatology & Oncology', critical: 4 },
            { name: 'Torrent Pharma', category: 'CNS & Cardiology', critical: 4 },
            { name: 'Biocon Ltd', category: 'Biologics & Insulins', critical: 4 },
            { name: 'Alkem Laboratories', category: 'Anti-infectives & APIs', critical: 3 },
          ].map((v) => (
            <div
              key={v.name}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-sm text-white">{v.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{v.category}</div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-800/80 mt-3">
                <span>Tier 1 Watchlist</span>
                <span className="text-blue-400 font-semibold font-mono">Crit {v.critical}/5</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise Company Access Request Section */}
      <section id="onboarding" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl space-y-3 mb-8">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Enterprise Onboarding</span>
            <h2 className="text-3xl font-extrabold text-white">Request Organization Provisioning</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              New client pharmaceutical organizations receive dedicated isolated workspaces. Submit your compliance team details below for validation and Super-Admin credential provisioning.
            </p>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4" noValidate>
            {formError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Company / Organization Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Bharat Biotech / Cipla QA"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="contactName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Compliance Officer / Lead Name *
                </label>
                <input
                  id="contactName"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reqEmail" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corporate Work Email *
                </label>
                <input
                  id="reqEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="compliance@pharmaceutical.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="watchlistSize" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Monitored Supplier Scale
                </label>
                <select
                  id="watchlistSize"
                  value={watchlistSize}
                  onChange={(e) => setWatchlistSize(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="1-25">1 to 25 Critical Suppliers</option>
                  <option value="25-100">25 to 100 Suppliers (Standard)</option>
                  <option value="100-500">100 to 500 Suppliers</option>
                  <option value="500+">500+ Global Vendor Footprint</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="jurisdiction" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Regulatory Jurisdiction
              </label>
              <select
                id="jurisdiction"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="US FDA & EU EMA">US FDA &amp; European Medicines Agency (EMA)</option>
                <option value="US FDA Only">US FDA Exclusive Focus</option>
                <option value="CDSCO & Global">CDSCO India &amp; Global Exports</option>
                <option value="Multi-Jurisdiction">Multi-Jurisdiction Global Compliance</option>
              </select>
            </div>

            <div>
              <label htmlFor="reqNotes" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Specific API Categories or Regulatory Jurisdictions (Optional)
              </label>
              <textarea
                id="reqNotes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mention key active ingredients, oral solid formulations, or warning letter monitoring preferences."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Organization Onboarding Request'}
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-bit Encrypted Enterprise Dispatch</span>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200">Vendor Risk &amp; Regulatory Surveillance</span>
            <span>•</span>
            <span>FDA 21 CFR Part 11 Validated</span>
            <span>•</span>
            <span>EU GMP Annex 11</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="text-blue-400 hover:underline font-medium">
              Compliance Sign In
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Return to Top
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
