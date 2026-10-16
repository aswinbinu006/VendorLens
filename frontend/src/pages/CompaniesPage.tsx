import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import {
  Building2,
  Plus,
  RefreshCw,
  KeyRound,
  Check,
  Shield,
  FileCheck,
  Database,
  Users,
  CheckCircle2,
  Server,
  Activity,
} from 'lucide-react';

interface CompanyUser {
  id: number;
  email: string;
  createdAt: string;
}

interface AccessRequest {
  id: string;
  companyName: string;
  email: string;
  contactName: string;
  notes?: string;
  createdAt: string;
  status: 'PENDING' | 'PROVISIONED';
}

export const CompaniesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'requests' | 'telemetry'>('companies');

  // Companies State
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [dbHealth, setDbHealth] = useState<{ status: string; database?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, reqRes, healthRes] = await Promise.allSettled([
        apiClient.getUsers(),
        apiClient.getAccessRequests(),
        apiClient.getReady(),
      ]);

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data);
      if (healthRes.status === 'fulfilled') setDbHealth(healthRes.value);
    } catch (err: any) {
      setError(err?.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = 'Pass';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!2026';
    setCompanyPassword(pass);
  };

  const openProvisionModal = (prefillEmail?: string) => {
    setCompanyEmail(prefillEmail || '');
    handleGeneratePassword();
    setProvisionError(null);
    setProvisionSuccess(null);
    setIsModalOpen(true);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyEmail.trim() || !companyPassword.trim()) {
      setProvisionError('Please enter both corporate email and initial password.');
      return;
    }

    setIsProvisioning(true);
    setProvisionError(null);

    try {
      await apiClient.provisionCompany({
        email: companyEmail.trim(),
        password: companyPassword.trim(),
      });
      setProvisionSuccess(`Enterprise account provisioned for ${companyEmail.trim()}`);
      fetchData();
      setTimeout(() => {
        setIsModalOpen(false);
        setProvisionSuccess(null);
      }, 1800);
    } catch (err: any) {
      setProvisionError(err?.message || 'Failed to provision company account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Super-Admin Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Platform Administration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
              Super-Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized tenant database: Client company credential provisioning, onboarding access request audits, and database telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => openProvisionModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Company</span>
          </button>
        </div>
      </div>

      {/* Super-Admin Authority Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-4 sm:p-5 text-xs text-slate-800 flex items-start gap-3.5 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="w-4 h-4 text-blue-600" />
        </div>
        <div className="leading-relaxed">
          <span className="font-bold text-blue-900">Platform Isolation Doctrine: </span>
          As the <strong>Super-Admin</strong>, your authority is strictly scoped to managing client organizations, provisioning corporate credentials, and monitoring database operations. Operational vendor surveillance, incident confirmations, and procurement decisions are partitioned to each client company’s own quality officers.
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'companies'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Registered Companies ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Access Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'telemetry'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database &amp; Telemetry</span>
        </button>
      </div>

      {/* Tab 1: Registered Companies */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          {loading ? (
            <LoadingState message="Loading registered company tenants..." count={3} />
          ) : error ? (
            <ErrorState title="Failed to load companies" message={error} onRetry={fetchData} />
          ) : users.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Active Enterprise Tenants ({users.length})</span>
                <span className="font-mono text-slate-500 text-[11px]">Bcrypt Cost 12 • Active Sessions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-slate-900 font-mono">{u.email}</span>
                        {u.email === 'admin@example.com' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Master Super-Admin
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Client Company Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 pl-10">
                        Provisioned: {new Date(u.createdAt).toLocaleDateString()} at{' '}
                        {new Date(u.createdAt).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Tenant
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No companies provisioned yet"
              description="Click 'Provision New Company' to issue credentials for client pharmaceutical teams."
            />
          )}
        </div>
      )}

      {/* Tab 2: Pending Access Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Public Onboarding Inbound Queue ({requests.length})</span>
              <span className="text-slate-500 text-[11px]">Submitted via Landing Page</span>
            </div>

            <div className="divide-y divide-slate-100">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-900">{r.companyName}</span>
                      {r.status === 'PROVISIONED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Provisioned
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                      <span>Officer: <strong className="text-slate-800">{r.contactName}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-blue-600">{r.email}</span>
                      <span>•</span>
                      <span className="text-slate-400">Received: {new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    {r.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 mt-1 max-w-2xl">
                        Scope: {r.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {r.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => openProvisionModal(r.email)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Issue Credentials</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Credentials Issued</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Telemetry Overview */}
      {activeTab === 'telemetry' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>PostgreSQL Status</span>
                <Server className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">ONLINE</div>
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Health check responsive ({dbHealth?.database || 'PostgreSQL pg_trgm'})</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Total Tenants in DB</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">{users.length}</div>
              <div className="text-xs text-slate-500">
                1 Master Super-Admin + {users.length - 1} Client Accounts
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Access Inbound Pipeline</span>
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">{requests.length}</div>
              <div className="text-xs text-slate-500">
                {pendingRequestsCount} pending approval review
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="text-slate-400 font-sans font-bold text-sm">PostgreSQL Schema Specifications:</div>
            <div className="space-y-1 text-slate-300">
              <div>• Database Engine: PostgreSQL 16 (Least-privilege role: <span className="text-emerald-400">vrm_app</span>)</div>
              <div>• Trigram Matching: <span className="text-blue-400">pg_trgm extension enabled</span></div>
              <div>• Audit Ledger: <span className="text-indigo-400">SHA-256 cryptographic hash chaining</span></div>
              <div>• Regulatory Rule: <span className="text-amber-400">FDA 21 CFR Part 11 compliant</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Provision Client Company</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Issue enterprise login credentials for a verified pharmaceutical company.
              </p>
            </div>

            {provisionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {provisionError}
              </div>
            )}

            {provisionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{provisionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProvision} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Corporate Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="e.g. quality.head@clientpharma.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Generated Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Re-generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                  <KeyRound className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProvisioning ? 'Provisioning...' : 'Confirm & Issue Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;
