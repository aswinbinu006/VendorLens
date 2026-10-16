import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

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

  const handleFillDemo = () => {
    setEmail('admin@example.com');
    setPassword('AdminStrongPass!2026');
    setErrorMessage(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !requestEmail.trim() || !contactName.trim()) {
      setErrorMessage('Please fill in company name, contact person, and email.');
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
      setRequestSuccess(res.message);
      setCompanyName('');
      setContactName('');
      setRequestEmail('');
      setRequestNotes('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit request.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col justify-center items-center p-4">
      {/* Centred 400px Container per Frontend Design Rules §7 */}
      <div className="w-full max-w-[400px] bg-[#FFFFFF] border border-[#E0E0E0] p-6 space-y-5">
        <div>
          <h1 className="text-base font-semibold text-[#161616] leading-tight">
            Vendor Risk &amp; Compliance Monitor
          </h1>
          <p className="text-xs text-[#525252] mt-0.5">
            Pharma Supplier Regulatory Surveillance Console
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex border-b border-[#E0E0E0]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 cursor-pointer ${
              activeTab === 'signin'
                ? 'border-[#0F62FE] text-[#0F62FE]'
                : 'border-transparent text-[#525252] hover:text-[#161616]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('request');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 cursor-pointer ${
              activeTab === 'request'
                ? 'border-[#0F62FE] text-[#0F62FE]'
                : 'border-transparent text-[#525252] hover:text-[#161616]'
            }`}
          >
            Request company access
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-[#FFF1F1] border border-[#DA1E28] text-xs text-[#DA1E28]">
            {errorMessage}
          </div>
        )}

        {/* Success Banner */}
        {requestSuccess && activeTab === 'request' && (
          <div className="p-3 bg-[#DEFBE6] border border-[#0E6027] text-xs text-[#0E6027]">
            {requestSuccess}
          </div>
        )}

        {/* Tab 1: Sign in */}
        {activeTab === 'signin' && (
          <form className="space-y-4" onSubmit={handleSignIn} noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#525252] mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#525252] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div className="pt-1 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-[#0F62FE] hover:bg-[#0050E6] text-[#FFFFFF] text-xs font-semibold border border-[#0F62FE] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full h-9 bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#161616] text-xs font-semibold border border-[#E0E0E0] cursor-pointer"
              >
                Fill demo admin credentials
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Request Company Access */}
        {activeTab === 'request' && (
          <form className="space-y-3" onSubmit={handleRequestAccess} noValidate>
            <p className="text-xs text-[#525252] leading-relaxed">
              Enterprise pharmaceutical teams can request a monitored workspace. A Super-Admin will verify your domain and issue enterprise credentials.
            </p>

            <div>
              <label htmlFor="companyName" className="block text-xs font-semibold text-[#525252] mb-1">
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Sun Pharmaceutical Industries Ltd"
                className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div>
              <label htmlFor="contactName" className="block text-xs font-semibold text-[#525252] mb-1">
                Contact person
              </label>
              <input
                id="contactName"
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma (Head of QA)"
                className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div>
              <label htmlFor="requestEmail" className="block text-xs font-semibold text-[#525252] mb-1">
                Corporate work email
              </label>
              <input
                id="requestEmail"
                type="email"
                required
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div>
              <label htmlFor="requestNotes" className="block text-xs font-semibold text-[#525252] mb-1">
                Suppliers count / notes (optional)
              </label>
              <input
                id="requestNotes"
                type="text"
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="e.g. Monitoring ~35 API suppliers"
                className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isRequesting}
                className="w-full h-10 bg-[#0F62FE] hover:bg-[#0050E6] text-[#FFFFFF] text-xs font-semibold border border-[#0F62FE] disabled:opacity-50 cursor-pointer"
              >
                {isRequesting ? 'Submitting request...' : 'Submit access request'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 text-center text-[11px] text-[#525252] space-y-2">
          <div>Authorized FDA compliance personnel only.</div>
          <div>
            <Link to="/" className="text-[#0F62FE] hover:underline font-semibold">
              &larr; Back to Platform Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
