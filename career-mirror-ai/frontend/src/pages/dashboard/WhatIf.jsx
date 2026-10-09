import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, FlaskConical, Plus, RefreshCcw, Sparkles, Target } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, EmptyState, PageHead, ScoreRing, SkeletonCard, SkillChips } from '../../components/ui'

export default function WhatIf() {
  const toast = useToast()
  const location = useLocation()
  const [analyses, setAnalyses] = useState(null)
  const [selectedId, setSelectedId] = useState(location.state?.analysisId || '')
  const [missing, setMissing] = useState([])
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .get('/analysis?limit=50')
      .then((res) => {
        const list = res.data.analyses
        setAnalyses(list)
        if (!selectedId && list.length) setSelectedId(list[0].id)
      })
      .catch(() => setAnalyses([]))
  }, [])

  // load missing skills when analysis changes
  useEffect(() => {
    if (!analyses || !selectedId) return
    const a = analyses.find((x) => x.id === selectedId)
    setMissing((a?.missing_skills || []).map((m) => m.name))
    setSelected([])
    setResult(null)
  }, [selectedId, analyses])

  const toggle = (name) => {
    setSelected((sel) => (sel.includes(name) ? sel.filter((s) => s !== name) : [...sel, name]))
    setResult(null)
  }

  const simulate = async () => {
    if (!selected.length) {
      toast.warn('Select skills', 'Pick at least one missing skill to simulate.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/analysis/what-if', { analysis_id: selectedId, skills: selected })
      setResult(res.data)
    } catch (err) {
      toast.error('Simulation failed', errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSelected([])
    setResult(null)
  }

  if (analyses === null) {
    return (
      <div className="page-enter">
        <PageHead title="What-If Simulator" sub="See the score impact of learning new skills" />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="page-enter">
        <PageHead title="What-If Simulator" sub="See the score impact of learning new skills" />
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <EmptyState icon={<FlaskConical size={26} />} title="Run an analysis first" message="The simulator recomputes a real analysis with your chosen skills added — so you need at least one saved analysis." action={<Link to="/app/analyzer" className="btn btn-royal btn-sm">Analyze a resume</Link>} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <PageHead
        title="What-If Simulator"
        sub="“What if I learn this?” — same scoring engine, projected honestly"
        actions={
          <button className="btn btn-outline btn-sm" onClick={reset} disabled={!selected.length && !result}>
            <RefreshCcw size={14} /> Reset
          </button>
        }
      />

      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-title mb-16"><Target size={16} /> 1 · Pick an analysis</div>
          <div className="field">
            <label htmlFor="wi-analysis">Saved analysis</label>
            <select id="wi-analysis" className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.job_title} · {Math.round(a.overall_score)}% · {new Date(a.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="card-title mt-24 mb-8"><Sparkles size={16} /> 2 · Choose skills to add</div>
          {missing.length === 0 ? (
            <p className="small muted">This analysis has no missing skills — great job!</p>
          ) : (
            <>
              <SkillChips skills={missing} onSelect={toggle} selected={selected} />
              <p className="small muted mt-8">Click skills to toggle them. Simulated skills are highlighted.</p>
            </>
          )}

          <div className="flex mt-24" style={{ gap: 10 }}>
            <button className="btn btn-royal btn-lg" style={{ flex: 1 }} onClick={simulate} disabled={!selected.length || loading}>
              {loading ? 'Simulating…' : <><Plus size={16} /> Simulate ({selected.length})</>}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="card card-pad">
          <div className="card-title mb-16"><FlaskConical size={16} /> 3 · Projected outcome</div>
          {!result ? (
            <div className="empty-state" style={{ padding: '36px 10px' }}>
              <p>Select skills and press simulate — the engine recomputes your score with the added skills, using the same weights as the real analysis.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="arrow-flow">
                <div className="af-box">
                  <div className="af-label">Current match</div>
                  <div className="af-value">{Math.round(result.base_score ?? analyses.find((a) => a.id === selectedId)?.overall_score ?? 0)}%</div>
                </div>
                <span className="af-arrow"><ArrowRight /></span>
                <div className="af-box" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
                  <div className="af-label" style={{ color: 'var(--accent)' }}>With {selected.join(' + ')}</div>
                  <div className="af-value" style={{ color: 'var(--accent)' }}>{Math.round(result.projected_score)}%</div>
                </div>
                <span className="af-arrow"><ArrowRight /></span>
                <div className="af-box">
                  <div className="af-label">Gain</div>
                  <div className="whatif-delta">+{Math.max(0, Math.round(result.projected_score - (result.base_score ?? 0)))}</div>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <div className="small muted mb-8">Matched after simulation</div>
                  <SkillChips skills={result.matched_skills.map((m) => m.name)} kind="matched" limit={30} />
                </div>
                <div>
                  <div className="small muted mb-8">Still missing</div>
                  <SkillChips skills={result.missing_skills.map((m) => m.name)} kind="missing" limit={30} />
                </div>
              </div>

              <hr className="divider" />
              <div className="card-title mb-16">Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.breakdown.map((b) => (
                  <div key={b.key} className="flex-between small">
                    <span className="muted">{b.factor}</span>
                    <b style={{ color: b.score >= 70 ? 'var(--success)' : b.score >= 40 ? 'var(--warn)' : 'var(--danger)' }}>{Math.round(b.score)}%</b>
                  </div>
                ))}
              </div>
              <p className="small muted mt-16">
                Projections use the same scoring engine as real analyses — add these skills to your roadmap to make it happen.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
