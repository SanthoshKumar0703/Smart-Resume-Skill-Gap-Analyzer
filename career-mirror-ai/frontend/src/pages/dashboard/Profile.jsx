import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, CalendarDays, KeyRound, Loader2, Mail, Save, Shield, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Avatar, PageHead, SkeletonCard } from '../../components/ui'
import { formatDate } from '../../utils/helpers'

export default function Profile() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState(null)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/analysis?limit=200'), api.get('/learning/roadmap')])
      .then(([a, r]) => setStats({
        analyses: a.data.analyses.length,
        avg: a.data.analyses.length ? Math.round(a.data.analyses.reduce((s, x) => s + x.overall_score, 0) / a.data.analyses.length) : 0,
        roadmapPct: r.data.summary?.progress_pct ?? 0,
        skills: new Set(a.data.analyses.flatMap((x) => (x.matched_skills || []).map((m) => m.name))).size,
      }))
      .catch(() => {})
  }, [])

  const saveName = async () => {
    if (name.trim().length < 2) { toast.error('Name too short'); return }
    setSaving(true)
    try {
      await api.put('/profile', { full_name: name.trim() })
      const me = await api.get('/auth/me')
      localStorage.setItem('careermirror_user', JSON.stringify(me.data))
      toast.success('Profile updated')
      window.location.reload()
    } catch (err) {
      toast.error('Could not save', errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) { toast.error('Passwords do not match'); return }
    if (pw.next.length < 8) { toast.error('New password must be at least 8 characters'); return }
    setPwSaving(true)
    try {
      await api.put('/profile/password', { current_password: pw.current, new_password: pw.next })
      toast.success('Password changed', 'Use your new password next time.')
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error('Could not change password', errMsg(err))
    } finally {
      setPwSaving(false)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('Delete your account and all your data? This cannot be undone.')) return
    try {
      await api.delete('/profile')
      toast.success('Account deleted')
      logout()
      navigate('/')
    } catch (err) {
      toast.error('Could not delete account', errMsg(err))
    }
  }

  if (!user) return null

  return (
    <div className="page-enter">
      <PageHead title="Profile" sub="Manage your personal information" />

      <div className="grid-2">
        <div>
          <div className="card profile-head mb-24">
            <Avatar name={user.full_name} size="lg" src={user.avatar} />
            <div className="profile-meta">
              <h2>{user.full_name}</h2>
              <div className="p-email">{user.email}</div>
              <div className="flex mt-8" style={{ gap: 8 }}>
                <span className="badge badge-accent"><BadgeCheck size={11} /> {user.role === 'admin' ? 'Administrator' : 'Job Seeker'}</span>
                <span className="badge badge-neutral"><CalendarDays size={11} /> Joined {formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[['Analyses', stats.analyses], ['Avg match', `${stats.avg}%`], ['Roadmap', `${stats.roadmapPct}%`], ['Confirmed skills', stats.skills]].map(([l, v]) => (
                <div key={l} className="card card-pad" style={{ padding: 16, textAlign: 'center' }}>
                  <div className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{v}</div>
                  <div className="small muted">{l}</div>
                </div>
              ))}
            </div>
          )}

          <div className="card card-pad mt-24">
            <div className="card-title mb-16"><Mail size={16} /> Personal details</div>
            <div className="field">
              <label htmlFor="p-name">Full name</label>
              <div className="flex" style={{ gap: 10 }}>
                <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn btn-royal" onClick={saveName} disabled={saving}>
                  {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save
                </button>
              </div>
            </div>
            <div className="field">
              <label>Email address</label>
              <input className="input" value={user.email} disabled />
              <span className="field-hint">Email is your login identifier and cannot be changed.</span>
            </div>
            <div className="field">
              <label>Google account</label>
              <input className="input" value={user.google_id ? 'Linked to Google' : 'Not linked'} disabled />
            </div>
          </div>
        </div>

        <div>
          <div className="card card-pad">
            <div className="card-title mb-16"><KeyRound size={16} /> Change password</div>
            <form onSubmit={changePassword}>
              <div className="field">
                <label htmlFor="pw-current">Current password</label>
                <input id="pw-current" className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pw-next">New password</label>
                <input id="pw-next" className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pw-confirm">Confirm new password</label>
                <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
              <button className="btn btn-royal btn-block" type="submit" disabled={pwSaving}>
                {pwSaving ? <Loader2 size={15} className="spin" /> : <KeyRound size={15} />} Update password
              </button>
            </form>
          </div>

          <div className="card card-pad mt-24" style={{ borderColor: 'var(--danger)' }}>
            <div className="card-title mb-8" style={{ color: 'var(--danger)' }}><Trash2 size={16} /> Danger zone</div>
            <p className="small muted mb-16">
              Deleting your account permanently removes your profile, resumes, analyses and learning progress. This cannot be undone.
            </p>
            <button className="btn btn-danger" onClick={deleteAccount}><Trash2 size={14} /> Delete my account</button>
          </div>
        </div>
      </div>
    </div>
  )
}
