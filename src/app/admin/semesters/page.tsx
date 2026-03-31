'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function AdminSemestersPage() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', lecturerDeadline: '', studentDeadline: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const fetchSemesters = useCallback(async () => {
    const res = await fetch('/api/admin/semesters')
    if (res.ok) setSemesters(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchSemesters() }, [fetchSemesters])

  const createSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/semesters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        lecturerDeadline: new Date(form.lecturerDeadline).toISOString(),
        studentDeadline: new Date(form.studentDeadline).toISOString(),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setForm({ name: '', lecturerDeadline: '', studentDeadline: '' })
      showToast('Semester created', true)
      fetchSemesters()
    } else {
      const { error: err } = await res.json()
      setError(err ?? 'Could not create semester')
    }
  }

  const setActive = async (id: string) => {
    const res = await fetch(`/api/admin/semesters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    if (res.ok) { showToast('Semester activated', true); fetchSemesters() }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>Semesters</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">Manage semesters and their deadlines.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ New Semester'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createSemester} className="card p-6 space-y-4 max-w-lg">
          <h2 className="text-base">New Semester</h2>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. FS 2026" required />
          </div>
          <div>
            <label className="label">Lecturer Input Deadline</label>
            <input type="datetime-local" className="input" value={form.lecturerDeadline} onChange={e => setForm(f => ({ ...f, lecturerDeadline: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Student Application Deadline</label>
            <input type="datetime-local" className="input" value={form.studentDeadline} onChange={e => setForm(f => ({ ...f, studentDeadline: e.target.value }))} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Semester'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Semesters list */}
      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
      ) : semesters.length === 0 ? (
        <div className="card p-12 text-center text-bfh-gray-mid">No semesters yet.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Lecturer Deadline</th>
                <th>Student Deadline</th>
                <th>Topics</th>
                <th>Students w/ Prefs</th>
                <th>Matches</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {semesters.map(s => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td>{formatDate(s.lecturerDeadline)}</td>
                  <td>{formatDate(s.studentDeadline)}</td>
                  <td className="text-center">{s.topicCount}</td>
                  <td className="text-center">{s.studentWithPrefsCount}</td>
                  <td className="text-center">{s.matchCount}</td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      {s.isActive && <span className="badge bg-green-100 text-green-700">Active</span>}
                      {s.matchingRun && <span className="badge bg-blue-100 text-blue-700">Matched</span>}
                      {s.emailsSent && <span className="badge bg-purple-100 text-purple-700">Emails sent</span>}
                      {!s.isActive && !s.matchingRun && <span className="badge bg-gray-100 text-gray-500">Inactive</span>}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {!s.isActive && (
                        <button onClick={() => setActive(s.id)} className="btn-secondary text-xs py-1">Activate</button>
                      )}
                      {s.isActive && (
                        <a href="/admin/matching" className="btn-primary text-xs py-1">Matching →</a>
                      )}
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
