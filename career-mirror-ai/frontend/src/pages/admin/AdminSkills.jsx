import { useCallback, useEffect, useState } from 'react'
import { Activity, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, Modal, PageHead, Skeleton } from '../../components/ui'

const EMPTY_FORM = {
  name: '', category: 'Other', aliases: '', related: '', importance: 'medium',
  difficulty: 2, effort_hours: 10, why: '', practice: '', project: '', resources: '',
}

export default function AdminSkills() {
  const toast = useToast()
  const [skills, setSkills] = useState(null)
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null) // skill object or 'new'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const res = await api.get(`/admin/skills?${params}`)
    setSkills(res.data.skills)
  }, [search, category])

  useEffect(() => {
    api.get('/admin/skills/categories').then((r) => setCategories(r.data.categories)).catch(() => {})
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  const openEdit = (s) => {
    setForm({
      name: s.name, category: s.category, importance: s.importance,
      difficulty: s.difficulty, effort_hours: s.effort_hours,
      why: s.why || '', practice: s.practice || '', project: s.project || '',
      aliases: (s.aliases || []).join(', '), related: (s.related || []).join(', '),
      resources: (s.resources || []).map((r) => `${r.title}|${r.url}`).join('\n'),
    })
    setEditing(s)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Skill name is required'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category || 'Other',
      importance: form.importance,
      difficulty: Number(form.difficulty) || 2,
      effort_hours: Number(form.effort_hours) || 10,
      why: form.why, practice: form.practice, project: form.project,
      aliases: form.aliases.split(',').map((s) => s.trim()).filter(Boolean),
      related: form.related.split(',').map((s) => s.trim()).filter(Boolean),
      resources: form.resources.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [title, url] = l.split('|')
        return { title: title || l, url: url || '#' }
      }),
    }
    try {
      if (editing === 'new') {
        await api.post('/admin/skills', payload)
        toast.success('Skill created')
      } else {
        await api.put(`/admin/skills/${editing.id}`, payload)
        toast.success('Skill updated')
      }
      setEditing(null)
      load()
    } catch (err) { toast.error('Save failed', errMsg(err)) } finally { setSaving(false) }
  }

  const remove = async (s) => {
    if (!window.confirm(`Delete skill "${s.name}"? Analyses already run keep their results.`)) return
    try {
      await api.delete(`/admin/skills/${s.id}`)
      setSkills((list) => list.filter((x) => x.id !== s.id))
      toast.success('Skill deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead
        title="Skill Database"
        sub="The knowledge base powering extraction and matching"
        actions={<button className="btn btn-royal btn-sm" onClick={openNew}><Plus size={15} /> Add skill</button>}
      />

      <div className="card card-pad mb-24">
        <div className="grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="s-search">Search</label>
            <div className="input-wrap">
              <Search size={15} />
              <input id="s-search" className="input" placeholder="Skill name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="s-cat">Category</label>
            <select id="s-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {skills === null ? (
        <Skeleton height={260} />
      ) : skills.length === 0 ? (
        <div className="card"><div className="empty-state"><Activity size={26} /><p>No skills found.</p></div></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Category</th>
                <th>Aliases</th>
                <th>Importance</th>
                <th>Difficulty</th>
                <th>Est. hours</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.id}>
                  <td className="cell-strong">{s.name}</td>
                  <td><Badge kind="neutral">{s.category}</Badge></td>
                  <td className="small muted" style={{ maxWidth: 200 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {(s.aliases || []).slice(0, 4).join(', ')}{(s.aliases || []).length > 4 ? '…' : ''}
                    </span>
                  </td>
                  <td>
                    <Badge kind={s.importance === 'high' ? 'missing' : s.importance === 'medium' ? 'partial' : 'neutral'}>{s.importance}</Badge>
                  </td>
                  <td>{'●'.repeat(s.difficulty || 1)}<span className="muted">{'○'.repeat(5 - (s.difficulty || 1))}</span></td>
                  <td>~{s.effort_hours}h</td>
                  <td>
                    <div className="flex" style={{ justifyContent: 'flex-end', gap: 5 }}>
                      <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} title="Delete" onClick={() => remove(s)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add skill' : `Edit ${editing?.name}`} width={720}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-royal" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save skill'}</button>
        </>}
      >
        <div className="grid-2">
          <div className="field">
            <label htmlFor="sk-name">Skill name *</label>
            <input id="sk-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sk-cat">Category</label>
            <input id="sk-cat" className="input" list="cat-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <datalist id="cat-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="sk-imp">Importance</label>
            <select id="sk-imp" className="input" value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value })}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="sk-eff">Estimated effort (hours)</label>
            <input id="sk-eff" className="input" type="number" min="1" value={form.effort_hours} onChange={(e) => setForm({ ...form, effort_hours: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sk-diff">Difficulty (1-5)</label>
            <input id="sk-diff" className="input" type="number" min="1" max="5" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sk-alias">Aliases (comma separated)</label>
            <input id="sk-alias" className="input" placeholder="react.js, reactjs" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sk-rel">Related technologies</label>
            <input id="sk-rel" className="input" placeholder="vue, angular" value={form.related} onChange={(e) => setForm({ ...form, related: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sk-res">Resources (Title|URL per line)</label>
            <textarea id="sk-res" className="input" style={{ minHeight: 70 }} placeholder={'Official Docs|https://…\nCourse|https://…'} value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sk-why">Why it matters (hiring context)</label>
          <textarea id="sk-why" className="input" style={{ minHeight: 60 }} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="sk-practice">Practice task</label>
            <textarea id="sk-practice" className="input" style={{ minHeight: 60 }} value={form.practice} onChange={(e) => setForm({ ...form, practice: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sk-project">Project idea</label>
            <textarea id="sk-project" className="input" style={{ minHeight: 60 }} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
