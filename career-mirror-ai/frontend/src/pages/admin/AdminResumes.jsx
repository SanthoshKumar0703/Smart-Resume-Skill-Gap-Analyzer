import { useCallback, useEffect, useState } from 'react'
import { FileText, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, PageHead, Skeleton } from '../../components/ui'
import { fileSizeLabel, formatDate } from '../../utils/helpers'

export default function AdminResumes() {
  const toast = useToast()
  const [resumes, setResumes] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await api.get(`/admin/resumes?${params}`)
    setResumes(res.data.resumes)
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const remove = async (r) => {
    if (!window.confirm(`Delete resume "${r.filename}"?`)) return
    try {
      await api.delete(`/admin/resumes/${r.id}`)
      setResumes((list) => list.filter((x) => x.id !== r.id))
      toast.success('Resume deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead title="Resumes" sub="Documents uploaded across the platform" />
      <div className="card card-pad mb-24">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="r-search">Search</label>
          <div className="input-wrap" style={{ maxWidth: 420 }}>
            <Search size={15} />
            <input id="r-search" className="input" placeholder="Filename…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {resumes === null ? (
        <Skeleton height={220} />
      ) : resumes.length === 0 ? (
        <div className="card"><div className="empty-state"><FileText size={26} /><p>No resumes found.</p></div></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Candidate</th>
                <th>Skills found</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">
                    <div className="flex" style={{ gap: 9 }}>
                      <FileText size={15} style={{ color: 'var(--danger)' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{r.filename}</span>
                    </div>
                  </td>
                  <td>{r.name || '—'}</td>
                  <td><Badge kind="accent">{r.skills_count} skills</Badge></td>
                  <td>{fileSizeLabel(r.size)}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <div className="flex" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(r)}><Trash2 size={14} /> Delete</button>
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
