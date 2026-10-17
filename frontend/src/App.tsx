import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';

// Lazy loaded page components
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const VendorsPage = lazy(() => import('@/pages/VendorsPage'));
const VendorDetailPage = lazy(() => import('@/pages/VendorDetailPage'));
const MatchesPage = lazy(() => import('@/pages/MatchesPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const IngestionPage = lazy(() => import('@/pages/IngestionPage'));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'));
const FuzzySettingsPage = lazy(() => import('@/pages/FuzzySettingsPage'));
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { isSuperAdminUser } from '@/utils/auth';

/**
 * Super-Admin Guard:
 * Super-Admin is restricted to the Platform Administration Console (/companies, /audit).
 */
const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!isSuperAdminUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

/**
 * Company Admin Guard:
 * Client company admins access operational vendor surveillance, restricted from Super-Admin tenant provisioning.
 */
const CompanyOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (isSuperAdminUser(user)) {
    return <Navigate to="/companies" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-50 flex flex-col p-6 max-w-7xl mx-auto space-y-6">
                <div className="h-8 w-48 bg-slate-200/70 rounded-md animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-xl p-4 animate-pulse space-y-3" />
                  ))}
                </div>
                <div className="h-64 bg-white border border-slate-200/80 rounded-xl p-5 animate-pulse" />
              </div>
            }
          >
            <Routes>
              {/* Root URL is always the public Landing Page */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<Navigate to="/" replace />} />

              {/* Login */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Console Routes inside AppLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Super-Admin Platform Console */}
                <Route
                  path="/companies"
                  element={
                    <AdminOnlyRoute>
                      <CompaniesPage />
                    </AdminOnlyRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <AdminOnlyRoute>
                      <AuditLogPage />
                    </AdminOnlyRoute>
                  }
                />

                {/* Company Admin Operational Suite */}
                <Route
                  path="/dashboard"
                  element={
                    <CompanyOnlyRoute>
                      <DashboardPage />
                    </CompanyOnlyRoute>
                  }
                />
                <Route
                  path="/vendors"
                  element={
                    <CompanyOnlyRoute>
                      <VendorsPage />
                    </CompanyOnlyRoute>
                  }
                />
                <Route
                  path="/vendors/:id"
                  element={
                    <CompanyOnlyRoute>
                      <VendorDetailPage />
                    </CompanyOnlyRoute>
                  }
                />
                <Route
                  path="/matches"
                  element={
                    <CompanyOnlyRoute>
                      <MatchesPage />
                    </CompanyOnlyRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <CompanyOnlyRoute>
                      <AlertsPage />
                    </CompanyOnlyRoute>
                  }
                />
                <Route
                  path="/ingestion"
                  element={
                    <CompanyOnlyRoute>
                      <IngestionPage />
                    </CompanyOnlyRoute>
                  }
                />
                <Route
                  path="/settings/fuzzy"
                  element={
                    <CompanyOnlyRoute>
                      <FuzzySettingsPage />
                    </CompanyOnlyRoute>
                  }
                />
              </Route>

              {/* Fallback to Root Landing Page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
