import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import {
  ShieldCheck,
  Building2,
  GitCompare,
  Sliders,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Demo interactive state for Landing Page retractable demonstration
  const [demoExpanded, setDemoExpanded] = useState(false);

  // Request Access Form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [watchlistSize, setWatchlistSize] = useState('25-100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [demoLoginLoading, setDemoLoginLoading] = useState(false);

  const handleDemoSignIn = async () => {
    setDemoLoginLoading(true);
    try {
      await login('admin@example.com', 'AdminStrongPass!2026');
      navigate('/dashboard');
    } catch {
      navigate('/login');
    } finally {
      setDemoLoginLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !email.trim()) {
      setFormError('Please enter company name, contact person, and corporate email.');
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
        notes: `Estimated Watchlist: ${watchlistSize}. ${notes.trim()}`.trim(),
      });
      setFormSuccess(res.message || 'Onboarding request submitted successfully. A Super-Admin will review and issue your credentials.');
      setCompanyName('');
      setContactName('');
      setEmail('');
      setNotes('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit request. Please try again or sign in directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#161616]">
      {/* 48px Fixed Top Header per Frontend Design Rules §5 */}
      <header className="h-12 bg-[#161616] border-b border-[#262626] fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold tracking-normal">
            Vendor Risk Monitor
          </span>
          <span className="text-[#8D8D8D] text-xs hidden md:inline">
            Pharmaceutical Supply Chain Surveillance
          </span>
        </div>

        <nav className="flex items-center gap-4 text-xs">
          <a href="#overview" className="text-[#C6C6C6] hover:text-white">
            Overview
          </a>
          <a href="#human-governance" className="text-[#C6C6C6] hover:text-white hidden sm:inline">
            Human Governance
          </a>
          <a href="#retractable-queue" className="text-[#C6C6C6] hover:text-white hidden md:inline">
            Retractable Review
          </a>
          <a href="#onboarding" className="text-[#C6C6C6] hover:text-white">
            Request Access
          </a>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="h-8 px-3 bg-[#0F62FE] text-white font-semibold flex items-center hover:bg-[#0050E6]"
            >
              Open console
            </Link>
          ) : (
            <Link
              to="/login"
              className="h-8 px-3 bg-[#0F62FE] text-white font-semibold flex items-center hover:bg-[#0050E6]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>

      {/* Main Content Area: Padding 24px, Max Width 1280px */}
      <main className="pt-20 pb-16 px-6 max-w-[1280px] mx-auto space-y-12">
        {/* Executive Overview Panel */}
        <section id="overview" className="bg-[#FFFFFF] border border-[#E0E0E0] p-8 space-y-6">
          <div className="space-y-2 max-w-4xl">
            <span className="text-xs font-semibold text-[#525252] uppercase tracking-wide">
              Regulatory Surveillance Platform
            </span>
            <h1 className="text-2xl font-semibold text-[#161616] leading-tight">
              Automated Regulatory Surveillance for Pharmaceutical Supply Chains
            </h1>
            <p className="text-sm text-[#525252] leading-relaxed">
              Continuous openFDA drug recall enforcement tracking, trigram supplier entity matching, and deterministic risk indexing for Active Pharmaceutical Ingredient (API) and Finished Dosage Form suppliers. Built for pharmaceutical quality units and procurement oversight.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="h-10 px-5 bg-[#0F62FE] text-white text-xs font-semibold flex items-center hover:bg-[#0050E6] cursor-pointer"
              >
                Enter compliance dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="h-10 px-5 bg-[#0F62FE] text-white text-xs font-semibold flex items-center hover:bg-[#0050E6] cursor-pointer"
                >
                  Sign in to compliance console
                </Link>
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  disabled={demoLoginLoading}
                  className="h-10 px-5 bg-[#FFFFFF] border border-[#0F62FE] text-[#0F62FE] text-xs font-semibold flex items-center hover:bg-[#E8E8E8] cursor-pointer disabled:opacity-50"
                >
                  {demoLoginLoading ? 'Entering demo...' : '1-Click demo evaluation'}
                </button>
                <a
                  href="#onboarding"
                  className="h-10 px-5 bg-[#FFFFFF] border border-[#E0E0E0] text-[#161616] text-xs font-semibold flex items-center hover:bg-[#E8E8E8] cursor-pointer"
                >
                  Request organization onboarding
                </a>
              </>
            )}
          </div>

          {/* 4 Flat KPI Tiles per Frontend Design Rules §6 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#E0E0E0]">
            <div className="p-4 bg-[#F4F4F4] border border-[#E0E0E0]">
              <div className="text-xs text-[#525252]">Monitored suppliers</div>
              <div className="text-2xl font-semibold text-[#161616] font-mono tabular-nums mt-1">20</div>
              <div className="text-xs text-[#525252] mt-1">Indian API &amp; formulation leaders</div>
            </div>
            <div className="p-4 bg-[#F4F4F4] border border-[#E0E0E0]">
              <div className="text-xs text-[#525252]">Regulatory ingestion</div>
              <div className="text-2xl font-semibold text-[#161616] font-mono tabular-nums mt-1">openFDA</div>
              <div className="text-xs text-[#525252] mt-1">Class I, II, III drug recall reports</div>
            </div>
            <div className="p-4 bg-[#F4F4F4] border border-[#E0E0E0]">
              <div className="text-xs text-[#525252]">Deterministic risk scale</div>
              <div className="text-2xl font-semibold text-[#161616] font-mono tabular-nums mt-1">0.0 — 100.0</div>
              <div className="text-xs text-[#525252] mt-1">4-band rating (Low to Critical)</div>
            </div>
            <div className="p-4 bg-[#F4F4F4] border border-[#E0E0E0]">
              <div className="text-xs text-[#525252]">Governance standard</div>
              <div className="text-2xl font-semibold text-[#161616] font-mono tabular-nums mt-1">21 CFR Part 11</div>
              <div className="text-xs text-[#525252] mt-1">100% human decision authority</div>
            </div>
          </div>
        </section>

        {/* Human Decision Authority Mandate */}
        <section id="human-governance" className="bg-[#FFFFFF] border border-[#E0E0E0] p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0F62FE] flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-[#161616]">
                Human Decision Authority (FDA 21 CFR Part 11 / EU Annex 11)
              </h2>
              <p className="text-xs text-[#525252] leading-relaxed">
                Regulated pharmaceutical supply chains cannot delegate supplier qualification or contract termination to automated algorithms. The platform adheres strictly to the human-in-the-loop governance doctrine:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-[#EDF5FF] border border-[#0F62FE] text-xs space-y-1">
                  <div className="font-semibold text-[#0F62FE]">Algorithm Role (Signal Detection)</div>
                  <p className="text-[#161616]">
                    Computes trigram string similarity (0.60 to 0.95), categorizes recall severity (Class I, II, III), and calculates vendor risk indices. Flagged candidate links are queued for human inspection.
                  </p>
                </div>
                <div className="p-3 bg-[#DEFBE6] border border-[#0E6027] text-xs space-y-1">
                  <div className="font-semibold text-[#0E6027]">Human Authority (Business Decisions)</div>
                  <p className="text-[#161616]">
                    Authorized quality officers confirm true positive matches, reject coincidental name matches, and determine whether the company continues business with, audits, or disqualifies the supplier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Retractable Review Queue Architecture Demonstration */}
        <section id="retractable-queue" className="bg-[#FFFFFF] border border-[#E0E0E0] p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#161616]">
              Retractable Supplier Match Review Architecture
            </h2>
            <p className="text-xs text-[#525252]">
              When monitoring hundreds of drug products, raw incident logs can quickly overwhelm compliance personnel. The review queue clubs incidents by supplier with retractable containers, allowing officers to review high-level supplier aggregates or expand to verify granular recalls.
            </p>
          </div>

          {/* Interactive Demo Card */}
          <div className="border border-[#E0E0E0] bg-[#FFFFFF]">
            {/* Header / Retractable Bar */}
            <div
              onClick={() => setDemoExpanded(!demoExpanded)}
              className="bg-[#F4F4F4] border-b border-[#E0E0E0] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#161616]" />
                  <span className="font-semibold text-xs text-[#161616]">Aurobindo Pharma Ltd</span>
                  <span className="text-xs text-[#525252]">&rarr; Matched FDA Firm:</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-[#FFFFFF] border border-[#E0E0E0] text-[#161616]">
                    Aurobindo Pharma USA Inc
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#0F62FE] px-1.5 py-0.5 bg-[#EDF5FF] border border-[#0F62FE]">
                    81.0% match
                  </span>
                </div>
                <div className="text-xs text-[#525252] flex items-center gap-2">
                  <span className="font-semibold text-[#161616]">7 pending recall incidents</span>
                  <span>•</span>
                  <span>Click bar or toggle button to {demoExpanded ? 'retract' : 'expand'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setDemoExpanded(!demoExpanded)}
                  className="h-8 px-3 text-xs font-semibold bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#161616] border border-[#E0E0E0] cursor-pointer inline-flex items-center gap-1"
                >
                  {demoExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-[#525252]" />
                      <span>Retract list</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-[#525252]" />
                      <span>Expand (7)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="h-8 px-3 text-xs font-semibold bg-[#0E6027] text-white border border-[#0E6027] cursor-pointer inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm all (7)</span>
                </button>
                <button
                  type="button"
                  className="h-8 px-3 text-xs font-semibold bg-[#FFFFFF] text-[#A2191F] border border-[#A2191F] cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject all</span>
                </button>
              </div>
            </div>

            {/* Collapsible Content */}
            {demoExpanded ? (
              <div className="divide-y divide-[#E0E0E0]">
                <div className="p-3 bg-[#FFFFFF] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-mono text-xs text-[#161616] font-semibold">
                      #1 D-0733-2026 — Aurobindo Pharma USA Inc <span className="ml-2 px-1.5 py-0.5 bg-[#FFD9BE] text-[#8A3800] border border-[#8A3800] text-[11px]">Class II</span>
                    </div>
                    <p className="text-[#525252] mt-0.5">Shortfill: reports of empty capsules observed in distributed packaging.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-7 px-2 text-xs border border-[#E0E0E0] bg-[#FFFFFF] text-[#0E6027] hover:bg-[#E8E8E8]">
                      Confirm
                    </button>
                    <button type="button" className="h-7 px-2 text-xs border border-[#E0E0E0] bg-[#FFFFFF] text-[#A2191F] hover:bg-[#E8E8E8]">
                      Reject
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#FFFFFF] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-mono text-xs text-[#161616] font-semibold">
                      #2 D-0078-2025 — Aurobindo Pharma USA Inc <span className="ml-2 px-1.5 py-0.5 bg-[#FFD9BE] text-[#8A3800] border border-[#8A3800] text-[11px]">Class II</span>
                    </div>
                    <p className="text-[#525252] mt-0.5">cGMP Deviations: Presence of N-nitroso impurity above FDA interim limit.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-7 px-2 text-xs border border-[#E0E0E0] bg-[#FFFFFF] text-[#0E6027] hover:bg-[#E8E8E8]">
                      Confirm
                    </button>
                    <button type="button" className="h-7 px-2 text-xs border border-[#E0E0E0] bg-[#FFFFFF] text-[#A2191F] hover:bg-[#E8E8E8]">
                      Reject
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-[#F4F4F4] text-center text-xs text-[#525252]">
                  + 5 additional incidents hidden in this interactive preview.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#FFFFFF] text-xs text-[#525252] flex items-center justify-between">
                <span>
                  Retracted view active: 7 incidents grouped under Aurobindo Pharma Ltd. Click Expand to inspect individual recall notices.
                </span>
                <span className="font-mono text-xs text-[#161616]">
                  Status: Ready for Human Review
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Core Pillars / Architecture */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-[#161616]">
            Surveillance Architecture &amp; Enterprise Governance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#FFFFFF] border border-[#E0E0E0] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#161616]">
                <GitCompare className="w-4 h-4 text-[#0F62FE]" />
                <span>Trigram Entity Resolution</span>
              </div>
              <p className="text-xs text-[#525252] leading-relaxed">
                Matches noisy openFDA firm strings against watchlist suppliers with calibrated 0.60 to 0.95 similarity bands, preventing typos and foreign subsidiary name mismatches from evading detection.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E0E0E0] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#161616]">
                <Sliders className="w-4 h-4 text-[#0F62FE]" />
                <span>Deterministic Scoring Engine</span>
              </div>
              <p className="text-xs text-[#525252] leading-relaxed">
                Calculates risk indices (0-100) using transparent, versioned formulas. Incorporates Class I/II/III weights, recurrence frequency, and critical supplier multipliers without black-box drift.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E0E0E0] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#161616]">
                <FileText className="w-4 h-4 text-[#0F62FE]" />
                <span>Immutable Audit Ledger</span>
              </div>
              <p className="text-xs text-[#525252] leading-relaxed">
                Meets FDA 21 CFR Part 11 requirements: every match confirmation, reject decision, and business status change is stamped with timestamp, user identity, and SHA-256 cryptographic proof.
              </p>
            </div>
          </div>
        </section>

        {/* Company Onboarding & Super-Admin Credential Provisioning */}
        <section id="onboarding" className="bg-[#FFFFFF] border border-[#E0E0E0] p-8 space-y-6">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-semibold text-[#525252] uppercase tracking-wide">
              Enterprise Access &amp; Organization Onboarding
            </span>
            <h2 className="text-xl font-semibold text-[#161616]">
              Request Company Onboarding
            </h2>
            <p className="text-xs text-[#525252] leading-relaxed">
              New pharmaceutical companies and quality teams cannot register self-serve credentials without authorization. A Super-Admin verifies your regulatory domain and issues tenant credentials with dedicated watchlist access.
            </p>
          </div>

          {/* Request Form */}
          <form onSubmit={handleSubmitRequest} className="max-w-2xl space-y-4 pt-2" noValidate>
            {formError && (
              <div className="p-3 bg-[#FFF1F1] border border-[#DA1E28] text-xs text-[#DA1E28]">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-[#DEFBE6] border border-[#0E6027] text-xs text-[#0E6027]">
                {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="comp-name" className="block text-xs font-semibold text-[#525252] mb-1">
                  Company / Organization name *
                </label>
                <input
                  id="comp-name"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Bharat Biotech / Cipla Quality Unit"
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
                />
              </div>

              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold text-[#525252] mb-1">
                  Compliance officer / Contact name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="req-email" className="block text-xs font-semibold text-[#525252] mb-1">
                  Corporate email address *
                </label>
                <input
                  id="req-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@pharmaceutical.com"
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
                />
              </div>

              <div>
                <label htmlFor="watchlist-size" className="block text-xs font-semibold text-[#525252] mb-1">
                  Active supplier watchlist size
                </label>
                <select
                  id="watchlist-size"
                  value={watchlistSize}
                  onChange={(e) => setWatchlistSize(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
                >
                  <option value="1-25">1 to 25 suppliers</option>
                  <option value="25-100">25 to 100 suppliers</option>
                  <option value="100-500">100 to 500 suppliers</option>
                  <option value="500+">500+ global suppliers</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="req-notes" className="block text-xs font-semibold text-[#525252] mb-1">
                Compliance requirements / Notes (Optional)
              </label>
              <textarea
                id="req-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify specific APIs, FDA inspection history requirements, or regulatory jurisdiction."
                className="w-full p-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 bg-[#0F62FE] text-white text-xs font-semibold hover:bg-[#0050E6] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting request...' : 'Submit onboarding request'}
              </button>
              <span className="text-xs text-[#525252]">
                Super-Admin processes requests within 24 hours.
              </span>
            </div>
          </form>
        </section>
      </main>

      {/* 48px Enterprise Footer per Design Rules */}
      <footer className="border-t border-[#E0E0E0] bg-[#FFFFFF] py-6 px-6 text-xs text-[#525252]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-[#161616]">Vendor Risk &amp; Compliance Monitor</span>
            <span>•</span>
            <span>FDA 21 CFR Part 11</span>
            <span>•</span>
            <span>EU GMP Annex 11</span>
            <span>•</span>
            <span>GAMP 5 Category 4</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-[#0F62FE] hover:underline">
              Compliance Sign In
            </Link>
            <a href="#overview" className="text-[#525252] hover:text-[#161616]">
              Back to top
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
