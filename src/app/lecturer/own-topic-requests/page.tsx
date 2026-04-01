'use client'
import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type OwnTopicRequest = {
  id: string
  status: string
  specialisationFit: boolean | null
  responseNote: string | null
  respondedAt: string | null
  createdAt: string
  ownTopicRequest: {
    id: string
    title: string
    description: string | null
    method: string
    language: string
    status: string
    semester: { id: string; name: string }
    student: {
      id: string; name: string; email: string
      programme: string | null; level: string | null; specialisation: string | null
    }
  }
}

const METHOD_LABELS: Record<string, string> = {
  QUANTITATIVE:           'Quantitative',
  QUALITATIVE:            'Qualitative',
  DESIGN_SCIENCE_RESEARCH:'Design Science Research',
  LITERATURE_REVIEW:      'Literature Review',
}
const LANGUAGE_LABELS: Record<string, string> = {
  GERMAN: 'German', ENGLISH: 'English', BOTH: 'German or English',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-50 border-amber-200 text-amber-800',
  ACCEPTED:  'bg-green-50 border-green-200 text-green-800',
  REJECTED:  'bg-red-50 border-red-200 text-red-700',
  WITHDRAWN: 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LecturerOwnTopicRequestsPage() {
  const [requests, setRequests]   = useState<OwnTopicRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'pending' | 'all'>('pending')
  const [responding, setResponding] = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  // Per-request response state
  const [notes, setNotes]         = useState<Record<string, string>>({})
  const [fitFlags, setFitFlags]   = useState<Record<string, boolean | null>>({})

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  const fetchData = async () => {
    const r = await fetch('/api/lecturer/own-topic-requests')
    if (r.ok) setRequests(await r.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const respond = async (requestId: string, action: 'accept' | 'reject') => {
    if (action === 'accept' && fitFlags[requestId] === undefined) {
      showToast('Please indicate whether the topic fits the student\'s specialisation', false); return
    }
    setResponding(requestId)
    const res = await fetch('/api/lecturer/own-topic-requests', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        requestId,
        action,
        specialisationFit: action === 'accept' ? (fitFlags[requestId] ?? null) : null,
        responseNote: notes[requestId]?.trim() || null,
      }),
    })
    if (res.ok) {
      showToast(action === 'accept' ? 'Request accepted — match created!' : 'Request rejected', true)
      await fetchData()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showToast(error ?? 'Could not process request', false)
    }
    setResponding(null)
  }

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  const pending = requests.filter(r => r.status === 'PENDING')
  const shown   = tab === 'pending' ? pending : requests

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Own-Topic Requests</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">
            Students who want to propose their own thesis topic can request you as their supervisor.
          </p>
        </div>
        {pending.length > 0 && (
          <span className="text-xs font-bold bg-amber-400 text-white px-2.5 py-1 rounded-full">
            {pending.length} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bfh-gray-border">
        {[
          { key: 'pending' as const, label: 'Pending',  count: pending.length },
          { key: 'all'     as const, label: 'All',      count: requests.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-bfh-yellow text-bfh-gray-dark bg-bfh-yellow-light'
                : 'border-transparent text-bfh-gray-mid hover:text-bfh-gray-dark'
            }`}
          >
            {t.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key ? 'bg-bfh-yellow text-bfh-gray-dark' : 'bg-bfh-gray-light text-bfh-gray-mid'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {shown.length === 0 && (
        <div className="card p-10 text-center text-bfh-gray-mid">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm">{tab === 'pending' ? 'No pending requests.' : 'No requests yet.'}</p>
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-4">
        {shown.map(req => {
          const p = req.ownTopicRequest
          const isPending = req.status === 'PENDING'
          return (
            <div key={req.id} className={`card overflow-hidden border-2 ${
              isPending ? 'border-amber-200' : 'border-bfh-gray-border'
            }`}>
              {/* Card header */}
              <div className="px-4 py-3 bg-bfh-gray-light border-b border-bfh-gray-border flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-bfh-yellow flex items-center justify-center text-bfh-gray-dark font-bold text-sm shrink-0">
                  {p.student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-bfh-gray-dark text-sm">{p.student.name}</div>
                  <div className="text-xs text-bfh-gray-mid">
                    {p.student.email} · {[p.student.programme, p.student.level].filter(Boolean).join(' / ')}
                  </div>
                  {p.student.specialisation && (
                    <div className="text-xs text-bfh-gray-mid">
                      Specialisation: <span className="font-medium">{p.student.specialisation.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLORS[req.status]}`}>
                    {req.status}
                  </span>
                  <span className="text-[10px] text-bfh-gray-mid">{p.semester.name}</span>
                </div>
              </div>

              {/* Topic details */}
              <div className="px-4 py-3 space-y-2">
                <h3 className="font-semibold text-bfh-gray-dark">{p.title}</h3>
                {p.description && (
                  <p className="text-sm text-bfh-gray-mid leading-relaxed">{p.description}</p>
                )}
                <div className="flex gap-3 flex-wrap">
                  <span className="text-[11px] bg-bfh-gray-light text-bfh-gray-mid px-2 py-0.5 rounded">
                    {METHOD_LABELS[p.method] ?? p.method}
                  </span>
                  <span className="text-[11px] bg-bfh-gray-light text-bfh-gray-mid px-2 py-0.5 rounded">
                    {LANGUAGE_LABELS[p.language] ?? p.language}
                  </span>
                </div>
                <div className="text-[10px] text-bfh-gray-mid">
                  Requested: {formatDateTime(req.createdAt)}
                </div>
              </div>

              {/* Response area — only for pending requests */}
              {isPending && (
                <div className="border-t border-bfh-gray-border px-4 py-3 space-y-3 bg-white">
                  {/* Specialisation fit flag — required for accept */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid">
                      Does this topic fit the student's programme / specialisation?
                    </label>
                    <div className="flex gap-2 mt-1">
                      {[
                        { val: true,  label: 'Yes, it fits' },
                        { val: false, label: 'Not confirmed' },
                      ].map(opt => (
                        <button
                          key={String(opt.val)}
                          onClick={() => setFitFlags(prev => ({ ...prev, [req.id]: opt.val }))}
                          className={`text-xs px-3 py-1 rounded border font-medium transition-colors ${
                            fitFlags[req.id] === opt.val
                              ? opt.val ? 'bg-green-100 border-green-300 text-green-800' : 'bg-amber-100 border-amber-300 text-amber-800'
                              : 'bg-white border-bfh-gray-border text-bfh-gray-mid hover:border-bfh-gray-mid'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional note */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid">
                      Note for student (optional)
                    </label>
                    <textarea
                      rows={2}
                      className="input mt-1 text-xs resize-none"
                      placeholder="Add a note visible to the student…"
                      value={notes[req.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      disabled={responding === req.id || fitFlags[req.id] === undefined}
                      onClick={() => respond(req.id, 'accept')}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {responding === req.id ? '…' : 'Accept & Create Match'}
                    </button>
                    <button
                      disabled={responding === req.id}
                      onClick={() => respond(req.id, 'reject')}
                      className="text-sm px-4 py-2 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Completed response info */}
              {!isPending && req.respondedAt && (
                <div className="border-t border-bfh-gray-border px-4 py-2 text-xs text-bfh-gray-mid bg-bfh-gray-light">
                  Responded {formatDateTime(req.respondedAt)}
                  {req.responseNote && <span className="ml-2 italic">· "{req.responseNote}"</span>}
                  {req.status === 'ACCEPTED' && req.specialisationFit !== null && (
                    <span className="ml-2">
                      · Fit: {req.specialisationFit ? 'Yes ✓' : 'Not confirmed'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
