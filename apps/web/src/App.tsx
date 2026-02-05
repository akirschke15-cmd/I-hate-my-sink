import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SkipNavigation } from './components/SkipNavigation';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { NewCustomerPage } from './pages/NewCustomerPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { EditCustomerPage } from './pages/EditCustomerPage';
import { NewMeasurementPage } from './pages/NewMeasurementPage';
import { EditMeasurementPage } from './pages/EditMeasurementPage';
import { SinksPage } from './pages/SinksPage';
import { SinkMatchPage } from './pages/SinkMatchPage';
import { QuotesPage } from './pages/QuotesPage';
import { NewQuotePage } from './pages/NewQuotePage';
import { QuoteDetailPage } from './pages/QuoteDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Loading authentication status...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Loading authentication status...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <>
      <SkipNavigation />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/new"
        element={
          <ProtectedRoute>
            <NewCustomerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <ProtectedRoute>
            <CustomerDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id/edit"
        element={
          <ProtectedRoute>
            <EditCustomerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id/measurements/new"
        element={
          <ProtectedRoute>
            <NewMeasurementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/measurements/:id/edit"
        element={
          <ProtectedRoute>
            <EditMeasurementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sinks"
        element={
          <ProtectedRoute>
            <SinksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/measurements/:id/match"
        element={
          <ProtectedRoute>
            <SinkMatchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes"
        element={
          <ProtectedRoute>
            <QuotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes/new"
        element={
          <ProtectedRoute>
            <NewQuotePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes/:id"
        element={
          <ProtectedRoute>
            <QuoteDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-history"
        element={
          <ProtectedRoute>
            <SalesHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
