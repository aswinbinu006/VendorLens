import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
  Shield,
} from 'lucide-react';

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
}> = ({ pendingMatchesCount, newAlertsCount }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: dashboardData } = useDashboardSummary();

  const effectivePendingMatches = pendingMatchesCount ?? dashboardData?.pendingMatches ?? 0;
  const effectiveNewAlerts = newAlertsCount ?? dashboardData?.newAlerts ?? 0;

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/',
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
      label: 'Audit Log',
      path: '/audit',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: 'Fuzzy Engine Rules',
      path: '/settings/fuzzy',
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight">AI Vendor Risk</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Vendor Risk Monitor</h1>
              <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase block">
                Pharma Compliance
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Regulatory Sources badge / Info */}
        <div className="p-3 mx-3 mb-2 rounded-lg bg-slate-800/60 border border-slate-800 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <span>Surveillance Feeds</span>
          </div>
          <p className="leading-relaxed">
            Live openFDA Drug Recalls &amp; Pharma News monitoring with explainable fuzzy inference.
          </p>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="truncate min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.email || 'Admin'}</p>
              <p className="text-[10px] text-slate-400">Quality Unit</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
