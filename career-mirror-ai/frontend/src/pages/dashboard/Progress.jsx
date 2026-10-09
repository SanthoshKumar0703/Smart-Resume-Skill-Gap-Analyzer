import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BookOpen, GitBranch, TrendingUp } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, PageHead, Progress, SkeletonCard } from '../../components/ui'

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--ink)',
}

export default function ProgressPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/learning/roadmap')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const statusData = useMemo(() => {
    if (!data) return []
    const counts = { completed: 0, practicing: 0, learning: 0, not_started: 0 }
    data.steps.forEach((s) => { counts[s.status] += 1 })
    return [
      { name: 'Completed', value: counts.completed, color: 'var(--success)' },
      { name: 'Practicing', value: counts.practicing, color: 'var(--accent-2)' },
      { name: 'Learning', value: counts.learning, color: 'var(--warn)' },
      { name: 'Not started', value: counts.not_started, color: 'var(--ink-4)' },
    ].filter((d) => d.value > 0)
  }, [data])

  if (loading) {
    return (
      <div className="page-enter">
        <PageHead title="Progress" sub="How your learning is moving" />
        <div className="grid-2"><SkeletonCard lines={5} /><SkeletonCard lines={5} /></div>
      </div>
    )
  }

  if (!data || data.steps.length === 0) {
    return (
      <div className="page-enter">
        <PageHead title="Progress" sub="How your learning is moving" />
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <EmptyState icon={<GitBranch size={26} />} title="Nothing to track yet" message="Generate a learning roadmap first — progress tracking works per roadmap step." action={<Link to="/app/analyzer" className="btn btn-royal btn-sm">Build my roadmap</Link>} />
        </div>
      </div>
    )
  }

  const s = data.summary

  return (
    <div className="page-enter">
      <PageHead
        title="Progress Tracking"
        sub="Every completed skill updates your profile — and your next analysis score"
        actions={<Link to="/app/roadmap" className="btn btn-outline btn-sm"><BookOpen size={14} /> Open roadmap</Link>}
      />

      <div className="grid-4">
        {[
          ['Overall progress', `${s.progress_pct}%`, 'var(--success)'],
          ['Steps completed', `${s.completed}/${s.total_steps}`, 'var(--accent)'],
          ['Hours invested', `~${s.hours_done}h`, 'var(--violet)'],
          ['Remaining effort', `~${Math.max(0, s.total_hours - s.hours_done)}h`, 'var(--warn)'],
        ].map(([label, value, color]) => (
          <div key={label} className="card stat-card" style={{ '--stat-glow': `${color}22` }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mt-24">
        <div className="card card-pad">
          <div className="card-title mb-24"><TrendingUp size={16} /> Status distribution</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex" style={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {statusData.map((d) => <Badge key={d.name} kind="neutral" dot>{d.name} · {d.value}</Badge>)}
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-24">Skill-level progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.steps.map((step) => {
              const pct = { not_started: 0, learning: 33, practicing: 66, completed: 100 }[step.status]
              return (
                <div key={step.skill}>
                  <div className="flex-between small mb-8">
                    <b>{step.skill}</b>
                    <span className="muted">{step.status.replace('_', ' ')}</span>
                  </div>
                  <Progress value={pct} color={step.status === 'completed' ? 'emerald' : ''} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card card-pad mt-24">
        <div className="card-title mb-24">Estimated time per roadmap step</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.steps} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="skill" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-14} textAnchor="end" height={52} />
            <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--line-faint)' }} />
            <Bar dataKey="effort_hours" name="Hours" radius={[6, 6, 0, 0]}>
              {data.steps.map((st, i) => <Cell key={i} fill={st.status === 'completed' ? 'var(--success)' : 'var(--accent)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
