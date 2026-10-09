import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'

// User dashboard
import { UserLayout } from './layouts/UserLayout'
import Overview from './pages/dashboard/Overview'
import Analyzer from './pages/dashboard/Analyzer'
import History from './pages/dashboard/History'
import SkillInsights from './pages/dashboard/SkillInsights'
import Roadmap from './pages/dashboard/Roadmap'
import Progress from './pages/dashboard/Progress'
import WhatIf from './pages/dashboard/WhatIf'
import Assistant from './pages/dashboard/Assistant'
import Profile from './pages/dashboard/Profile'
import Settings from './pages/dashboard/Settings'
import AnalysisResult from './pages/dashboard/AnalysisResult'

// Admin dashboard
import { AdminLayout } from './layouts/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminResumes from './pages/admin/AdminResumes'
import AdminAnalyses from './pages/admin/AdminAnalyses'
import AdminSkills from './pages/admin/AdminSkills'
import AdminResources from './pages/admin/AdminResources'
import AdminRecommendations from './pages/admin/AdminRecommendations'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminAIUsage from './pages/admin/AdminAIUsage'
import AdminSettings from './pages/admin/AdminSettings'

function FullPageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size={36} />
        <p className="muted small mt-16">Loading your session…</p>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

function RequireGuest({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route
        path="/login"
        element={
          <RequireGuest>
            <Login />
          </RequireGuest>
        }
      />
      <Route
        path="/register"
        element={
          <RequireGuest>
            <Register />
          </RequireGuest>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RequireGuest>
            <ForgotPassword />
          </RequireGuest>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RequireGuest>
            <ResetPassword />
          </RequireGuest>
        }
      />

      {/* User dashboard */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <UserLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="analyzer" element={<Analyzer />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<AnalysisResult />} />
        <Route path="insights" element={<SkillInsights />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="progress" element={<Progress />} />
        <Route path="simulator" element={<WhatIf />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin dashboard */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="resumes" element={<AdminResumes />} />
        <Route path="analyses" element={<AdminAnalyses />} />
        <Route path="skills" element={<AdminSkills />} />
        <Route path="resources" element={<AdminResources />} />
        <Route path="recommendations" element={<AdminRecommendations />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="ai-usage" element={<AdminAIUsage />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
