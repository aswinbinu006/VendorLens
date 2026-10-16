import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
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
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage').then(m => ({ default: m.CompaniesPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4] text-xs text-[#525252]">
                Loading...
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
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/vendors/:id" element={<VendorDetailPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/ingestion" element={<IngestionPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
                <Route path="/settings/fuzzy" element={<FuzzySettingsPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
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
