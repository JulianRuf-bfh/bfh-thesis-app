'use client'
import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type SupervisorRequest = {
  id: string
  lecturerId: string
  status: string
  specialisationFit: boolean | null
  responseNote: string | null
  respondedAt: string | null
  lecturer: { id: string; name: string; email: string }
}

type Proposal = {
  id: string
  title: string
  description: string | null
  method: string
  language: string
  status: string
  createdAt: string
  updatedAt: string
  semester: { id: string; name: string }
  student: {
    id: string; name: string; email: string
    programme: string | null; level: string | null; specialisation: string | null
  }
  supervisorRequests: SupervisorRequest[]
}

type LecturerResult = { id: string; name: string; email: string }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-bfh-gray-light text-bfh-gray-mid border-bfh-gray-border',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  MATCHED:   'bg-green-50 text-green-700 border-green-200',
  WITHDRAWN: 'bg-red-50 text-red-700 border-red-200',
}

const METHOD_LABELS: Record<string, string> = {
  QUANTITATIVE:           'Quantitative',
  QUALITATIVE:            'Qualitative',
  DESIGN_SCIENCE_RESEARCH:'Design Science Research',
  LITERATURE_REVIEW:      'Literature Review',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminOwnTopicRequestsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<string>('SUBMITTED') // show open ones by default
  const [assigning, setAssigning] = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  // Per-proposal assign state: search + selection
  const [assignSearch, setAssignSearch] = useState<Record<string, string>>({})
  const [assignResults, setAssignResults] = useState<Record<string, LecturerResult[]>>({})
  const [searching, setSearching]       = useState<string | null>(null)
  const searchTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  const fetchData = async () => {
    const params = filter !== 'ALL' ? `?status=${filter}` : ''
    const r = await fetch(`/api/admin/own-topic-requests${params}`)
    if (r.ok) setProposals(await r.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filter])

  // ── Supervisor search for assign ───────────────────────────────────────────

  const handleAssignSearch = (proposalId: string, q: string) => {
    setAssignSearch(prev => ({ ...prev, [proposalId]: q }))
    if (searchTimers.current[proposalId]) clearTimeout(searchTimers.current[proposalId])
    if (!q.trim()) { setAssignResults(prev => ({ ...prev, [proposalId]: [] })); return }
    setSearching(proposalId)
    searchTimers.current[proposalId] = setTimeout(async () => {
      const r = await fetch(`/api/lecturers?search=${encodeURIComponent(q)}`)
      const data = r.ok ? await r.json() : []
      setAssignResults(prev => ({ ...prev, [proposalId]: data }))
      setSearching(null)
    }, 300)
  }

  const assignSupervisor = async (proposalId: string, lecturerId: string) => {
    setAssigning(proposalId)
    const res = await fetch('/api/admin/own-topic-requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ proposalId, lecturerId }),
    })
    if (res.ok) {
      showToast('Supervisor assigned — match created!', true)
      setAssignSearch(prev => ({ ...prev, [proposalId]: '' }))
      setAssignResults(prev => ({ ...prev, [proposalId]: [] }))
      await fetchData()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showToast(error ?? 'Could not assign supervisor', false)
    }
    setAssigning(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  const filterOptions = [
    { value: 'SUBMITTED', label: 'Open (Submitted)' },
    { value: 'MATCHED',   label: 'Matched' },
    { value: 'DRAFT',     label: 'Draft' },
    { value: 'WITHDRAWN', label: 'Withdrawn' },
    { value: 'ALL',       label: 'All' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Own-Topic Requests</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">
            Student-proposed topics awaiting a supervisor. You can manually assign a supervisor if needed.
          </p>
        </div>
        {/* Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-bfh-gray-mid font-medium">Show:</label>
          <select
            className="input text-sm py-1.5"
            value={filter}
            onChange={e => { setFilter(e.target.value); setLoading(true) }}
          >
            {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {proposals.length === 0 && (
        <div className="card p-10 text-center text-bfh-gray-mid">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm">No proposals with status "{filter}".</p>
        </div>
      )}

      {/* Proposal cards */}
      <div className="space-y-4">
        {proposals.map(p => (
          <div key={p.id} className="card overflow-hidden">
            {/* Card header */}
            <div className="px-4 py-3 bg-bfh-gray-light border-b border-bfh-gray-border flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-bfh-gray-dark">{p.student.name}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-xs text-bfh-gray-mid">
                  {p.student.email} · {[p.student.programme, p.student.level].filter(Boolean).join(' / ')}
                  {p.student.specialisation && ` · ${p.student.specialisation.replace(/_/g, ' ')}`}
                </div>
              </div>
              <div className="text-[10px] text-bfh-gray-mid shrink-0">
                {p.semester.name} · Submitted {formatDateTime(p.createdAt)}
              </div>
            </div>

            {/* Topic info */}
            <div className="px-4 py-3 space-y-1.5">
              <h3 className="font-semibold text-bfh-gray-dark">{p.title}</h3>
              {p.description && (
                <p className="text-sm text-bfh-gray-mid leading-relaxed">{p.description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] bg-bfh-gray-light text-bfh-gray-mid px-2 py-0.5 rounded">
                  {METHOD_LABELS[p.method] ?? p.method}
                </span>
                <span className="text-[11px] bg-bfh-gray-light text-bfh-gray-mid px-2 py-0.5 rounded">
                  {p.language}
                </span>
              </div>
            </div>

            {/* Supervisor requests list */}
            {p.supervisorRequests.length > 0 && (
              <div className="border-t border-bfh-gray-border px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid mb-2">
                  Supervisor Requests ({p.supervisorRequests.length})
                </p>
                <div className="space-y-1.5">
                  {p.supervisorRequests.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        r.status === 'PENDING'  ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : r.status === 'ACCEPTED' ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid'
                      }`}>{r.status}</span>
                      <span className="font-medium text-bfh-gray-dark">{r.lecturer.name}</span>
                      <span className="text-bfh-gray-mid">{r.lecturer.email}</span>
                      {r.status === 'ACCEPTED' && r.specialisationFit !== null && (
                        <span className={r.specialisationFit ? 'text-green-700' : 'text-amber-700'}>
                          Fit: {r.specialisationFit ? 'Yes ✓' : 'Not confirmed'}
                        </span>
                      )}
                      {r.responseNote && <span className="text-bfh-gray-mid italic">"{r.responseNote}"</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin manual assign — only for non-matched proposals */}
            {['DRAFT', 'SUBMITTED'].includes(p.status) && (
              <div className="border-t border-bfh-gray-border px-4 py-3 bg-amber-50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-2">
                  Manual Assignment
                </p>
                <div className="relative">
                  <input
                    type="text"
                    className="input text-sm py-1.5 pr-8"
                    placeholder="Search lecturer to assign…"
                    value={assignSearch[p.id] ?? ''}
                    onChange={e => handleAssignSearch(p.id, e.target.value)}
                  />
                  {searching === p.id && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-bfh-gray-mid text-xs">…</span>
                  )}
                  {(assignResults[p.id]?.length ?? 0) > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-10 overflow-hidden">
                      {assignResults[p.id].map(l => (
                        <div key={l.id} className="flex items-center gap-3 px-3 py-2 hover:bg-bfh-gray-light border-b border-bfh-gray-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{l.name}</div>
                            <div className="text-xs text-bfh-gray-mid">{l.email}</div>
                          </div>
                          <button
                            disabled={assigning === p.id}
                            onClick={() => assignSupervisor(p.id, l.id)}
                            className="shrink-0 text-xs btn-primary py-1 px-2.5 disabled:opacity-50"
                          >
                            {assigning === p.id ? '…' : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
