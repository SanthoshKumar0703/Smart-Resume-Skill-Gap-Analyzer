import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, Award, BarChart3, CheckCircle2, Sparkles, XCircle } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, PageHead, SkeletonCard, SkillChips } from '../../components/ui'

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--ink)',
}

export default function SkillInsights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api
      .get('/analysis?limit=100')
      .then((res) => alive && setData(res.data.analyses))
      .catch(() => alive && setData([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const insights = useMemo(() => {
    if (!data || data.length === 0) return null
    const freq = new Map()
    const gapFreq = new Map()
    const catFreq = new Map()
    data.forEach((a) => {
      a.matched_skills?.forEach((m) => {
        const e = freq.get(m.name) || { count: 0, importance: m.importance, category: m.category }
        e.count += 1
        freq.set(m.name, e)
      })
      a.missing_skills?.forEach((m) => {
        gapFreq.set(m.name, (gapFreq.get(m.name) || 0) + 1)
        catFreq.set(m.category || 'Other', (catFreq.get(m.category || 'Other') || 0) + 1)
      })
    })
    const strong = [...freq.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 14)
    const gaps = [...gapFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    const cats = [...catFreq.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
    return { strong, gaps, cats, total: data.length }
  }, [data])

  if (loading) {
    return (
      <div className="page-enter">
        <PageHead title="Skill Insights" sub="Your strengths and gaps across every analysis" />
        <div className="grid-2"><SkeletonCard lines={6} /><SkeletonCard lines={6} /></div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="page-enter">
        <PageHead title="Skill Insights" sub="Your strengths and gaps across every analysis" />
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <EmptyState icon={<BarChart3 size={26} />} title="No insights yet" message="Run at least one analysis to unlock skill intelligence." action={<Link to="/app/analyzer" className="btn btn-royal btn-sm">Analyze a resume</Link>} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <PageHead title="Skill Insights" sub={`Aggregated from ${insights.total} analysis(es) across all your target roles`} />

      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-title mb-16"><Award size={16} /> Your strongest skills</div>
          <SkillChips skills={insights.strong.map(([name]) => name)} kind="matched" limit={30} />
          <hr className="divider" />
          <p className="small muted">
            Skills matched most often across your analyses. Lead your resume and interviews with these.
          </p>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-16"><XCircle size={16} /> Most common gaps</div>
          <SkillChips skills={insights.gaps.map(([name]) => name)} kind="missing" limit={30} />
          <hr className="divider" />
          <p className="small muted">
            Skills missing most often across your target roles. These are your highest-ROI learning targets.
          </p>
        </div>
      </div>

      <div className="card card-pad mt-24">
        <div className="card-title mb-24"><BarChart3 size={16} /> Gap frequency by category</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={insights.cats} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={56} />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--line-faint)' }} />
            <Bar dataKey="value" name="Gap mentions" fill="var(--violet)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card card-pad mt-24">
        <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
          <div>
            <div className="card-title"><Sparkles size={16} /> What to do next</div>
            <div className="card-sub">Based on your aggregate gap frequency</div>
          </div>
          <Link to="/app/roadmap" className="btn btn-outline btn-sm">Learning roadmap <ArrowUpRight size={14} /></Link>
        </div>
        <div className="flex" style={{ gap: 10, flexWrap: 'wrap' }}>
          {insights.gaps.slice(0, 6).map(([name, count]) => (
            <Badge key={name} kind="accent"><CheckCircle2 size={11} /> {name} · {count}×</Badge>
          ))}
        </div>
        <p className="small muted mt-16">
          Close your most frequent gaps first — the What-If Simulator shows the exact score impact of each one.
        </p>
      </div>
    </div>
  )
}
