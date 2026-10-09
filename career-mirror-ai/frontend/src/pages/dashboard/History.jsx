import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, FileSearch, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, EmptyState, PageHead, Skeleton, Spinner } from '../../components/ui'
import { cx, formatDate, scoreClass } from '../../utils/helpers'

export default function History() {
  const navigate = useNavigate()
  const toast = useToast()
  const [analyses, setAnalyses] = useState(null)
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [sort, setSort] = useState('newest')
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    const params = new URLSearchParams({ sort })
    if (search.trim()) params.set('search', search.trim())
    if (minScore) params.set('min_score', minScore)
    if (maxScore) params.set('max_score', maxScore)
    const res = await api.get(`/analysis?${params}`)
    setAnalyses(res.data.analyses)
  }

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      api
        .get('/analysis?sort=newest')
        .then((res) => alive && setAnalyses(res.data.analyses))
        .catch(() => alive && setAnalyses([]))
    }, 0)
    return () => { alive = false; clearTimeout(timer) }
  }, [])

  // debounced search/filter
  useEffect(() => {
    if (analyses === null) return
    const t = setTimeout(load, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, minScore, maxScore, sort])

  const remove = async (id) => {
    if (!window.confirm('Delete this analysis permanently?')) return
    setDeleting(id)
    try {
      await api.delete(`/analysis/${id}`)
      setAnalyses((list) => list.filter((a) => a.id !== id))
      toast.success('Analysis deleted')
    } catch (err) {
      toast.error('Could not delete', errMsg(err))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="page-enter">
      <PageHead
        title="Analysis History"
        sub="Every comparison you've run — search, filter and revisit anytime."
        actions={<Link to="/app/analyzer" className="btn btn-royal btn-sm"><FileSearch size={15} /> New analysis</Link>}
      />

      {/* Filters */}
      <div className="card card-pad mb-24">
        <div className="grid-4">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="h-search">Search</label>
            <div className="input-wrap">
              <Search size={15} />
              <input id="h-search" className="input" placeholder="Job title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="h-min">Min score %</label>
            <input id="h-min" className="input" type="number" min="0" max="100" placeholder="0" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="h-max">Max score %</label>
            <input id="h-max" className="input" type="number" min="0" max="100" placeholder="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="h-sort">Sort</label>
            <select id="h-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest score</option>
              <option value="lowest">Lowest score</option>
            </select>
          </div>
        </div>
      </div>

      {analyses === null ? (
        <div className="grid-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={110} />)}
        </div>
      ) : analyses.length === 0 ? (
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <EmptyState
            icon={<FileSearch size={26} />}
            title="No analyses found"
            message={search || minScore || maxScore ? 'No analyses match your filters — try widening them.' : 'Run your first resume vs job-description analysis to see it here.'}
            action={<Link to="/app/analyzer" className="btn btn-royal btn-sm">Analyze my resume</Link>}
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job title</th>
                <th>Date</th>
                <th>Matched</th>
                <th>Partial</th>
                <th>Missing</th>
                <th>Match score</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/app/history/${a.id}`)}>
                  <td className="cell-strong" style={{ maxWidth: 260 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.job_title}</div>
                  </td>
                  <td>{formatDate(a.created_at)}</td>
                  <td><Badge kind="matched">{a.skill_stats?.matched ?? 0}</Badge></td>
                  <td><Badge kind="partial">{a.skill_stats?.partial ?? 0}</Badge></td>
                  <td><Badge kind="missing">{a.skill_stats?.missing ?? 0}</Badge></td>
                  <td>
                    <span className={cx('score-cell', scoreClass(a.overall_score))}>{Math.round(a.overall_score)}%</span>
                  </td>
                  <td>
                    <div className="flex" style={{ justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/history/${a.id}`)} aria-label={`View ${a.job_title} analysis`}>
                        <Eye size={14} /> View
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(a.id)} disabled={deleting === a.id} aria-label={`Delete ${a.job_title} analysis`}>
                        {deleting === a.id ? <Spinner size={13} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
