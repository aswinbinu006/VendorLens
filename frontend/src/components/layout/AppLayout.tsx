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
  Users,
  ExternalLink,
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
  children?: React.ReactNode;
}> = ({ pendingMatchesCount, newAlertsCount, children }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: dashboardData } = useDashboardSummary();

  const effectivePendingMatches = pendingMatchesCount ?? dashboardData?.pendingMatches ?? 0;
  const effectiveNewAlerts = newAlertsCount ?? dashboardData?.newAlerts ?? 0;

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-[#525252]" />,
    },
    {
      label: 'Vendors Watchlist',
      path: '/vendors',
      icon: <Building2 className="w-4 h-4 text-[#525252]" />,
    },
    {
      label: 'Match Review',
      path: '/matches',
      icon: <GitCompare className="w-4 h-4 text-[#525252]" />,
      badge: effectivePendingMatches > 0 ? effectivePendingMatches : undefined,
    },
    {
      label: 'Alerts Inbox',
      path: '/alerts',
      icon: <Bell className="w-4 h-4 text-[#525252]" />,
      badge: effectiveNewAlerts > 0 ? effectiveNewAlerts : undefined,
    },
    {
      label: 'Ingestion Status',
      path: '/ingestion',
      icon: <RefreshCw className="w-4 h-4 text-[#525252]" />,
    },
    {
      label: 'Audit Log',
      path: '/audit',
      icon: <FileText className="w-4 h-4 text-[#525252]" />,
    },
    {
      label: 'Fuzzy Engine Rules',
      path: '/settings/fuzzy',
      icon: <Sliders className="w-4 h-4 text-[#525252]" />,
    },
    {
      label: 'Client Companies',
      path: '/companies',
      icon: <Users className="w-4 h-4 text-[#525252]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#161616] flex flex-col">
      {/* 48px Top Header per Frontend Design Rules §5 */}
      <header className="h-12 bg-[#161616] border-b border-[#262626] fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-1 hover:bg-[#262626] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-white text-sm font-semibold tracking-normal">
            Vendor Risk Monitor
          </span>
          <span className="text-[#8D8D8D] text-xs hidden sm:inline">
            Pharmaceutical Supply Chain Surveillance
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/"
            className="text-[#C6C6C6] hover:text-white inline-flex items-center gap-1"
            title="Public Overview"
          >
            <span>Public portal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-[#8D8D8D] hidden sm:inline">|</span>
          <span className="text-white font-mono text-xs">{user?.email || 'admin@example.com'}</span>
          <button
            type="button"
            onClick={logout}
            className="h-7 px-2.5 bg-[#262626] text-white hover:bg-[#393939] border border-[#525252] cursor-pointer inline-flex items-center gap-1 font-semibold"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Body Area with Left Nav (240px) and Content Area */}
      <div className="pt-12 flex flex-1">
        {/* Left Navigation: 240px wide, white, 1px right border per §5 */}
        <aside
          className={`fixed inset-y-0 left-0 top-12 z-40 w-[240px] bg-[#FFFFFF] border-r border-[#E0E0E0] flex flex-col md:static md:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex-1 py-2 overflow-y-auto" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `h-10 px-4 flex items-center justify-between text-xs font-semibold select-none cursor-pointer border-l-[3px] ${
                    isActive
                      ? 'border-[#0F62FE] bg-[#E8E8E8] text-[#161616]'
                      : 'border-transparent text-[#525252] hover:bg-[#F4F4F4] hover:text-[#161616]'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.2 bg-[#FFD7D9] text-[#A2191F] border border-[#A2191F]">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Regulatory Standards Footer in Sidebar */}
          <div className="p-4 border-t border-[#E0E0E0] bg-[#FFFFFF] text-[11px] text-[#525252] space-y-1">
            <div className="font-semibold text-[#161616]">Compliance Authority</div>
            <p className="leading-snug">
              FDA 21 CFR Part 11 electronic records. Human review required for vendor status.
            </p>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-12 z-30 bg-[#161616]/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Content Area: padding 24px, max width 1280px per §5 */}
        <main className="flex-1 p-6 max-w-[1280px] w-full min-w-0">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
