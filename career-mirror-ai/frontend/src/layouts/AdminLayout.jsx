import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NotificationBell } from '../context/NotificationContext'
import { Avatar } from '../components/ui'
import ThemeSwitch from '../components/ThemeSwitch'
import { BrandMark } from '../components/Logo'
import { cx } from '../utils/helpers'

const NAV = [
  { group: 'Administration' },
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/resumes', label: 'Resumes', icon: FileText },
  { to: '/admin/analyses', label: 'Analyses', icon: BarChart3 },
  { group: 'Knowledge Base' },
  { to: '/admin/skills', label: 'Skills', icon: Activity },
  { to: '/admin/resources', label: 'Learning Resources', icon: BookOpen },
  { to: '/admin/recommendations', label: 'Recommendations', icon: MessageSquareText },
  { group: 'System' },
  { to: '/admin/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/admin/ai-usage', label: 'AI Usage', icon: Bot },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
  { group: 'Account' },
  { to: '/admin/profile', label: 'Profile', icon: User },
]

function BellIcon(props) {
  return <span {...props}>🔔</span>
}

export function AdminLayout() {
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
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-brand">
          <a href="/" aria-label="Career Mirror AI - home" style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
            <BrandMark size={40} />
            <span className="brand-text">
              <b>Career Mirror AI</b>
              <span style={{ color: 'var(--violet)' }}>Admin Console</span>
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
              <div className="u-role" style={{ color: 'var(--violet)', fontWeight: 700 }}>Administrator</div>
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
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} color="var(--violet)" /> Admin Console
            </div>
            <div className="page-sub">Platform operations & intelligence</div>
          </div>
          <div className="topbar-spacer" />
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/app')}>
            <Sparkles size={14} /> User view
          </button>
          <NotificationBell />
          <ThemeSwitch />
          <button className="icon-btn" onClick={() => navigate('/admin/profile')} aria-label="Profile" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'none' }}>
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
