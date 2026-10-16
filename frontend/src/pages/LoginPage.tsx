import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isSuperAdminUser } from '@/utils/auth';
import { apiClient } from '@/api/client';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'signin' | 'request'>('signin');

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request company access state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both corporate email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      const isSuper = isSuperAdminUser({ email: email.trim() });
      const destination = searchParams.get('redirect') || (isSuper ? '/companies' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !requestEmail.trim() || !contactName.trim()) {
      setErrorMessage('Please provide your organization name, contact officer, and email.');
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.requestAccess({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: requestEmail.trim(),
        notes: requestNotes.trim() || undefined,
      });
      setRequestSuccess(res.message || 'Onboarding request submitted. A Super-Admin will verify your credentials and issue tenant access.');
      setCompanyName('');
      setContactName('');
      setRequestEmail('');
      setRequestNotes('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit access request. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10">
        {/* Left Column: Enterprise Security & Brand Value */}
        <div className="p-8 sm:p-10 bg-gradient-to-br from-slate-900 to-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight">VendorRisk</span>
                <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  Pharma RegOps
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Pharmaceutical Supplier Surveillance Console
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Authorized regulatory gateway for pharmaceutical quality assurance directors, qualified persons (QP), and supply chain procurement officers.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>FDA 21 CFR Part 11 compliant immutable event audit trails</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Automated daily synchronization of openFDA Drug Enforcement Recalls</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Human-in-the-loop business continuity and vendor approval authority</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 mt-8 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Surveillance Grid Online</span>
            </span>
            <span className="font-mono text-slate-400">v1.0.0 Enterprise</span>
          </div>
        </div>

        {/* Right Column: Sign In & Request Access Tabs */}
        <div className="p-8 sm:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'signin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('request');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'request'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Request Access
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Success Banner */}
            {requestSuccess && activeTab === 'request' && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-medium">
                {requestSuccess}
              </div>
            )}

            {/* Tab 1: Corporate Sign In */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Corporate Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@company.com"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Console'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Request Organization Access */}
            {activeTab === 'request' && (
              <form onSubmit={handleRequestAccess} className="space-y-3.5" noValidate>
                <div>
                  <label htmlFor="companyName" className="block text-xs font-semibold text-slate-300 mb-1">
                    Organization Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Cipla Quality Unit"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="contactName" className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Officer
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. Rajesh Sharma"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="requestEmail" className="block text-xs font-semibold text-slate-300 mb-1">
                    Work Email
                  </label>
                  <input
                    id="requestEmail"
                    type="email"
                    required
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="requestNotes" className="block text-xs font-semibold text-slate-300 mb-1">
                    Notes / Monitored Suppliers (Optional)
                  </label>
                  <input
                    id="requestNotes"
                    type="text"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="e.g. ~30 API suppliers, US FDA focus"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isRequesting}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRequesting ? 'Submitting...' : 'Submit Organization Access Request'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-6 text-center border-t border-slate-800/80 mt-6">
            <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 font-medium">
              <span>&larr; Back to Platform Overview</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
