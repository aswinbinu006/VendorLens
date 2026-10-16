import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { LoadingState } from '@/components/common/States';

// Route-level code splitting (lazy loaded chunks)
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const VendorsPage = lazy(() => import('@/pages/VendorsPage'));
const VendorDetailPage = lazy(() => import('@/pages/VendorDetailPage'));
const MatchesPage = lazy(() => import('@/pages/MatchesPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const IngestionPage = lazy(() => import('@/pages/IngestionPage'));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'));
const FuzzySettingsPage = lazy(() => import('@/pages/FuzzySettingsPage'));

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
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoadingState message="Loading application module..." count={2} />
              </div>
            }
          >
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes inside AppLayout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="vendors" element={<VendorsPage />} />
                <Route path="vendors/:id" element={<VendorDetailPage />} />
                <Route path="matches" element={<MatchesPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="ingestion" element={<IngestionPage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="settings/fuzzy" element={<FuzzySettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
