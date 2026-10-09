import { useCallback, useEffect, useState } from 'react'
import { Bell, Megaphone, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, Modal, PageHead, Skeleton } from '../../components/ui'
import { formatDateTime, timeAgo } from '../../utils/helpers'

export default function AdminNotifications() {
  const toast = useToast()
  const [notifications, setNotifications] = useState(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'admin' })
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const res = await api.get('/admin/notifications?limit=100')
    setNotifications(res.data.notifications)
  }, [])

  useEffect(() => {
    load().catch(() => setNotifications([]))
  }, [load])

  const filtered = (notifications || []).filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase())
  )

  const broadcast = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message are required'); return }
    setSending(true)
    try {
      const res = await api.post('/admin/notifications', { title: form.title, message: form.message, type: form.type })
      toast.success('Broadcast sent', res.data.message)
      setOpen(false)
      setForm({ title: '', message: '', type: 'admin' })
      load()
    } catch (err) { toast.error('Send failed', errMsg(err)) } finally { setSending(false) }
  }

  const remove = async (n) => {
    try {
      await api.delete(`/admin/notifications/${n.id}`)
      setNotifications((list) => list.filter((x) => x.id !== n.id))
      toast.success('Notification deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead
        title="Notifications"
        sub="All notifications sent on the platform"
        actions={<button className="btn btn-royal btn-sm" onClick={() => setOpen(true)}><Megaphone size={15} /> Broadcast</button>}
      />
      <div className="card card-pad mb-24">
        <div className="field" style={{ marginBottom: 0, maxWidth: 420 }}>
          <label htmlFor="n-search">Search</label>
          <div className="input-wrap">
            <Search size={15} />
            <input id="n-search" className="input" placeholder="Title or message…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {notifications === null ? (
        <Skeleton height={220} />
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><Bell size={26} /><p>No notifications found.</p></div></div>
      ) : (
        <div className="card card-pad">
          {filtered.slice(0, 60).map((n) => (
            <div key={n.id} className="notif-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="notif-icon">{n.type === 'admin' ? '📣' : n.type === 'analysis' ? '📊' : n.type === 'milestone' ? '🏆' : '💡'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">to user {n.user_id?.slice(0, 8)}… · {timeAgo(n.created_at)} · {formatDateTime(n.created_at)}</div>
              </div>
              <div className="flex" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <Badge kind={n.read ? 'neutral' : 'accent'}>{n.read ? 'read' : 'unread'}</Badge>
                <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => remove(n)} title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Broadcast notification"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-royal" onClick={broadcast} disabled={sending}>{sending ? 'Sending…' : 'Broadcast to all users'}</button>
        </>}
      >
        <div className="field"><label>Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field"><label>Message *</label><textarea className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
        <div className="field">
          <label>Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="admin">Announcement</option>
            <option value="info">Info</option>
            <option value="recommendation">Recommendation</option>
          </select>
        </div>
        <p className="small muted">The notification appears in every user's bell with an unread badge.</p>
      </Modal>
    </div>
  )
}
