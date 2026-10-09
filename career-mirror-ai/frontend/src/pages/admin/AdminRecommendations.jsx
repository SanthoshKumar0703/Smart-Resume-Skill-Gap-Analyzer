import { useCallback, useEffect, useState } from 'react'
import { Lightbulb, Plus, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, Modal, PageHead, Skeleton } from '../../components/ui'
import { formatDate } from '../../utils/helpers'

export default function AdminRecommendations() {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ category: 'General', title: '', description: '', tags: '' })
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await api.get(`/admin/recommendations?${params}`)
    setItems(res.data.recommendations)
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await api.post('/admin/recommendations', {
        category: form.category,
        title: form.title,
        description: form.description,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      })
      toast.success('Recommendation created')
      setOpen(false)
      setForm({ category: 'General', title: '', description: '', tags: '' })
      load()
    } catch (err) { toast.error('Save failed', errMsg(err)) } finally { setSaving(false) }
  }

  const remove = async (r) => {
    if (!window.confirm(`Delete recommendation "${r.title}"?`)) return
    try {
      await api.delete(`/admin/recommendations/${r.id}`)
      setItems((list) => list.filter((x) => x.id !== r.id))
      toast.success('Recommendation deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead
        title="Recommendations"
        sub="Curated advice available across the platform"
        actions={<button className="btn btn-royal btn-sm" onClick={() => setOpen(true)}><Plus size={15} /> Add recommendation</button>}
      />
      <div className="card card-pad mb-24">
        <div className="field" style={{ marginBottom: 0, maxWidth: 420 }}>
          <label htmlFor="rec-search">Search</label>
          <div className="input-wrap">
            <Search size={15} />
            <input id="rec-search" className="input" placeholder="Title…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {items === null ? (
        <Skeleton height={200} />
      ) : items.length === 0 ? (
        <div className="card"><div className="empty-state"><Lightbulb size={26} /><p>No curated recommendations yet.</p></div></div>
      ) : (
        <div className="grid-2">
          {items.map((r) => (
            <div key={r.id} className="card card-pad card-hover">
              <div className="flex-between mb-8">
                <Badge kind="gold">{r.category}</Badge>
                <span className="small muted">{formatDate(r.created_at)}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 15, marginBottom: 6 }}>{r.title}</h3>
              <p className="small muted">{r.description}</p>
              {(r.tags || []).length > 0 && (
                <div className="chip-row mt-16">
                  {r.tags.map((t) => <span key={t} className="skill-chip">{t}</span>)}
                </div>
              )}
              <div className="flex mt-16" style={{ gap: 6 }}>
                <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => remove(r)} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add recommendation"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-royal" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        <div className="field"><label>Category</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div className="field"><label>Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field"><label>Description</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="field"><label>Tags (comma separated)</label><input className="input" placeholder="interview, resume, skills" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
      </Modal>
    </div>
  )
}
