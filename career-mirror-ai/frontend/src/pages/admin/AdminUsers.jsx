import { useCallback, useEffect, useState } from 'react'
import { Eye, Search, Shield, Trash2, UserX, Users as UsersIcon } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Avatar, Badge, Modal, PageHead, Skeleton } from '../../components/ui'
import { formatDate, timeAgo } from '../../utils/helpers'

export default function AdminUsers() {
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [viewing, setViewing] = useState(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    if (status) params.set('status', status)
    const res = await api.get(`/admin/users?${params}`)
    setUsers(res.data.users)
  }, [search, role, status])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const changeRole = async (u, newRole) => {
    try {
      await api.put(`/admin/users/${u.id}`, { role: newRole })
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)))
      toast.success('Role updated', `${u.email} is now ${newRole}`)
    } catch (err) { toast.error('Update failed', errMsg(err)) }
  }

  const toggleActive = async (u) => {
    try {
      await api.put(`/admin/users/${u.id}`, { active: !u.active })
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)))
      toast.success(u.active ? 'User deactivated' : 'User activated')
    } catch (err) { toast.error('Update failed', errMsg(err)) }
  }

  const remove = async (u) => {
    if (!window.confirm(`Delete user ${u.email} and ALL their data?`)) return
    try {
      await api.delete(`/admin/users/${u.id}`)
      setUsers((list) => list.filter((x) => x.id !== u.id))
      toast.success('User deleted')
    } catch (err) { toast.error('Delete failed', errMsg(err)) }
  }

  return (
    <div className="page-enter">
      <PageHead title="Users" sub={`${users ? users.length : '…'} account(s)`} />

      <div className="card card-pad mb-24">
        <div className="grid-3">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-search">Search</label>
            <div className="input-wrap">
              <Search size={15} />
              <input id="u-search" className="input" placeholder="Name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-role">Role</label>
            <select id="u-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-status">Status</label>
            <select id="u-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {users === null ? (
        <Skeleton height={220} />
      ) : users.length === 0 ? (
        <div className="card"><div className="empty-state"><UsersIcon size={26} /><p>No users match your filters.</p></div></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Google</th>
                <th>Joined</th>
                <th>Last login</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex" style={{ gap: 11 }}>
                      <Avatar name={u.full_name} size="sm" />
                      <div>
                        <div className="cell-strong">{u.full_name}</div>
                        <div className="small muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select className="status-select" value={u.role} onChange={(e) => changeRole(u, e.target.value)} aria-label={`Role for ${u.email}`}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <Badge kind={u.active ? 'matched' : 'missing'} dot>{u.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td>{u.google_id ? <Badge kind="info">linked</Badge> : <span className="muted">—</span>}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{u.last_login ? timeAgo(u.last_login) : '—'}</td>
                  <td>
                    <div className="flex" style={{ justifyContent: 'flex-end', gap: 5 }}>
                      <button className="btn btn-ghost btn-icon" title="View details" onClick={() => setViewing(u)}><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-icon" title={u.active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)}><UserX size={14} /></button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} title="Delete user" onClick={() => remove(u)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="User details">
        {viewing && (
          <div>
            <div className="flex" style={{ gap: 16, marginBottom: 18 }}>
              <Avatar name={viewing.full_name} size="lg" />
              <div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 17 }}>{viewing.full_name}</h3>
                <div className="small muted">{viewing.email}</div>
                <div className="flex mt-8" style={{ gap: 8 }}>
                  <Badge kind={viewing.role === 'admin' ? 'violet' : 'accent'}>{viewing.role}</Badge>
                  <Badge kind={viewing.active ? 'matched' : 'missing'}>{viewing.active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </div>
            <div className="kv-row"><span className="k">Joined</span><span className="v">{formatDate(viewing.created_at)}</span></div>
            <div className="kv-row"><span className="k">Last login</span><span className="v">{viewing.last_login ? formatDate(viewing.last_login) : 'Never'}</span></div>
            <div className="kv-row"><span className="k">Google account</span><span className="v">{viewing.google_id ? 'Linked' : 'Not linked'}</span></div>
            <div className="flex mt-24" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => changeRole(viewing, viewing.role === 'admin' ? 'user' : 'admin')}>
                <Shield size={14} /> Make {viewing.role === 'admin' ? 'user' : 'admin'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => { remove(viewing); setViewing(null) }}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
