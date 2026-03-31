'use client'
import { useState, useEffect, useCallback } from 'react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const updateRole = async (id: string, role: string) => {
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('Role updated', true)
      setEditId(null)
      fetchUsers()
    } else {
      const { error } = await res.json()
      showToast(error ?? 'Update failed', false)
    }
  }

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false
    if (search) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  })

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      STUDENT: 'bg-blue-100 text-blue-800',
      LECTURER: 'bg-green-100 text-green-800',
      ADMIN: 'bg-red-100 text-red-800',
    }
    return <span className={`badge ${map[role] ?? 'bg-gray-100 text-gray-700'}`}>{role}</span>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>User Management</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">Manage roles for all users. Role changes take effect on next login.</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="STUDENT">Students</option>
          <option value="LECTURER">Lecturers</option>
          <option value="ADMIN">Admins</option>
        </select>
        <input type="text" className="input flex-1 min-w-40" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Programme</th><th></th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-bfh-gray-mid text-sm">{u.email}</td>
                  <td>
                    {editId === u.id ? (
                      <div className="flex gap-2 items-center">
                        <select className="input w-auto text-xs py-1" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          <option value="STUDENT">STUDENT</option>
                          <option value="LECTURER">LECTURER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <button onClick={() => updateRole(u.id, editRole)} disabled={saving} className="btn-primary text-xs py-1">Save</button>
                        <button onClick={() => setEditId(null)} className="btn-secondary text-xs py-1">×</button>
                      </div>
                    ) : roleBadge(u.role)}
                  </td>
                  <td className="text-sm">{u.programme ?? '–'}</td>
                  <td>
                    {editId !== u.id && (
                      <button onClick={() => { setEditId(u.id); setEditRole(u.role) }} className="btn-secondary text-xs py-1">
                        Change Role
                      </button>
                    )}
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
