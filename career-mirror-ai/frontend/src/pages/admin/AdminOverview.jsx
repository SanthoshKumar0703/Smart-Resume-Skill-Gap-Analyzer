import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, FileSearch, ScanSearch, TrendingUp, Users } from 'lucide-react'
import { api } from '../../services/api'
import { Avatar, PageHead, SkeletonCard, StatCard } from '../../components/ui'
import { formatDate, timeAgo } from '../../utils/helpers'

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--ink)',
}

export default function AdminOverview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => setData(res.data)).catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="page-enter">
        <PageHead title="Overview" sub="Platform-wide career intelligence" />
        <div className="grid-4"><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>
        <div className="grid-2 mt-24"><SkeletonCard lines={5} /><SkeletonCard lines={5} /></div>
      </div>
    )
  }

  const s = data.stats

  return (
    <div className="page-enter">
      <PageHead title="Admin Overview" sub="Everything happening on the platform" />

      <div className="grid-4">
        <StatCard label="Total Users" value={s.total_users} icon={<Users size={20} />} sub={<>{s.active_users} active</>} />
        <StatCard label="Resumes Uploaded" value={s.total_resumes} icon={<ScanSearch size={20} />} tone="var(--violet)" />
        <StatCard label="Total Analyses" value={s.total_analyses} icon={<FileSearch size={20} />} tone="var(--success)" />
        <StatCard label="Avg Match Score" value={`${s.avg_match_score}%`} icon={<TrendingUp size={20} />} tone="var(--gold)" />
      </div>

      <div className="grid-2 mt-24">
        <div className="card card-pad">
          <div className="card-title mb-24"><TrendingUp size={16} /> User growth · 14 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.user_growth} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" name="New users" stroke="var(--accent)" strokeWidth={2.5} fill="url(#ug)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-24"><Activity size={16} /> Analysis volume · 14 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.analysis_volume} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--line-faint)' }} />
              <Bar dataKey="count" name="Analyses" fill="var(--violet)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2 mt-24">
        <div className="card card-pad">
          <div className="card-title mb-24">Match score distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.score_distribution} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--line-faint)' }} />
              <Bar dataKey="count" name="Analyses" radius={[5, 5, 0, 0]}>
                {data.score_distribution.map((d, i) => (
                  <Cell key={i} fill={i < 2 ? 'var(--danger)' : i === 2 ? 'var(--warn)' : i === 3 ? 'var(--accent-2)' : 'var(--success)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-24">Most common skill gaps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.top_missing_skills.slice(0, 8).map((g, i, arr) => (
              <div key={g.name}>
                <div className="flex-between small mb-6">
                  <b>{g.name}</b>
                  <span className="muted">{g.count}×</span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${(g.count / (arr[0]?.count || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
            {data.top_missing_skills.length === 0 && <p className="small muted">No analyses yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid-2 mt-24">
        <div className="card card-pad">
          <div className="card-title mb-24">Popular technologies on resumes</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.top_technologies} margin={{ top: 6, right: 6, left: -22, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="count" name="Resumes" stroke="var(--gold)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--gold)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-24">Most analyzed job roles</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.top_roles.map((r) => (
              <div key={r.title} className="timeline-item">
                <div className="tl-icon"><FileSearch size={15} /></div>
                <div style={{ flex: 1 }}>
                  <div className="tl-title">{r.title}</div>
                  <div className="tl-sub">{r.count} analyses</div>
                </div>
              </div>
            ))}
            {data.top_roles.length === 0 && <p className="small muted">No analyses yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid-2 mt-24">
        <div className="card card-pad">
          <div className="card-title mb-16">Recent users</div>
          {data.recent_users.map((u) => (
            <div key={u.id} className="timeline-item">
              <Avatar name={u.full_name} size="sm" />
              <div style={{ flex: 1 }}>
                <div className="tl-title">{u.full_name}</div>
                <div className="tl-sub">{u.email} · {u.role}</div>
              </div>
              <span className="small muted">{timeAgo(u.created_at)}</span>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <div className="card-header" style={{ padding: 0, marginBottom: 12 }}>
            <div className="card-title">Recent analyses</div>
            <Link to="/admin/analyses" className="btn btn-ghost btn-sm">All analyses</Link>
          </div>
          {data.recent_analyses.map((a) => (
            <div key={a.id} className="timeline-item">
              <div className="tl-icon"><FileSearch size={15} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tl-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.job_title}</div>
                <div className="tl-sub">{a.user_name || 'Unknown user'} · {formatDate(a.created_at)}</div>
              </div>
              <b style={{ color: a.overall_score >= 75 ? 'var(--success)' : 'var(--warn)', fontFamily: 'var(--font-mono)' }}>{Math.round(a.overall_score)}%</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
