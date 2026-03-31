'use client'
import { useState, useEffect } from 'react'
import { LEVEL_LABELS, PROGRAMME_LABELS } from '@/types'
import type { Level, Programme } from '@/types'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterProgramme, setFilterProgramme] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/users?role=STUDENT')
      .then(r => r.json())
      .then(d => { setStudents(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtered = students.filter(s => {
    if (filterLevel && s.level !== filterLevel) return false
    if (filterProgramme && s.programme !== filterProgramme) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1>Students</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">{students.length} registered students</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-auto" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">All levels</option>
          <option value="BACHELOR">Bachelor</option>
          <option value="MASTER">Master</option>
        </select>
        <select className="input w-auto" value={filterProgramme} onChange={e => setFilterProgramme(e.target.value)}>
          <option value="">All programmes</option>
          {(Object.entries(PROGRAMME_LABELS) as [Programme, string][]).map(([p, l]) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="text"
          className="input flex-1 min-w-40"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {(filterLevel || filterProgramme || search) && (
          <button onClick={() => { setFilterLevel(''); setFilterProgramme(''); setSearch('') }} className="text-xs text-bfh-red hover:underline">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
      ) : (
        <>
          <p className="text-sm text-bfh-gray-mid">{filtered.length} of {students.length} students</p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Level</th>
                  <th>Programme</th>
                  <th>Specialisation</th>
                  <th>Student ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name}</td>
                    <td className="text-bfh-gray-mid text-sm">{s.email}</td>
                    <td>{s.level ? <span className={`badge ${s.level === 'BACHELOR' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{s.level === 'BACHELOR' ? 'Bachelor' : 'Master'}</span> : '–'}</td>
                    <td>{s.programme ?? '–'}</td>
                    <td className="text-sm text-bfh-gray-mid">{s.specialisation?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '–'}</td>
                    <td className="text-sm font-mono text-bfh-gray-mid">{s.studentId ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
