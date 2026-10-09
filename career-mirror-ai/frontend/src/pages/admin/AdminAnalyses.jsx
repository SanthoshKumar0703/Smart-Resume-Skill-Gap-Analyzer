import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Eye, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, Modal, PageHead, ScoreRing, Skeleton } from '../../components/ui'
import { cx, formatDate, scoreClass } from '../../utils/helpers'

export default function AdminAnalyses() {
  const toast = useToast()
  const [analyses, setAnalyses] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewing, setViewing] = useState(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ sort })
    if (search) params.set('search', search)
    const res = await api.get(`/admin/analyses?${params}`)
    setAnalyses(res.data.analyses)
  }, [search, sort])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const remove = async (a) => {
    if (!window.confirm(`Delete this analysis for "${a.job_title}"?`)) return
    try {
      await api.delete(`/admin/analyses/${a.id}`)
      setAnalyses((list) => list.filter((x) => x.id !== a.id))
      if (viewing?.id === a.id) setViewing(null)
      toast.success('Analysis deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead title="Analyses" sub="Every skill-gap comparison on the platform" />
      <div className="card card-pad mb-24">
        <div className="grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="a-search">Search</label>
            <div className="input-wrap">
              <Search size={15} />
              <input id="a-search" className="input" placeholder="Job title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="a-sort">Sort</label>
            <select id="a-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest score</option>
              <option value="lowest">Lowest score</option>
            </select>
          </div>
        </div>
      </div>

      {analyses === null ? (
        <Skeleton height={240} />
      ) : analyses.length === 0 ? (
        <div className="card"><div className="empty-state"><BarChart3 size={26} /><p>No analyses found.</p></div></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job title</th>
                <th>User</th>
                <th>Date</th>
                <th>Matched</th>
                <th>Gaps</th>
                <th>Score</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td className="cell-strong" style={{ maxWidth: 260 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{a.job_title}</span>
                  </td>
                  <td>{a.user_name}</td>
                  <td>{formatDate(a.created_at)}</td>
                  <td><Badge kind="matched">{a.skill_stats?.matched ?? 0}</Badge></td>
                  <td><Badge kind="missing">{a.skill_stats?.missing ?? 0}</Badge></td>
                  <td><span className={cx('score-cell', scoreClass(a.overall_score))}>{Math.round(a.overall_score)}%</span></td>
                  <td>
                    <div className="flex" style={{ justifyContent: 'flex-end', gap: 5 }}>
                      <button className="btn btn-ghost btn-icon" title="Inspect" onClick={() => setViewing(a)}><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} title="Delete" onClick={() => remove(a)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Analysis inspection" width={700}>
        {viewing && (
          <div>
            <div className="flex" style={{ gap: 20, alignItems: 'center', marginBottom: 18 }}>
              <ScoreRing value={viewing.overall_score} size={104} stroke={9} />
              <div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}>{viewing.job_title}</h3>
                <div className="small muted">by {viewing.user_name} · {formatDate(viewing.created_at)}</div>
                <div className="flex mt-8" style={{ gap: 8 }}>
                  <Badge kind="matched">{viewing.skill_stats?.matched ?? 0} matched</Badge>
                  <Badge kind="partial">{viewing.skill_stats?.partial ?? 0} partial</Badge>
                  <Badge kind="missing">{viewing.skill_stats?.missing ?? 0} missing</Badge>
                </div>
              </div>
            </div>
            <div className="small muted mb-8">Missing skills</div>
            <div className="chip-row mb-16">
              {(viewing.missing_skills || []).slice(0, 12).map((m) => <span key={m.name} className="skill-chip missing">{m.name}</span>)}
              {(viewing.missing_skills || []).length === 0 && <span className="small muted">None</span>}
            </div>
            <div className="small muted mb-8">Matched skills</div>
            <div className="chip-row">
              {(viewing.matched_skills || []).slice(0, 16).map((m) => <span key={m.name} className="skill-chip matched">{m.name}</span>)}
            </div>
            <div className="flex mt-24" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-danger btn-sm" onClick={() => remove(viewing)}><Trash2 size={14} /> Delete analysis</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
