import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, BookOpen, CheckCircle2, FileSearch, History, PlusCircle, ScanSearch, Sparkles, TrendingUp, XCircle } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Badge, EmptyState, PageHead, ScoreRing, SkeletonCard, StatCard } from '../../components/ui'
import { formatDate, timeAgo } from '../../utils/helpers'

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--ink)',
}

export default function Overview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.get('/analysis?limit=200'),
      api.get('/learning/roadmap'),
      api.get('/notifications/unread-count'),
    ])
      .then(([analysesRes, roadmapRes]) => {
        if (!alive) return
        setData({
          analyses: analysesRes.data.analyses,
          roadmap: roadmapRes.data,
        })
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const analyses = data.analyses
    const total = analyses.length
    const avg = total ? analyses.reduce((s, a) => s + a.overall_score, 0) / total : 0
    const latest = analyses[0] || null
    const allMatched = new Set()
    const allMissing = new Set()
    const trend = analyses.slice().reverse().map((a) => ({
      date: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Math.round(a.overall_score),
    }))
    const skillDist = { matched: 0, partial: 0, missing: 0 }
    const gapCats = {}
    analyses.forEach((a) => {
      a.matched_skills?.forEach((m) => allMatched.add(m.name))
      a.missing_skills?.forEach((m) => {
        allMissing.add(m.name)
        gapCats[m.category || 'Other'] = (gapCats[m.category || 'Other'] || 0) + 1
      })
      skillDist.matched += a.skill_stats?.matched || 0
      skillDist.partial += a.skill_stats?.partial || 0
      skillDist.missing += a.skill_stats?.missing || 0
    })
    const gapData = Object.entries(gapCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
    const progress = data.roadmap?.summary || { progress_pct: 0, completed: 0, total_steps: 0 }
    return { total, avg, latest, allMatched, allMissing, trend, skillDist, gapData, progress, analyses }
  }, [data])

  if (loading) {
    return (
      <div className="page-enter">
        <PageHead title="Overview" sub="Your career intelligence at a glance" />
        <div className="grid-4">
          <SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} />
        </div>
        <div className="grid-2 mt-24"><SkeletonCard lines={5} /><SkeletonCard lines={5} /></div>
      </div>
    )
  }

  if (!stats) return null
  const noData = stats.total === 0

  return (
    <div className="page-enter">
      <PageHead
        title={`Good to see you, ${user?.full_name?.split(' ')[0] || 'there'} 👋`}
        sub="Here's where your career stands — and what to do next."
        actions={
          <Link to="/app/analyzer" className="btn btn-royal">
            <ScanSearch size={16} /> New Analysis
          </Link>
        }
      />

      <div className="grid-4">
        <StatCard label="Total Analyses" value={stats.total} icon={<FileSearch size={20} />} sub={stats.total ? `latest ${timeAgo(stats.latest?.created_at)}` : undefined} />
        <StatCard label="Average Match" value={`${Math.round(stats.avg)}%`} icon={<TrendingUp size={20} />} tone="var(--violet)" sub={stats.total ? 'across all analyses' : undefined} />
        <StatCard label="Strong Skills" value={stats.allMatched.size} icon={<CheckCircle2 size={20} />} tone="var(--success)" sub="confirmed strengths" />
        <StatCard label="Missing Skills" value={stats.allMissing.size} icon={<XCircle size={20} />} tone="var(--danger)" sub="to close via roadmap" />
      </div>

      {noData ? (
        <div className="card mt-24" style={{ borderStyle: 'dashed' }}>
          <EmptyState
            icon={<ScanSearch size={26} />}
            title="Run your first analysis"
            message="Upload a resume, paste a target job description, and Career Mirror AI will show you your compatibility score and every gap to close."
            action={<button className="btn btn-royal" onClick={() => navigate('/app/analyzer')}><PlusCircle size={16} /> Analyze my resume</button>}
          />
        </div>
      ) : (
        <>
          {/* Latest analysis + learning progress */}
          <div className="grid-2 mt-24">
            <div className="card card-pad">
              <div className="card-header" style={{ padding: 0, marginBottom: 18 }}>
                <div>
                  <div className="card-title"><Sparkles size={16} /> Latest Analysis</div>
                  <div className="card-sub">{stats.latest?.job_title} · {formatDate(stats.latest?.created_at)}</div>
                </div>
                <Link to={`/app/history/${stats.latest.id}`} className="btn btn-outline btn-sm">View <ArrowRight size={14} /></Link>
              </div>
              <div className="flex" style={{ gap: 24 }}>
                <ScoreRing value={stats.latest.overall_score} size={120} stroke={10} label="Match" />
                <div style={{ flex: 1 }}>
                  <div className="flex-between small mb-16">
                    <span className="muted">Matched</span>
                    <b style={{ color: 'var(--success)' }}>{stats.latest.skill_stats?.matched ?? 0}</b>
                  </div>
                  <div className="flex-between small mb-16">
                    <span className="muted">Partial</span>
                    <b style={{ color: 'var(--warn)' }}>{stats.latest.skill_stats?.partial ?? 0}</b>
                  </div>
                  <div className="flex-between small">
                    <span className="muted">Missing</span>
                    <b style={{ color: 'var(--danger)' }}>{stats.latest.skill_stats?.missing ?? 0}</b>
                  </div>
                  <hr className="divider" />
                  <div className="flex-between small">
                    <span className="muted">Learning progress</span>
                    <b>{stats.progress.progress_pct}%</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="card-header" style={{ padding: 0, marginBottom: 18 }}>
                <div>
                  <div className="card-title"><BookOpen size={16} /> Learning Progress</div>
                  <div className="card-sub">{stats.progress.completed} of {stats.progress.total_steps} roadmap steps done</div>
                </div>
                <Link to="/app/roadmap" className="btn btn-outline btn-sm">Roadmap <ArrowRight size={14} /></Link>
              </div>
              {stats.progress.total_steps === 0 ? (
                <p className="small muted">Complete an analysis to generate your personalized roadmap.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 22 }}>
                    <div className="flex-between small mb-8"><span className="muted">Overall</span><b>{stats.progress.progress_pct}%</b></div>
                    <div className="progress"><div className="progress-fill" style={{ width: `${stats.progress.progress_pct}%` }} /></div>
                  </div>
                  <div className="flex" style={{ justifyContent: 'space-between' }}>
                    {[['Completed', stats.progress.completed, 'var(--success)'], ['In progress', stats.progress.in_progress, 'var(--warn)'], ['Hours done', stats.progress.hours_done, 'var(--violet)']].map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                        <div className="small muted">{l}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid-2 mt-24">
            <div className="card card-pad">
              <div className="card-title mb-24"><TrendingUp size={16} /> Match Score Trend</div>
              {stats.trend.length < 2 ? (
                <p className="small muted">Run more analyses to see your trend.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.trend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Match']} />
                    <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} fill="url(#scoreGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-title mb-24">Skill Distribution</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[
                    { name: 'Matched', value: stats.skillDist.matched, color: 'var(--success)' },
                    { name: 'Partial', value: stats.skillDist.partial, color: 'var(--warn)' },
                    { name: 'Missing', value: stats.skillDist.missing, color: 'var(--danger)' },
                  ]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                    {[{ name: 'Matched', value: stats.skillDist.matched, color: 'var(--success)' }, { name: 'Partial', value: stats.skillDist.partial, color: 'var(--warn)' }, { name: 'Missing', value: stats.skillDist.missing, color: 'var(--danger)' }].map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex" style={{ justifyContent: 'center', gap: 18 }}>
                <Badge kind="matched" dot>Matched {stats.skillDist.matched}</Badge>
                <Badge kind="partial" dot>Partial {stats.skillDist.partial}</Badge>
                <Badge kind="missing" dot>Missing {stats.skillDist.missing}</Badge>
              </div>
            </div>
          </div>

          <div className="grid-2 mt-24">
            <div className="card card-pad">
              <div className="card-title mb-24">Skill Gap Categories</div>
              {stats.gapData.length === 0 ? (
                <p className="small muted">No gaps recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.gapData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-14} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--line-faint)' }} />
                    <Bar dataKey="value" name="Gaps" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-header" style={{ padding: 0, marginBottom: 14 }}>
                <div className="card-title"><History size={16} /> Recent Analyses</div>
                <Link to="/app/history" className="btn btn-ghost btn-sm">All history <ArrowRight size={13} /></Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {stats.analyses.slice(0, 5).map((a) => (
                  <Link key={a.id} to={`/app/history/${a.id}`} className="timeline-item" style={{ textDecoration: 'none' }}>
                    <div className="tl-icon"><FileSearch size={15} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tl-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.job_title}</div>
                      <div className="tl-sub">{formatDate(a.created_at)} · {a.skill_stats?.matched ?? 0} matched · {a.skill_stats?.missing ?? 0} gaps</div>
                    </div>
                    <b style={{ color: a.overall_score >= 75 ? 'var(--success)' : a.overall_score >= 50 ? 'var(--warn)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(a.overall_score)}%
                    </b>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
