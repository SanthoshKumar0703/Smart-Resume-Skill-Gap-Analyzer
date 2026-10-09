import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Bot,
  GitBranch,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanSearch,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NotificationBell } from '../context/NotificationContext'
import { Avatar } from '../components/ui'
import ThemeSwitch from '../components/ThemeSwitch'
import { BrandMark } from '../components/Logo'
import { cx, initials } from '../utils/helpers'

const NAV = [
  { group: 'Career' },
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/analyzer', label: 'Resume Analyzer', icon: ScanSearch },
  { to: '/app/history', label: 'Analysis History', icon: History },
  { to: '/app/insights', label: 'Skill Insights', icon: BarChart3 },
  { group: 'Growth' },
  { to: '/app/roadmap', label: 'Learning Roadmap', icon: GitBranch },
  { to: '/app/progress', label: 'Progress', icon: TrendingUp },
  { to: '/app/simulator', label: 'What-If Simulator', icon: Target },
  { to: '/app/assistant', label: 'AI Career Assistant', icon: Bot },
  { group: 'Account' },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function UserLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <a href="/" aria-label="Career Mirror AI - home" style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
            <BrandMark size={40} />
            <span className="brand-text">
              <b>Career Mirror AI</b>
              <span>Skill Gap Analyzer</span>
            </span>
          </a>
          <button className="input-toggle sidebar-toggle-btn" style={{ marginLeft: 'auto' }} onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item, i) =>
            item.group ? (
              <div key={item.group} className="nav-group-label">{item.group}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cx('nav-item', isActive && 'active')}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon />
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-mini">
            <Avatar name={user?.full_name} size="md" src={user?.avatar} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="u-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name}</div>
              <div className="u-role">{user?.role === 'admin' ? 'Administrator' : 'Job Seeker'}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Log out" aria-label="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn sidebar-toggle-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div>
            <div className="page-title">Career Intelligence</div>
            <div className="page-sub">Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋</div>
          </div>
          <div className="topbar-spacer" />
          {user?.role === 'admin' && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>
              <Sparkles size={14} /> Admin
            </button>
          )}
          <NotificationBell />
          <ThemeSwitch />
          <button className="icon-btn" onClick={() => navigate('/app/profile')} aria-label="Profile" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'none' }}>
            <Avatar name={user?.full_name} size="md" src={user?.avatar} />
          </button>
        </header>

        <motion.main
          className="app-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}
