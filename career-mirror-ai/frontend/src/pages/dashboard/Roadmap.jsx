import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  PlayCircle,
  Rocket,
  Target,
} from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, EmptyState, PageHead, SkeletonCard } from '../../components/ui'
import { cx } from '../../utils/helpers'

const STATUS_ORDER = ['not_started', 'learning', 'practicing', 'completed']

export default function Roadmap() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () =>
    api
      .get('/learning/roadmap')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const setStatus = async (skill, status) => {
    try {
      await api.post('/learning/progress', { skill, status })
      setData((d) => ({
        ...d,
        steps: d.steps.map((s) => (s.skill === skill ? { ...s, status } : s)),
      }))
      toast.success(
        status === 'completed' ? 'Milestone reached 🏆' : 'Progress saved',
        status === 'completed'
          ? `You completed ${skill} — it now counts toward your future analyses.`
          : `${skill} → ${status.replace('_', ' ')}`
      )
    } catch (err) {
      toast.error('Could not update progress', errMsg(err))
    }
  }

  if (loading) {
    return (
      <div className="page-enter">
        <PageHead title="Learning Roadmap" sub="Your personalized path to the target role" />
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (!data || data.steps.length === 0) {
    return (
      <div className="page-enter">
        <PageHead title="Learning Roadmap" sub="Your personalized path to the target role" />
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <EmptyState icon={<GitBranch size={26} />} title="No roadmap yet" message="Run an analysis against a job description and Career Mirror AI will build a phased plan from your gaps." action={<Link to="/app/analyzer" className="btn btn-royal btn-sm">Create my roadmap</Link>} />
        </div>
      </div>
    )
  }

  const phases = [...new Set(data.steps.map((s) => s.phase))]
  const completed = data.summary?.completed || 0

  return (
    <div className="page-enter">
      <PageHead
        title={`Learning Roadmap · ${data.job_title || 'Target role'}`}
        sub="Track each step and completed skills will count in your future analyses."
        actions={
          <Link to="/app/simulator" className="btn btn-outline btn-sm"><Target size={14} /> What-if simulator</Link>
        }
      />

      <div className="card card-pad mb-24">
        <div className="flex" style={{ gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: 180 }}>
            <div className="flex-between small mb-8"><span className="muted">Roadmap progress</span><b>{data.summary.progress_pct}%</b></div>
            <div className="progress"><div className="progress-fill" style={{ width: `${data.summary.progress_pct}%` }} /></div>
          </div>
          <div className="flex" style={{ gap: 26 }}>
            {[['Steps done', `${completed}/${data.summary.total_steps}`, 'var(--success)'], ['In progress', data.summary.in_progress, 'var(--warn)'], ['Estimated hours', `~${data.summary.total_hours}`, 'var(--violet)'], ['Hours completed', `~${data.summary.hours_done}`, 'var(--accent-2)']].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                <div className="small muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="roadmap-line">
        {data.steps.map((s, i) => (
          <motion.div
            key={s.skill + i}
            className={cx('roadmap-step', s.status === 'completed' && 'completed')}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
          >
            <div className="rs-card">
              <div className="flex-between" style={{ gap: 14, flexWrap: 'wrap' }}>
                <div className="flex" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <span className="badge badge-accent">Phase {s.phase}</span>
                  <b style={{ fontSize: 15 }}>{s.skill}</b>
                  <Badge kind="neutral">{s.difficulty_label}</Badge>
                  <Badge kind="neutral"><Clock size={11} /> ~{s.effort_hours}h</Badge>
                  {s.importance === 'high' && <Badge kind="missing">high priority</Badge>}
                </div>
                <select
                  className="status-select"
                  value={s.status}
                  onChange={(e) => setStatus(s.skill, e.target.value)}
                  aria-label={`Status for ${s.skill}`}
                >
                  <option value="not_started">Not started</option>
                  <option value="learning">Learning</option>
                  <option value="practicing">Practicing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {s.practice_task && (
                <p className="small mt-8" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--ink-2)' }}>
                  <PlayCircle size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <span><b>Practice:</b> {s.practice_task}</span>
                </p>
              )}
              {s.project_idea && (
                <p className="small mt-8" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--ink-2)' }}>
                  <Rocket size={15} style={{ color: 'var(--violet)', flexShrink: 0, marginTop: 2 }} />
                  <span><b>Project:</b> {s.project_idea}</span>
                </p>
              )}
              {(s.resources || []).length > 0 && (
                <div className="flex mt-8" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {(s.resources || []).slice(0, 3).map((r, j) => (
                    <a key={j} className="resource-link" style={{ padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 8 }} href={r.url} target="_blank" rel="noreferrer">
                      <BookOpen size={12} /> {r.title} <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              )}
              {s.status === 'completed' && (
                <div className="small mt-8" style={{ color: 'var(--success)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <CheckCircle2 size={14} /> Completed — this skill now counts toward your analyses
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
