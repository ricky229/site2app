import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardLayout, AuthLayout, PublicLayout } from './components/layout/Layouts'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AppsPage from './pages/apps/AppsPage'
import CreateAppPage from './pages/apps/CreateAppPage'
import NotificationsPage from './pages/NotificationsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Dashboard */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/apps/create" element={<CreateAppPage />} />
            <Route path="/apps/:id" element={<CreateAppPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:tab" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
