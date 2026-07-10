import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ActivatePage } from '@/pages/auth/ActivatePage';
import { HomePage } from '@/pages/placeholders/HomePage';
import { NotFoundPage } from '@/pages/placeholders/NotFoundPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { AppShell } from '@/components/layout/AppShell';
import { EmployeesPage } from '@/pages/employees/EmployeesPage';
import { ApplyLeavePage } from '@/pages/leaves/ApplyLeavePage';
import { LeaveRequestsPage } from '@/pages/leaves/LeaveRequestsPage';
import { LeaveHistoryPage } from '@/pages/leaves/LeaveHistoryPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { HolidaysPage } from '@/pages/holidays/HolidaysPage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="activate/:token" element={<ActivatePage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="employees"
            element={
              <ProtectedRoute requireHr>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route path="apply-leave" element={<ApplyLeavePage />} />
          <Route
            path="leave-requests"
            element={
              <ProtectedRoute requireHr>
                <LeaveRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route path="leave-history" element={<LeaveHistoryPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
