import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';

import { isSuperAdminUser } from '@/utils/auth';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { PillNav, PillNavItem } from '@/components/ui/PillNav';

const RouterLink: React.FC<{
  href?: string;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}> = ({ href, className, children, ...props }) => {
  return (
    <Link to={href || '#'} className={className} {...props}>
      {children}
    </Link>
  );
};

export const AppLayout: React.FC<{
  pendingMatchesCount?: number;
  newAlertsCount?: number;
  children?: React.ReactNode;
}> = ({ pendingMatchesCount, newAlertsCount, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: dashboardData } = useDashboardSummary();

  const effectivePendingMatches = pendingMatchesCount ?? dashboardData?.pendingMatches ?? 0;
  const effectiveNewAlerts = newAlertsCount ?? dashboardData?.newAlerts ?? 0;

  const isSuperAdmin = isSuperAdminUser(user);

  const navItems: PillNavItem[] = isSuperAdmin
    ? [
        {
          label: 'Client Companies',
          href: '/companies',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          label: 'Compliance Audit',
          href: '/audit',
          icon: <FileText className="w-4 h-4" />,
        },
      ]
    : [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          label: 'Vendors Watchlist',
          href: '/vendors',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          label: 'Match Review',
          href: '/matches',
          icon: <GitCompare className="w-4 h-4" />,
          badge: effectivePendingMatches > 0 ? effectivePendingMatches : undefined,
        },
        {
          label: 'Alerts Inbox',
          href: '/alerts',
          icon: <Bell className="w-4 h-4" />,
          badge: effectiveNewAlerts > 0 ? effectiveNewAlerts : undefined,
        },
        {
          label: 'Ingestion Status',
          href: '/ingestion',
          icon: <RefreshCw className="w-4 h-4" />,
        },
        {
          label: 'Fuzzy Rules',
          href: '/settings/fuzzy',
          icon: <Sliders className="w-4 h-4" />,
        },
      ];

  // Determine active href matching current route
  const currentPath = location.pathname;
  const activeItem = navItems.find((item) =>
    item.href === '/dashboard'
      ? currentPath === '/dashboard'
      : currentPath.startsWith(item.href || '')
  );
  const activeHref = activeItem?.href ?? (isSuperAdmin ? '/companies' : '/dashboard');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans dashboard-scope">
      
      {/* ========================================================
          LEFT NAVBAR (PillNav Vertical Sidebar)
          ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/90 flex flex-col justify-between p-3.5 shadow-sm transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4">
          {/* PillNav in Vertical Sidebar Orientation */}
          <PillNav
            orientation="vertical"
            logo={
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/25 border border-blue-400/30">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            }
            logoAlt="VendorRisk"
            logoHref={isSuperAdmin ? '/companies' : '/dashboard'}
            brandText={
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 tracking-tight">VendorRisk</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {isSuperAdmin ? 'Admin' : 'RegOps'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">Supply Chain Surveillance</p>
              </div>
            }
            items={navItems}
            activeHref={activeHref}
            linkComponent={RouterLink}
            theme="light"
            itemStyle="pill"
            hoverEffect="fill"
            indicator="dot"
            size="md"
            surface="none"
            highlightColor="#2563eb"
            highlightTextColor="#ffffff"
            onItemClick={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Regulatory Standards Card at Sidebar Bottom */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/40 border border-slate-200/80 text-[11px] text-slate-500 space-y-1 shadow-2xs">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>FDA 21 CFR Part 11</span>
          </div>
          <p className="leading-snug text-slate-500 text-[10.5px]">
            Electronic records &amp; signatures active. All audit events cryptographically verified.
          </p>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ========================================================
          RIGHT CONTENT AREA WITH TOP CONTROL BAR
          ======================================================== */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        
        {/* Top Header Controls */}
        <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">OpenFDA Live Stream Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors font-medium"
              title="Public Overview"
            >
              <span>Public Overview</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{user?.email || 'admin@example.com'}</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="h-8 px-3 rounded-xl bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1.5 font-medium shadow-2xs hover:shadow-xs"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full min-w-0">
          {children ?? <Outlet />}
        </main>
      </div>

    </div>
  );
};

export default AppLayout;
