import { useState } from 'react'
import { Bell, BellRing, Database, Globe, Info, ShieldCheck, Volume2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  browserPermission,
  browserNotifySupported,
  requestBrowserPermission,
  showBrowserNotification,
} from '../../utils/browserNotify'
import { Badge, PageHead } from '../../components/ui'
import ThemeSwitch from '../../components/ThemeSwitch'

export default function Settings() {
  const { user } = useAuth()
  const toast = useToast()
  const [notifPrefs, setNotifPrefs] = useState({
    analysis: true,
    milestone: true,
    admin: true,
  })
  const [perm, setPerm] = useState(browserPermission())

  const togglePref = (key) => {
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))
    toast.success('Preference saved')
  }

  const enableBrowserNotifs = async () => {
    const p = await requestBrowserPermission()
    setPerm(p)
    if (p === 'granted') {
      showBrowserNotification(
        'Notifications enabled 🔔',
        'You will now get browser popups when analyses finish, milestones are reached or admins announce something.'
      )
      toast.success('Browser notifications enabled')
    } else if (p === 'denied') {
      toast.error('Permission blocked', 'Allow notifications for this site in your browser settings, then try again.')
    } else {
      toast.error('Not supported', 'This browser does not support native notifications.')
    }
  }

  const sendTest = () => {
    const shown = showBrowserNotification('Test notification 🔔', 'Career Mirror AI browser popups are working!')
    if (shown) toast.success('Test popup sent')
    else toast.warn('Popup not shown', 'Enable browser notifications first (button above).')
  }

  const permMeta = {
    granted: { label: 'Enabled — popups will appear', kind: 'matched' },
    default: { label: 'Not enabled yet', kind: 'neutral' },
    denied: { label: 'Blocked in browser settings', kind: 'missing' },
    unsupported: { label: 'Unsupported in this browser', kind: 'neutral' },
  }[perm] || { label: 'Unknown', kind: 'neutral' }

  return (
    <div className="page-enter">
      <PageHead title="Settings" sub="Preferences for your Career Mirror AI experience" />

      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-title mb-16"><Bell size={16} /> Notification preferences</div>
          {[
            ['analysis', 'Analysis completed', 'When a resume vs job-description analysis finishes'],
            ['milestone', 'Learning milestones', 'When you complete a roadmap skill'],
            ['admin', 'Platform announcements', 'Messages from the administrator'],
          ].map(([key, title, sub]) => (
            <div key={key} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px dashed var(--line)' }}>
              <div>
                <b style={{ fontSize: 14 }}>{title}</b>
                <div className="small muted">{sub}</div>
              </div>
              <button
                role="switch"
                aria-checked={notifPrefs[key]}
                aria-label={`Toggle ${title}`}
                onClick={() => togglePref(key)}
                className="theme-switch"
                data-theme={notifPrefs[key] ? 'dark' : 'light'}
                style={{ width: 52, height: 28 }}
              >
                <span className="ts-knob" style={{ width: 21, height: 21, left: notifPrefs[key] ? 26 : 3 }} />
              </button>
            </div>
          ))}
          <p className="small muted mt-16">Notifications persist in your account and appear in the bell menu.</p>
        </div>

        <div>
          <div className="card card-pad">
            <div className="card-title mb-8"><BellRing size={16} /> Browser notifications</div>
            <p className="small muted mb-16">
              Native OS popups when your analysis finishes, you hit a learning milestone, or
              the administrator announces something — even while you're on another tab.
            </p>
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <span className="small">Permission status</span>
              <Badge kind={permMeta.kind} dot>{permMeta.label}</Badge>
            </div>
            <div className="flex" style={{ gap: 10, flexWrap: 'wrap' }}>
              {perm !== 'granted' && (
                <button className="btn btn-royal btn-sm" onClick={enableBrowserNotifs}>
                  <Bell size={14} /> Enable popups
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={sendTest} disabled={perm !== 'granted'}>
                <Volume2 size={14} /> Send test popup
              </button>
            </div>
            {perm === 'denied' && (
              <p className="small muted mt-8">
                Click the lock icon in your browser's address bar → Site settings →
                Notifications → Allow, then refresh this page.
              </p>
            )}
          </div>

          <div className="card card-pad mt-24">
            <div className="card-title mb-16"><Globe size={16} /> Appearance</div>
            <div className="flex-between">
              <div>
                <b style={{ fontSize: 14 }}>Theme</b>
                <div className="small muted">Light (ivory & emerald) or dark (midnight & violet)</div>
              </div>
              <ThemeSwitch />
            </div>
            <hr className="divider" />
            <div className="flex-between">
              <div>
                <b style={{ fontSize: 14 }}>Interface language</b>
                <div className="small muted">English (default)</div>
              </div>
              <select className="input" style={{ width: 140 }} defaultValue="en">
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="card card-pad mt-24">
            <div className="card-title mb-16"><Database size={16} /> Data & privacy</div>
            <div className="flex" style={{ gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
              <span className="small">Your resumes are processed locally — never sent to third-party AI.</span>
            </div>
            <div className="flex" style={{ gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <Info size={16} style={{ color: 'var(--accent-2)' }} />
              <span className="small">Delete any analysis, resume or your whole account anytime.</span>
            </div>
            <hr className="divider" />
            <div className="flex-between">
              <div>
                <b style={{ fontSize: 14 }}>Account role</b>
                <div className="small muted">Current access level</div>
              </div>
              <Badge kind={user?.role === 'admin' ? 'violet' : 'accent'}>{user?.role === 'admin' ? 'Admin' : 'User'}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
