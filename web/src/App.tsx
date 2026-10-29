import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AppLayout } from './app/AppLayout';
import { OverviewPage } from './app/OverviewPage';
import { EmployeesPage } from './app/EmployeesPage';
import { EmployeeEditPage } from './app/EmployeeEditPage';
import { LeadsPage } from './app/LeadsPage';
import { CallsPage } from './app/CallsPage';
import { AppointmentsPage } from './app/AppointmentsPage';
import { AnalyticsPage } from './app/AnalyticsPage';
import { WalletPage } from './app/WalletPage';
import { IntegrationsPage } from './app/IntegrationsPage';
import { SettingsPage } from './app/SettingsPage';
import { ProfilePage } from './app/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Spinner } from './components/Spinner';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/app" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Onboarding (authed but no business) */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />

      {/* Authenticated app */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <GuardedApp />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeEditPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/** Sends authed users without a business to onboarding. */
function GuardedApp() {
  const { business, loading } = useAuth();
  if (loading) return <Spinner full />;
  if (!business) return <Navigate to="/onboarding" replace />;
  return <AppLayout />;
}
