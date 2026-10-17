import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lottie } from 'lottie-react';
import { useAuth } from '@/context/AuthContext';
import { isSuperAdminUser } from '@/utils/auth';
import { apiClient } from '@/api/client';
import loginSuccessAnimation from '@/assets/login-success.json';
import loginFailedAnimation from '@/assets/login-failed.json';
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
  const [authStatus, setAuthStatus] = useState<'idle' | 'success' | 'failed'>('idle');

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
      setAuthStatus('failed');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setAuthStatus('idle');

    try {
      await login(email.trim(), password);
      setAuthStatus('success');
      const isSuper = isSuperAdminUser({ email: email.trim() });
      const destination = searchParams.get('redirect') || (isSuper ? '/companies' : '/dashboard');
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 1500);
    } catch (err: any) {
      setAuthStatus('failed');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Soft Glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10">
        {/* Left Column: Enterprise Security & Brand Value */}
        <div className="p-8 sm:p-10 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20 border border-blue-400/30">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight">VendorRisk</span>
                <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  Pharma RegOps
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                Pharmaceutical Supplier Surveillance Console
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Authorized regulatory gateway for pharmaceutical quality assurance directors, qualified persons (QP), and supply chain procurement officers.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>FDA 21 CFR Part 11 compliant immutable event audit trails</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Automated daily synchronization of openFDA Drug Enforcement Recalls</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Human-in-the-loop business continuity and vendor approval authority</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 mt-8 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Surveillance Grid Online</span>
            </span>
            <span className="font-mono text-slate-500">v1.0.0 Enterprise</span>
          </div>
        </div>

        {/* Right Column: Sign In & Request Access Tabs */}
        <div className="p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'signin'
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Request Access
              </button>
            </div>

            {/* Lottie Animation Display on Login Success */}
            {authStatus === 'success' && (
              <div className="py-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                <div className="w-32 h-32">
                  <Lottie src={loginSuccessAnimation} autoplay loop={false} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">Authentication Successful</h3>
                <p className="text-xs text-slate-500 mt-1">Redirecting to your compliance workspace...</p>
              </div>
            )}

            {/* Error Banner with Lottie Fail Animation */}
            {authStatus === 'failed' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-3">
                <div className="w-12 h-12 flex-shrink-0">
                  <Lottie src={loginFailedAnimation} autoplay loop={false} />
                </div>
                <div>
                  <p className="font-semibold text-rose-900">Authentication Failed</p>
                  <p className="text-rose-700">{errorMessage || 'Invalid email or password.'}</p>
                </div>
              </div>
            )}

            {/* Success Banner for Request Access */}
            {requestSuccess && activeTab === 'request' && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                {requestSuccess}
              </div>
            )}

            {/* Tab 1: Corporate Sign In */}
            {activeTab === 'signin' && authStatus !== 'success' && (
              <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
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
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <label htmlFor="companyName" className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Cipla Quality Unit"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="contactName" className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Officer
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. Rajesh Sharma"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="requestEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email
                  </label>
                  <input
                    id="requestEmail"
                    type="email"
                    required
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="requestNotes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Monitored Suppliers (Optional)
                  </label>
                  <input
                    id="requestNotes"
                    type="text"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="e.g. ~30 API suppliers, US FDA focus"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isRequesting}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRequesting ? 'Submitting...' : 'Submit Organization Access Request'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-6 text-center border-t border-slate-200 mt-6">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-medium">
              <span>&larr; Back to Platform Overview</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
