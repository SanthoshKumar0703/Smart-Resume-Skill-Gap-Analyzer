import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  ListChecks,
  PlayCircle,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wrench,
  XCircle,
} from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, EmptyState, PageHead, Progress, ScoreRing, SkillChips, Spinner } from '../../components/ui'
import { cx, formatDateTime } from '../../utils/helpers'

export default function AnalysisResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api
      .get(`/analysis/${id}`)
      .then((res) => alive && setAnalysis(res.data))
      .catch((err) => alive && setError(errMsg(err)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id])

  const del = async () => {
    if (!window.confirm('Delete this analysis permanently?')) return
    try {
      await api.delete(`/analysis/${id}`)
      toast.success('Analysis deleted')
      navigate('/app/history')
    } catch (err) {
      toast.error('Could not delete', errMsg(err))
    }
  }

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner size={34} />
          <p className="small muted mt-16">Loading analysis…</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="page-enter">
        <PageHead title="Analysis" sub="Something went wrong" actions={<Link to="/app/history" className="btn btn-outline btn-sm"><ArrowLeft size={14} /> Back to history</Link>} />
        <div className="card"><EmptyState icon={<XCircle size={26} />} title="Analysis not found" message={error} action={<Link to="/app/history" className="btn btn-royal btn-sm">Go to history</Link>} /></div>
      </div>
    )
  }

  const a = analysis
  const missing = a.missing_skills || []
  const partial = a.partial_skills || []
  const matched = a.matched_skills || []

  return (
    <div className="page-enter">
      <div className="flex-between mb-24">
        <Link to="/app/history" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
          <ArrowLeft size={15} /> History
        </Link>
        <div className="flex">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/simulator', { state: { analysisId: a.id } })}>
            <Target size={14} /> What-if simulator
          </button>
          <button className="btn btn-danger btn-sm" onClick={del}><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      {/* Hero */}
      <div className="result-hero">
        <ScoreRing value={a.overall_score} size={168} stroke={13} label="Career match" />
        <div>
          <div className="eyebrow mb-8">{formatDateTime(a.created_at)} · {location.state?.fresh ? 'fresh analysis' : 'saved analysis'}</div>
          <h1 className="display-md">{a.job_title}</h1>
          <p className="lead mt-8">
            {a.skill_stats.matched} matched · {a.skill_stats.partial} partial · {a.skill_stats.missing} missing
            — from {(a.candidate_profile?.years_of_experience || 0)} years of experience
          </p>
          <div className="flex mt-16" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Badge kind="accent"><Sparkles size={11} /> {a.skill_match}% skill match</Badge>
            <Badge kind="violet"><Briefcase size={11} /> {a.experience_match}% experience</Badge>
            <Badge kind="gold"><GraduationCap size={11} /> {a.education_match}% education</Badge>
            <Badge kind="info"><Layers size={11} /> {a.project_match}% projects</Badge>
          </div>
        </div>
      </div>

      {/* Factor metrics */}
      <div className="result-metrics">
        {a.breakdown?.map((b) => (
          <div key={b.key} className="metric-tile">
            <div className="m-label">{b.factor}</div>
            <div className="m-value" style={{ color: b.score >= 70 ? 'var(--success)' : b.score >= 40 ? 'var(--warn)' : 'var(--danger)' }}>
              {Math.round(b.score)}%
            </div>
            <div className="small muted" style={{ fontSize: 11 }}>weight {Math.round(b.weight * 100)}% · {b.weighted.toFixed(0)} pts</div>
          </div>
        ))}
      </div>

      {/* Weighted breakdown */}
      <div className="card card-pad mt-24">
        <div className="card-title mb-16"><ListChecks size={16} /> Why this score — weighted breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {a.breakdown?.map((b) => (
            <div key={b.key}>
              <div className="flex-between small mb-8">
                <b>{b.factor}</b>
                <span className="muted">{b.details}</span>
              </div>
              <Progress value={b.score} color={b.score >= 70 ? 'emerald' : b.score >= 40 ? '' : ''} />
            </div>
          ))}
        </div>
      </div>

      {/* Skills sections */}
      <div className="skill-section-title" style={{ color: 'var(--success)' }}>
        <CheckCircle2 /> Strong match ({matched.length})
      </div>
      <SkillChips skills={matched.map((m) => m.name)} kind="matched" limit={60} />

      {partial.length > 0 && (
        <>
          <div className="skill-section-title" style={{ color: 'var(--warn)' }}>
            <TrendingUp /> Partial match ({partial.length}) — close these easily
          </div>
          <div className="grid-3">
            {partial.map((p) => (
              <div key={p.name} className="gap-card">
                <div className="g-top">
                  <h4>{p.name}</h4>
                  <Badge kind="partial">Partial</Badge>
                </div>
                <p className="g-why">{p.reason}</p>
                <div className="g-reco">
                  Deepen from <b>{p.candidate_skill}</b> to production-grade {p.name} with one solid project.
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {missing.length > 0 && (
        <>
          <div className="skill-section-title" style={{ color: 'var(--danger)' }}>
            <XCircle /> Skill gaps ({missing.length}) — where to focus
          </div>
          <div className="grid-2">
            {missing.map((m) => (
              <div key={m.name} className="gap-card">
                <div className="g-top">
                  <h4>{m.name}</h4>
                  <div className="flex" style={{ gap: 7 }}>
                    <Badge kind={m.importance === 'high' ? 'missing' : 'neutral'}>
                      {m.importance === 'high' ? 'High priority' : 'Medium priority'}
                    </Badge>
                    <Badge kind="neutral"><Clock size={11} /> ~{m.effort_hours}h</Badge>
                  </div>
                </div>
                <p className="g-why">{m.why}</p>
                <div className="g-reco"><b>Recommended:</b> {m.recommendation}</div>
                {m.practice && (
                  <p className="small muted" style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <PlayCircle size={14} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                    {m.practice}
                  </p>
                )}
                {(m.resources || []).slice(0, 3).map((r, i) => (
                  <a key={i} className="resource-link" href={r.url} target="_blank" rel="noreferrer">
                    <BookOpen size={13} /> {r.title} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recommendations */}
      <div className="skill-section-title"><Sparkles size={18} /> Personalized recommendations</div>
      <div className="grid-2">
        {a.recommendations?.map((r, i) => (
          <div key={i} className="card card-pad card-hover">
            <div className="flex-between mb-8">
              <Badge kind={r.priority === 'High' ? 'missing' : 'partial'}>{r.priority} priority</Badge>
              <span className="badge badge-neutral">{r.category}</span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 15, marginBottom: 6 }}>{r.title}</h4>
            <p className="small" style={{ color: 'var(--ink-2)' }}>{r.description}</p>
            {r.action && <div className="g-reco mt-8" style={{ fontSize: 13 }}>{r.action}</div>}
            {r.practice_task && (
              <p className="small muted mt-8" style={{ display: 'flex', gap: 7 }}>
                <Wrench size={13} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} /> {r.practice_task}
              </p>
            )}
            {r.project_idea && (
              <p className="small muted mt-8" style={{ display: 'flex', gap: 7 }}>
                <Target size={13} style={{ color: 'var(--violet)', marginTop: 2, flexShrink: 0 }} /> {r.project_idea}
              </p>
            )}
            {(r.resources || []).slice(0, 2).map((res, j) => (
              <a key={j} className="resource-link" href={res.url} target="_blank" rel="noreferrer">
                <ArrowUpRight size={13} /> {res.title}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div className="flex-between mt-32 mb-16">
        <div className="skill-section-title" style={{ margin: 0 }}><Award size={18} /> Your learning roadmap</div>
        <Link to="/app/roadmap" className="btn btn-outline btn-sm">Open roadmap <ArrowUpRight size={14} /></Link>
      </div>
      <div className="card card-pad">
        <div className="roadmap-line">
          {a.roadmap?.slice(0, 6).map((s, i) => (
            <div key={i} className="roadmap-step">
              <div className="rs-card">
                <div className="flex-between">
                  <div className="flex" style={{ gap: 10 }}>
                    <span className="badge badge-accent">Phase {s.phase}</span>
                    <b>{s.skill}</b>
                  </div>
                  <Badge kind="neutral"><Clock size={11} /> ~{s.effort_hours}h</Badge>
                </div>
                <p className="small muted mt-8">{s.practice_task}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
