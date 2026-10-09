import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'
import { cx, timeAgo } from '../utils/helpers'
import { showBrowserNotification } from '../utils/browserNotify'

const NotificationContext = createContext(null)

const ICONS = {
  analysis: '📊',
  milestone: '🏆',
  admin: '📣',
  info: '💡',
  resume: '📄',
  system: '🔧',
  recommendation: '💎',
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const timerRef = useRef(null)
  const seenIdsRef = useRef(null) // null = first load (never popup old items)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [list, count] = await Promise.all([
        api.get('/notifications?limit=20'),
        api.get('/notifications/unread-count'),
      ])
      const notifs = list.data.notifications
      setNotifications(notifs)
      setUnread(count.data.count)

      // Native browser popups for brand-new notifications only
      if (seenIdsRef.current) {
        const fresh = notifs.filter((n) => !n.read && !seenIdsRef.current.has(n.id))
        fresh.forEach((n) => {
          seenIdsRef.current.add(n.id)
          showBrowserNotification(`Career Mirror AI — ${n.title}`, n.message, {
            onClick: () => window.focus(),
          })
        })
      } else {
        seenIdsRef.current = new Set(notifs.map((n) => n.id))
      }
    } catch (_) { /* ignore */ }
  }, [user])

  useEffect(() => {
    load()
    if (user) timerRef.current = setInterval(load, 60000)
    return () => clearInterval(timerRef.current)
  }, [user, load])

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnread((u) => Math.max(0, u - 1))
    } catch (_) { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch (_) { /* ignore */ }
  }

  return (
    <NotificationContext.Provider value={{ notifications, unread, refresh: load, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)

/** Topbar notification bell + dropdown panel. */
export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button className="icon-btn" aria-label={`Notifications (${unread} unread)`} onClick={() => setOpen((o) => !o)}>
        <Bell />
        {unread > 0 && <span className="ping">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="dropdown notif-panel" style={{ zIndex: 56 }}>
            <div className="flex-between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <b style={{ fontSize: 14 }}>Notifications</b>
              {unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.length === 0 && (
                <div className="empty-state" style={{ padding: 36 }}>
                  <p>No notifications yet.</p>
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cx('notif-item', !n.read && 'unread')}
                  onClick={() => {
                    if (!n.read) markRead(n.id)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={n.title}
                >
                  <div className="notif-icon">{ICONS[n.type] || ICONS.info}</div>
                  <div>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
