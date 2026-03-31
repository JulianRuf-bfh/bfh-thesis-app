'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function AdminMatchingPage() {
  const router = useRouter()
  const [semester, setSemester] = useState<any>(null)
  const [results, setResults] = useState<{ matches: any[]; unmatched: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [approving, setApproving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')

  const showMsg = (text: string, ok: boolean) => {
    setMessage({ text, ok }); setTimeout(() => setMessage(null), 5000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const sems = await fetch('/api/admin/semesters').then(r => r.json())
    const active = (Array.isArray(sems) ? sems : []).find((s: any) => s.isActive)
    setSemester(active ?? null)

    if (active && active.matchingRun) {
      const res = await fetch(`/api/admin/matching?semesterId=${active.id}`)
      if (res.ok) setResults(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async () => {
    if (!semester) return
    if (!confirm('Mark this semester as approved for matching? This cannot be undone.')) return
    setApproving(true)
    const res = await fetch(`/api/admin/semesters/${semester.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchingApproved: true }),
    })
    setApproving(false)
    if (res.ok) { showMsg('Approved — matching can now be run.', true); fetchData() }
    else showMsg('Failed to approve', false)
  }

  const handleRunMatching = async () => {
    if (!semester) return
    if (!confirm('Run the matching algorithm? This will clear any previous results for this semester.')) return
    setRunning(true)
    const res = await fetch('/api/admin/matching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semesterId: semester.id }),
    })
    setRunning(false)
    if (res.ok) {
      const data = await res.json()
      showMsg(`Matching complete: ${data.matched} matched, ${data.unmatched} unmatched.`, true)
      fetchData()
    } else {
      const { error } = await res.json()
      showMsg(error ?? 'Matching failed', false)
    }
  }

  const handleSendEmails = async () => {
    if (!semester) return
    if (!confirm('Send result emails to all matched students and lecturers? This cannot be undone.')) return
    setSendingEmails(true)
    const res = await fetch('/api/admin/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semesterId: semester.id }),
    })
    setSendingEmails(false)
    if (res.ok) { showMsg('Emails sent successfully.', true); fetchData() }
    else { const { error } = await res.json(); showMsg(error ?? 'Email sending failed', false) }
  }

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  return (
    <div className="space-y-6">
      <h1>Matching</h1>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${message.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {!semester ? (
        <div className="card p-8 text-center text-bfh-gray-mid">
          No active semester. <a href="/admin/semesters" className="text-bfh-red hover:underline">Create one</a>.
        </div>
      ) : (
        <>
          {/* Semester info & workflow */}
          <div className="card p-5">
            <h2 className="mb-4">{semester.name}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Lecturer Deadline', value: formatDate(semester.lecturerDeadline), passed: new Date() > new Date(semester.lecturerDeadline) },
                { label: 'Student Deadline', value: formatDate(semester.studentDeadline), passed: new Date() > new Date(semester.studentDeadline) },
                { label: 'Students w/ Prefs', value: semester.studentWithPrefsCount ?? '–', passed: true },
                { label: 'Total Topics', value: semester.topicCount ?? '–', passed: true },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className={`text-lg font-bold ${item.passed ? 'text-bfh-gray-dark' : 'text-bfh-gray-mid'}`}>{item.value}</div>
                  <div className="text-xs text-bfh-gray-mid">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Workflow steps */}
            <div className="flex items-center gap-0 text-xs mb-5 overflow-x-auto">
              {[
                { label: '1. Review data', done: true },
                { label: '2. Approve', done: semester.matchingApproved },
                { label: '3. Run matching', done: semester.matchingRun },
                { label: '4. Send emails', done: semester.emailsSent },
              ].map((step, i) => (
                <div key={i} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded ${step.done ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
                    <span>{step.done ? '✓' : '○'}</span> {step.label}
                  </div>
                  {i < 3 && <div className="w-4 h-px bg-bfh-gray-border mx-1 shrink-0"/>}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {!semester.matchingApproved && (
                <button onClick={handleApprove} disabled={approving} className="btn-primary">
                  {approving ? 'Approving…' : '✓ Approve for Matching'}
                </button>
              )}
              {semester.matchingApproved && !semester.emailsSent && (
                <button onClick={handleRunMatching} disabled={running} className="btn-primary">
                  {running ? 'Running…' : '▶ Run Matching Algorithm'}
                </button>
              )}
              {semester.matchingRun && !semester.emailsSent && (
                <button onClick={handleSendEmails} disabled={sendingEmails} className="btn-primary">
                  {sendingEmails ? 'Sending…' : '✉ Send Result Emails'}
                </button>
              )}
              {semester.matchingRun && semester.matchingApproved && !semester.emailsSent && (
                <button onClick={handleRunMatching} disabled={running} className="btn-secondary text-sm">
                  ↺ Re-run Matching
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {results && (
            <>
              <div className="flex gap-4 text-sm">
                <span className="text-green-700 font-medium">✓ {results.matches.length} matched</span>
                {results.unmatched.length > 0 && (
                  <span className="text-red-600 font-medium">✗ {results.unmatched.length} unmatched</span>
                )}
              </div>

              {/* Unmatched students */}
              {results.unmatched.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-3">Unmatched Students — Requires Manual Assignment</h3>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Programme</th><th>Level</th></tr></thead>
                      <tbody>
                        {results.unmatched.map(u => (
                          <tr key={u.studentId}>
                            <td className="font-medium">{u.studentName}</td>
                            <td className="text-bfh-gray-mid">{u.studentEmail}</td>
                            <td>{u.programme ?? '–'}</td>
                            <td>{u.level ?? '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Matched results */}
              <div className="card">
                <div className="p-4 border-b border-bfh-gray-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Matching Results — click a row to view thesis progress</h3>
                    <div className="flex gap-3 text-xs text-bfh-gray-mid">
                      {[1,2,3,4].map(r => {
                        const count = results.matches.filter(m => m.matchedRank === r).length
                        return count > 0 && <span key={r}><strong>{count}</strong> × choice {r}</span>
                      })}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by student, topic or supervisor…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input text-sm py-1.5 w-full max-w-sm"
                  />
                </div>
                <div className="table-container rounded-none border-0">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Programme</th>
                        <th>Topic</th>
                        <th>Supervisor</th>
                        <th>Rank</th>
                        <th>Matched at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.matches
                        .filter(m => {
                          if (!search) return true
                          const q = search.toLowerCase()
                          return m.studentName.toLowerCase().includes(q) ||
                                 m.topicTitle.toLowerCase().includes(q) ||
                                 m.lecturerName.toLowerCase().includes(q)
                        })
                        .map(m => (
                        <tr
                          key={m.studentId}
                          onClick={() => router.push(`/admin/matching/${m.matchId}`)}
                          className="cursor-pointer hover:bg-bfh-yellow-light transition-colors"
                        >
                          <td>
                            <div className="font-medium">{m.studentName}</div>
                            <div className="text-xs text-bfh-gray-mid">{m.studentEmail}</div>
                          </td>
                          <td>{m.programme ?? '–'}</td>
                          <td className="max-w-xs">
                            <div className="line-clamp-2 text-sm">{m.topicTitle}</div>
                          </td>
                          <td>{m.lecturerName}</td>
                          <td>
                            <span className={`badge ${m.matchedRank === 1 ? 'bg-green-100 text-green-700' : m.matchedRank === 2 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              #{m.matchedRank}
                            </span>
                          </td>
                          <td className="text-xs text-bfh-gray-mid whitespace-nowrap">{formatDateTime(m.matchedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
