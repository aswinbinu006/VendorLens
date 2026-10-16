import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Building2, Plus, RefreshCw, KeyRound, Check, Shield } from 'lucide-react';

interface CompanyUser {
  id: number;
  email: string;
  createdAt: string;
}

export const CompaniesPage: React.FC = () => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getUsers();
      setUsers(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load provisioned companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
      setProvisionSuccess(`Company account provisioned for ${companyEmail.trim()}`);
      setCompanyEmail('');
      setCompanyPassword('');
      fetchUsers();
      setTimeout(() => {
        setIsModalOpen(false);
        setProvisionSuccess(null);
      }, 2000);
    } catch (err: any) {
      setProvisionError(err?.message || 'Failed to provision company account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#161616] tracking-tight">
            Client Companies &amp; User Provisioning
          </h1>
          <p className="text-xs text-[#525252] mt-0.5">
            Super-Admin Console: Issue enterprise access credentials for client pharmaceutical teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E0E0E0] bg-[#FFFFFF] text-xs font-semibold text-[#161616] hover:bg-[#E8E8E8] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
              setProvisionError(null);
              setProvisionSuccess(null);
              handleGeneratePassword();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#0F62FE] bg-[#0F62FE] hover:bg-[#0050E6] text-[#FFFFFF] text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Provision new company
          </button>
        </div>
      </div>

      {/* Super Admin Notice */}
      <div className="bg-[#EDF5FF] border border-[#0F62FE] p-4 text-xs text-[#161616] flex items-start gap-3">
        <Shield className="w-4 h-4 text-[#0F62FE] flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#0F62FE]">Enterprise Multi-Tenancy Architecture: </span>
          When a new client company signs an agreement, provision their designated corporate admin here.
          The company can then immediately sign in at the login console with these credentials to monitor their private supplier watchlist.
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading provisioned companies..." count={3} />
      ) : error ? (
        <ErrorState title="Failed to load companies" message={error} onRetry={fetchUsers} />
      ) : users.length > 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E0E0E0]">
          <div className="p-3 bg-[#F4F4F4] border-b border-[#E0E0E0] text-xs font-semibold text-[#161616] flex items-center justify-between">
            <span>Provisioned Accounts ({users.length})</span>
            <span className="text-[11px] text-[#525252] font-mono">Bcrypt Cost 12 • Active</span>
          </div>

          <div className="divide-y divide-[#E0E0E0]">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F4F4F4]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0F62FE]" />
                    <span className="text-xs font-semibold text-[#161616] font-mono">{u.email}</span>
                    {u.email === 'admin@example.com' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#EDF5FF] text-[#0F62FE] border border-[#0F62FE]">
                        Master Super-Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#525252]">
                    Created: {new Date(u.createdAt).toLocaleDateString()} at {new Date(u.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#DEFBE6] text-[#0E6027] border border-[#0E6027]">
                    Active Account
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="No companies provisioned" description="Click 'Provision new company' to issue access credentials." />
      )}

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(22,22,22,0.5)]">
          <div className="w-full max-w-[420px] bg-[#FFFFFF] border border-[#E0E0E0] p-6 space-y-4">
            <div className="border-b border-[#E0E0E0] pb-2">
              <h2 className="text-sm font-semibold text-[#161616]">Provision Client Company</h2>
              <p className="text-xs text-[#525252] mt-0.5">
                Issue initial credentials for a new enterprise subscriber.
              </p>
            </div>

            {provisionError && (
              <div className="p-2.5 bg-[#FFF1F1] border border-[#DA1E28] text-xs text-[#DA1E28]">
                {provisionError}
              </div>
            )}

            {provisionSuccess && (
              <div className="p-2.5 bg-[#DEFBE6] border border-[#0E6027] text-xs text-[#0E6027] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{provisionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProvision} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-semibold text-[#525252] mb-1">
                  Corporate Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="e.g. quality.lead@clientpharma.com"
                  className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-[#525252]">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-[#0F62FE] hover:underline cursor-pointer"
                  >
                    Generate secure
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#8D8D8D] text-xs font-mono text-[#161616] focus:outline-2 focus:outline-[#0F62FE]"
                  />
                  <KeyRound className="w-3.5 h-3.5 absolute right-2.5 top-3 text-[#525252] pointer-events-none" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E0E0E0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#FFFFFF] hover:bg-[#E8E8E8] text-[#525252] border border-[#E0E0E0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#0F62FE] hover:bg-[#0050E6] text-[#FFFFFF] border border-[#0F62FE] disabled:opacity-50 cursor-pointer"
                >
                  {isProvisioning ? 'Provisioning...' : 'Confirm & Issue'}
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
