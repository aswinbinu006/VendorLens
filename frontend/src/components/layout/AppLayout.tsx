import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  GitCompare,
  Bell,
  RefreshCw,
  FileText,
  Sliders,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

import { isSuperAdminUser } from '@/utils/auth';

import { useDashboardSummary } from '@/hooks/useDashboard';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

export const AppLayout: React.FC<{
  pendingMatchesCount?: number;
  newAlertsCount?: number;
  children?: React.ReactNode;
}> = ({ pendingMatchesCount, newAlertsCount, children }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: dashboardData } = useDashboardSummary();

  const effectivePendingMatches = pendingMatchesCount ?? dashboardData?.pendingMatches ?? 0;
  const effectiveNewAlerts = newAlertsCount ?? dashboardData?.newAlerts ?? 0;

  const isSuperAdmin = isSuperAdminUser(user);

  const navItems: NavItem[] = isSuperAdmin
    ? [
        {
          label: 'Client Companies & Tenants',
          path: '/companies',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          label: 'Compliance Audit Trail',
          path: '/audit',
          icon: <FileText className="w-4 h-4" />,
        },
      ]
    : [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          label: 'Vendors Watchlist',
          path: '/vendors',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          label: 'Match Review',
          path: '/matches',
          icon: <GitCompare className="w-4 h-4" />,
          badge: effectivePendingMatches > 0 ? effectivePendingMatches : undefined,
        },
        {
          label: 'Alerts Inbox',
          path: '/alerts',
          icon: <Bell className="w-4 h-4" />,
          badge: effectiveNewAlerts > 0 ? effectiveNewAlerts : undefined,
        },
        {
          label: 'Ingestion Status',
          path: '/ingestion',
          icon: <RefreshCw className="w-4 h-4" />,
        },
        {
          label: 'Fuzzy Engine Rules',
          path: '/settings/fuzzy',
          icon: <Sliders className="w-4 h-4" />,
        },
      ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Sleek Top Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to={isSuperAdmin ? '/companies' : '/dashboard'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white text-sm font-bold tracking-tight">
                VendorRisk
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {isSuperAdmin ? 'Platform Administration' : 'Pharma RegOps'}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/"
            className="text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700"
            title="Public Overview"
          >
            <span>Public Overview</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <span className="text-slate-700 hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300 font-mono text-xs">{user?.email || 'admin@example.com'}</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="h-8 px-3 rounded-lg bg-slate-900 text-slate-300 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Body Area with Left Nav (240px) and Content Area */}
      <div className="pt-14 flex flex-1">
        {/* Modern Sidebar (240px) */}
        <aside
          className={`fixed inset-y-0 left-0 top-14 z-40 w-60 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `h-10 px-3.5 rounded-xl flex items-center justify-between text-xs font-semibold select-none cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Regulatory Standards Footer in Sidebar */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>FDA 21 CFR Part 11</span>
            </div>
            <p className="leading-snug text-slate-400">
              Electronic records &amp; signatures active. All audit events cryptographically verified.
            </p>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-14 z-30 bg-slate-950/70 backdrop-blur-xs md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full min-w-0">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
