import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, Modal, PageHead, Skeleton } from '../../components/ui'

const EMPTY = { name: '', category: 'Other', skill: '', type: 'course', url: '', level: 'beginner', description: '' }

export default function AdminResources() {
  const toast = useToast()
  const [resources, setResources] = useState(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await api.get(`/admin/resources?${params}`)
    setResources(res.data.resources)
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) { toast.error('Name and URL are required'); return }
    setSaving(true)
    try {
      if (editing === 'new') await api.post('/admin/resources', form)
      else await api.put(`/admin/resources/${editing.id}`, form)
      toast.success(editing === 'new' ? 'Resource created' : 'Resource updated')
      setEditing(null)
      load()
    } catch (err) { toast.error('Save failed', errMsg(err)) } finally { setSaving(false) }
  }

  const remove = async (r) => {
    if (!window.confirm(`Delete resource "${r.name}"?`)) return
    try {
      await api.delete(`/admin/resources/${r.id}`)
      setResources((list) => list.filter((x) => x.id !== r.id))
      toast.success('Resource deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead
        title="Learning Resources"
        sub="Curated resources surfaced in roadmaps and recommendations"
        actions={<button className="btn btn-royal btn-sm" onClick={() => { setForm(EMPTY); setEditing('new') }}><Plus size={15} /> Add resource</button>}
      />
      <div className="card card-pad mb-24">
        <div className="field" style={{ marginBottom: 0, maxWidth: 420 }}>
          <label htmlFor="lr-search">Search</label>
          <div className="input-wrap">
            <Search size={15} />
            <input id="lr-search" className="input" placeholder="Name or skill…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {resources === null ? (
        <Skeleton height={200} />
      ) : resources.length === 0 ? (
        <div className="card"><div className="empty-state"><BookOpen size={26} /><p>No resources found.</p></div></div>
      ) : (
        <div className="grid-3">
          {resources.map((r) => (
            <div key={r.id} className="card card-pad card-hover">
              <div className="flex-between mb-8">
                <Badge kind="violet">{r.type}</Badge>
                <Badge kind="neutral">{r.level}</Badge>
              </div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 15, marginBottom: 4 }}>{r.name}</h3>
              <p className="small muted mb-8">{r.description}</p>
              <div className="small muted mb-16" style={{ display: 'flex', gap: 6 }}>
                <b style={{ color: 'var(--ink-2)' }}>{r.skill || 'General'}</b> · {r.category}
              </div>
              <div className="flex" style={{ gap: 6 }}>
                <a className="btn btn-outline btn-sm" href={r.url} target="_blank" rel="noreferrer">Open <ExternalLink size={12} /></a>
                <button className="btn btn-ghost btn-icon" onClick={() => { setForm({ ...r }); setEditing(r) }} title="Edit"><Pencil size={14} /></button>
                <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => remove(r)} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add resource' : `Edit ${editing?.name}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-royal" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        <div className="grid-2">
          <div className="field"><label>Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>URL *</label><input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
          <div className="field"><label>Skill</label><input className="input" placeholder="e.g. Docker" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} /></div>
          <div className="field">
            <label>Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="field">
            <label>Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['course', 'docs', 'video', 'book', 'article', 'practice'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Level</label>
            <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {['beginner', 'intermediate', 'advanced'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}
