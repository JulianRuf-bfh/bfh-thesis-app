'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { PreferencesList } from '@/components/PreferencesList'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { PreferenceWithTopic } from '@/types'

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
  supervisorRequests: SupervisorRequest[]
  semester: { id: string; name: string }
}

type LecturerResult = { id: string; name: string; email: string }

type PathChoice = 'algorithm' | 'own-topic' | null

// ── Constants ─────────────────────────────────────────────────────────────────

const METHODS = [
  { value: 'QUANTITATIVE',            label: 'Quantitative' },
  { value: 'QUALITATIVE',             label: 'Qualitative' },
  { value: 'DESIGN_SCIENCE_RESEARCH', label: 'Design Science Research' },
  { value: 'LITERATURE_REVIEW',       label: 'Literature Review' },
]
const LANGUAGES = [
  { value: 'GERMAN',  label: 'German' },
  { value: 'ENGLISH', label: 'English' },
  { value: 'BOTH',    label: 'German or English' },
]
const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-bfh-gray-light text-bfh-gray-mid border-bfh-gray-border',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  MATCHED:   'bg-green-50 text-green-700 border-green-200',
  WITHDRAWN: 'bg-red-50 text-red-700 border-red-200',
}
const REQ_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  ACCEPTED:  'bg-green-50 text-green-700 border-green-200',
  REJECTED:  'bg-red-50 text-red-700 border-red-200',
  WITHDRAWN: 'bg-bfh-gray-light text-bfh-gray-mid border-bfh-gray-border',
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast }: { toast: { msg: string; ok: boolean } | null }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {toast.msg}
    </div>
  )
}

// ── Path Chooser ──────────────────────────────────────────────────────────────

function PathChooser({ onChoose }: { onChoose: (p: 'algorithm' | 'own-topic') => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1>My Thesis</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">
          How would you like to find your thesis topic? Choose one of the two paths below.
          You can change your mind any time before you commit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Algorithm path */}
        <button
          onClick={() => onChoose('algorithm')}
          className="card p-6 text-left hover:border-bfh-yellow hover:shadow-md transition-all group border-2 border-transparent"
        >
          <div className="text-3xl mb-3"></div>
          <h2 className="font-semibold text-bfh-gray-dark group-hover:text-bfh-gray-dark mb-1">
            Choose from offered topics
          </h2>
          <p className="text-sm text-bfh-gray-mid leading-relaxed">
            Browse the list of predefined thesis topics and rank your favourites.
            The matching algorithm will assign you to the best available topic.
          </p>
          <div className="mt-4 text-xs font-semibold text-bfh-yellow uppercase tracking-wider">
            Automatic matching →
          </div>
        </button>

        {/* Own-topic path */}
        <button
          onClick={() => onChoose('own-topic')}
          className="card p-6 text-left hover:border-bfh-yellow hover:shadow-md transition-all group border-2 border-transparent"
        >
          <div className="text-3xl mb-3"></div>
          <h2 className="font-semibold text-bfh-gray-dark group-hover:text-bfh-gray-dark mb-1">
            Propose your own topic
          </h2>
          <p className="text-sm text-bfh-gray-mid leading-relaxed">
            Have your own research idea? Write a short proposal and directly request
            a lecturer to supervise your thesis.
          </p>
          <div className="mt-4 text-xs font-semibold text-bfh-yellow uppercase tracking-wider">
            Direct supervisor request →
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentMyThesisPage() {
  const [loading, setLoading]   = useState(true)
  const [path, setPath]         = useState<PathChoice>(null)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Algorithm path state ──────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<PreferenceWithTopic[]>([])
  const [semester, setSemester]       = useState<{ studentDeadline: string; name: string; matchingRun?: boolean } | null>(null)
  const [saving, setSaving]           = useState(false)

  // ── Own-topic path state ──────────────────────────────────────────────────
  const [proposal, setProposal]       = useState<Proposal | null>(null)
  const [propSaving, setPropSaving]   = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [title, setTitle]             = useState('')
  const [desc, setDesc]               = useState('')
  const [method, setMethod]           = useState('')
  const [language, setLanguage]       = useState('')
  const [formDirty, setFormDirty]     = useState(false)

  // Supervisor search
  const [search, setSearch]               = useState('')
  const [searchResults, setResults]       = useState<LecturerResult[]>([])
  const [searching, setSearching]         = useState(false)
  const [sending, setSending]             = useState<string | null>(null)
  const [withdrawingReq, setWithdrawingReq] = useState<string | null>(null)
  const searchTimer = useRef<NodeJS.Timeout | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const [prefRes, ownRes, semRes] = await Promise.all([
      fetch('/api/preferences'),
      fetch('/api/student/own-topic'),
      fetch('/api/admin/semesters').then(r => r.json()).catch(() => []),
    ])

    const prefs: PreferenceWithTopic[] = prefRes.ok ? await prefRes.json() : []
    const own: Proposal | null         = ownRes.ok  ? await ownRes.json()  : null
    const sems = Array.isArray(semRes) ? semRes : []

    setPreferences(prefs)

    if (own) {
      setProposal(own)
      setTitle(own.title)
      setDesc(own.description ?? '')
      setMethod(own.method)
      setLanguage(own.language)
    }

    const active = sems.find((s: any) => s.isActive)
    if (active) setSemester(active)

    // Derive path from existing data
    if (own && own.status !== 'WITHDRAWN') {
      setPath('own-topic')
    } else if (prefs.length > 0) {
      setPath('algorithm')
    }
    // else: path stays null → show chooser

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Algorithm path handlers ───────────────────────────────────────────────

  const moveUp = async (topicId: string) => {
    const sorted = [...preferences].sort((a, b) => a.rank - b.rank)
    const idx = sorted.findIndex(p => p.topic.id === topicId)
    if (idx <= 0) return
    ;[sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]]
    await saveOrder(sorted.map(p => p.topic.id))
  }

  const moveDown = async (topicId: string) => {
    const sorted = [...preferences].sort((a, b) => a.rank - b.rank)
    const idx = sorted.findIndex(p => p.topic.id === topicId)
    if (idx < 0 || idx >= sorted.length - 1) return
    ;[sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]]
    await saveOrder(sorted.map(p => p.topic.id))
  }

  const saveOrder = async (orderedTopicIds: string[]) => {
    setSaving(true)
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedTopicIds }),
    })
    if (res.ok) {
      setPreferences(prev => {
        const map = new Map(prev.map(p => [p.topic.id, p]))
        return orderedTopicIds.map((id, idx) => ({ ...map.get(id)!, rank: idx + 1 }))
      })
      showToast('Order saved', true)
    } else {
      const { error } = await res.json()
      showToast(error ?? 'Could not save order', false)
    }
    setSaving(false)
  }

  const removePreference = async (topicId: string) => {
    setSaving(true)
    const res = await fetch('/api/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId }),
    })
    if (res.ok) {
      setPreferences(prev => {
        const filtered = prev.filter(p => p.topic.id !== topicId).sort((a, b) => a.rank - b.rank)
        return filtered.map((p, idx) => ({ ...p, rank: idx + 1 }))
      })
      showToast('Preference removed', true)
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Could not remove preference' }))
      showToast(error ?? 'Could not remove preference', false)
    }
    setSaving(false)
  }

  // ── Own-topic handlers ────────────────────────────────────────────────────

  const saveProposal = async () => {
    if (!title.trim() || !method || !language) {
      showToast('Please fill in all required fields', false); return
    }
    setPropSaving(true)
    const res = await fetch('/api/student/own-topic', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, description: desc, method, language }),
    })
    if (res.ok) {
      const data = await res.json()
      setProposal(data)
      setFormDirty(false)
      showToast('Proposal saved', true)
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showToast(error ?? 'Could not save', false)
    }
    setPropSaving(false)
  }

  const withdrawProposal = async () => {
    if (!confirm('Withdraw your proposal? All pending supervisor requests will be cancelled.')) return
    setWithdrawing(true)
    const res = await fetch('/api/student/own-topic', { method: 'DELETE' })
    if (res.ok) {
      showToast('Proposal withdrawn', true)
      setProposal(null)
      setTitle(''); setDesc(''); setMethod(''); setLanguage('')
      setPath(null) // back to chooser
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showToast(error ?? 'Could not withdraw', false)
    }
    setWithdrawing(false)
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/lecturers?search=${encodeURIComponent(q)}`)
      setResults(r.ok ? await r.json() : [])
      setSearching(false)
    }, 300)
  }

  const sendRequest = async (lecturerId: string) => {
    if (!proposal) { showToast('Save your proposal first', false); return }
    setSending(lecturerId)
    const res = await fetch('/api/student/own-topic/requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lecturerId }),
    })
    if (res.ok) {
      showToast('Request sent', true)
      setSearch(''); setResults([])
      await fetchData()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showToast(error ?? 'Could not send request', false)
    }
    setSending(null)
  }

  const withdrawRequest = async (lecturerId: string) => {
    setWithdrawingReq(lecturerId)
    const res = await fetch('/api/student/own-topic/requests', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lecturerId }),
    })
    if (res.ok) {
      showToast('Request withdrawn', true)
      await fetchData()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showToast(error ?? 'Could not withdraw', false)
    }
    setWithdrawingReq(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  // Show path chooser
  if (path === null) {
    return (
      <>
        <PathChooser onChoose={setPath} />
        <Toast toast={toast} />
      </>
    )
  }

  // ── Algorithm path ────────────────────────────────────────────────────────

  if (path === 'algorithm') {
    const matchingRun  = !!semester?.matchingRun
    const deadlinePassed = semester ? new Date() > new Date(semester.studentDeadline) : false
    const locked = matchingRun || deadlinePassed

    const switchToOwnTopic = async () => {
      if (matchingRun) {
        showToast('Matching has already been run — switching is no longer possible', false)
        return
      }
      if (preferences.length > 0) {
        if (!confirm('Switching to your own topic will remove your saved preferences. Continue?')) return
        for (const pref of preferences) {
          await fetch('/api/preferences', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId: pref.topic.id }),
          })
        }
        setPreferences([])
      }
      setPath('own-topic')
    }

    return (
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1>My Thesis</h1>
              <span className="text-xs font-semibold bg-bfh-yellow text-bfh-gray-dark px-2 py-0.5 rounded uppercase tracking-wider">
                Automatic matching
              </span>
            </div>
            <p className="text-sm text-bfh-gray-mid">
              Rank your topics from most (1) to least (4) preferred. Drag rows or use the ▲ ▼ arrows.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a href="/student" className="btn-secondary text-xs">Browse Topics</a>
            {!locked && (
              <button
                onClick={switchToOwnTopic}
                className="text-xs text-bfh-gray-mid hover:text-bfh-gray-dark border border-bfh-gray-border rounded px-3 py-1.5 transition-colors"
              >
                Switch to own topic
              </button>
            )}
          </div>
        </div>

        {/* Status banner */}
        {semester && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            matchingRun  ? 'bg-amber-50 border-amber-200 text-amber-800' :
            deadlinePassed ? 'bg-red-50 border-red-200 text-red-700' :
                             'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {matchingRun
              ? 'The matching algorithm has been run. Your preferences are locked and can no longer be changed.'
              : deadlinePassed
              ? `Submission deadline has passed (${formatDate(semester.studentDeadline)}). Preferences are locked.`
              : `Deadline: ${formatDate(semester.studentDeadline)} — you can still change your preferences until then.`}
          </div>
        )}

        {/* Rank slots */}
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(rank => {
            const pref = preferences.find(p => p.rank === rank)
            return (
              <div key={rank} className={`flex-1 rounded-lg border-2 p-2 text-center text-xs ${pref ? 'border-bfh-yellow bg-bfh-yellow-light' : 'border-dashed border-bfh-gray-border bg-white'}`}>
                <div className="font-bold text-bfh-gray-dark">#{rank}</div>
                <div className="text-bfh-gray-mid truncate">{pref ? pref.topic.title.substring(0, 20) + '…' : 'Empty'}</div>
              </div>
            )
          })}
        </div>

        <PreferencesList
          preferences={preferences}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onRemove={removePreference}
          onReorder={saveOrder}
          saving={saving || locked}
        />

        {preferences.length < 4 && !locked && (
          <div className="text-center">
            <p className="text-sm text-bfh-gray-mid mb-2">You have {4 - preferences.length} preference slot(s) remaining.</p>
            <a href="/student" className="btn-primary text-sm">Browse More Topics</a>
          </div>
        )}

        <Toast toast={toast} />
      </div>
    )
  }

  // ── Own-topic path ────────────────────────────────────────────────────────

  const isLocked = proposal?.status === 'MATCHED' || proposal?.status === 'WITHDRAWN'
  const canSwitchToAlgorithm = !proposal || proposal.status === 'WITHDRAWN' ||
    (proposal.status === 'DRAFT' && (proposal.supervisorRequests?.length ?? 0) === 0)
  const alreadyRequested = new Set(
    proposal?.supervisorRequests
      .filter(r => ['PENDING', 'ACCEPTED'].includes(r.status))
      .map(r => r.lecturerId) ?? []
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1>My Thesis</h1>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase tracking-wider">
              Own topic
            </span>
          </div>
          <p className="text-sm text-bfh-gray-mid">
            Propose your own thesis topic and request a supervisor directly.
          </p>
        </div>
        {canSwitchToAlgorithm && !isLocked && (
          <button
            onClick={async () => {
              if (proposal && proposal.status === 'DRAFT') {
                // Silently withdraw the draft before switching
                await fetch('/api/student/own-topic', { method: 'DELETE' })
                setProposal(null)
                setTitle(''); setDesc(''); setMethod(''); setLanguage('')
              }
              setPath('algorithm')
            }}
            className="text-xs text-bfh-gray-mid hover:text-bfh-gray-dark border border-bfh-gray-border rounded px-3 py-1.5 transition-colors"
          >
            Switch to automatic matching
          </button>
        )}
      </div>

      {/* Status banners */}
      {proposal?.status === 'MATCHED' && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium flex items-center gap-2">
          <span className="text-lg"></span>
          A supervisor has accepted your proposal! Track your progress under{' '}
          <a href="/student/progress" className="underline">Thesis Progress</a>.
        </div>
      )}
      {proposal?.status === 'WITHDRAWN' && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          Your proposal has been withdrawn. Fill in the form below to start a new one,
          or{' '}
          <button onClick={() => setPath(null)} className="underline font-medium">
            switch to automatic matching
          </button>.
        </div>
      )}

      {/* Proposal form */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-bfh-gray-dark">Topic Proposal</h2>
          {proposal && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded border ${STATUS_COLORS[proposal.status] ?? ''}`}>
              {proposal.status}
            </span>
          )}
        </div>

        <div>
          <label className="label">Title <span className="text-bfh-red">*</span></label>
          <input
            className="input"
            placeholder="Working title of your proposed thesis"
            value={title}
            disabled={isLocked}
            onChange={e => { setTitle(e.target.value); setFormDirty(true) }}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            rows={4}
            className="input resize-none"
            placeholder="Briefly describe your topic, research questions, or motivation…"
            value={desc}
            disabled={isLocked}
            onChange={e => { setDesc(e.target.value); setFormDirty(true) }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Method <span className="text-bfh-red">*</span></label>
            <select
              className="input"
              value={method}
              disabled={isLocked}
              onChange={e => { setMethod(e.target.value); setFormDirty(true) }}
            >
              <option value="">Select…</option>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Language <span className="text-bfh-red">*</span></label>
            <select
              className="input"
              value={language}
              disabled={isLocked}
              onChange={e => { setLanguage(e.target.value); setFormDirty(true) }}
            >
              <option value="">Select…</option>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {!isLocked && (
          <div className="flex items-center gap-3 pt-1">
            <button
              disabled={propSaving || !formDirty}
              onClick={saveProposal}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {propSaving ? 'Saving…' : proposal && proposal.status !== 'WITHDRAWN' ? 'Save Changes' : 'Save Proposal'}
            </button>
            {proposal && !['MATCHED', 'WITHDRAWN'].includes(proposal.status) && (
              <button
                disabled={withdrawing}
                onClick={withdrawProposal}
                className="text-sm text-bfh-gray-mid hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {withdrawing ? '…' : 'Withdraw proposal'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Supervisor request section */}
      {proposal && !['MATCHED', 'WITHDRAWN'].includes(proposal.status) && (
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-bfh-gray-dark">Request a Supervisor</h2>
            <p className="text-xs text-bfh-gray-mid mt-0.5">
              Search for a lecturer and send them a supervision request. You can request multiple supervisors simultaneously.
            </p>
          </div>

          {!isLocked && (
            <div className="relative">
              <input
                type="text"
                className="input pr-8"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-bfh-gray-mid text-xs">…</span>
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-10 overflow-hidden">
                  {searchResults
                    .filter(r => !alreadyRequested.has(r.id))
                    .map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-bfh-gray-light border-b border-bfh-gray-border last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-bfh-gray-dark">{r.name}</div>
                          <div className="text-xs text-bfh-gray-mid">{r.email}</div>
                        </div>
                        <button
                          disabled={sending === r.id || formDirty}
                          onClick={() => sendRequest(r.id)}
                          className="shrink-0 text-xs btn-primary py-1 px-2.5 disabled:opacity-50"
                          title={formDirty ? 'Save your proposal changes first' : undefined}
                        >
                          {sending === r.id ? '…' : 'Request'}
                        </button>
                      </div>
                    ))}
                  {searchResults.every(r => alreadyRequested.has(r.id)) && (
                    <div className="px-3 py-2 text-xs text-bfh-gray-mid italic">All results already requested.</div>
                  )}
                </div>
              )}
            </div>
          )}
          {formDirty && (
            <p className="text-xs text-amber-600">Save your proposal changes before sending requests.</p>
          )}
        </div>
      )}

      {/* Requests list */}
      {proposal && proposal.supervisorRequests.length > 0 && (
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-bfh-gray-dark">Supervisor Requests</h2>
          <div className="space-y-2">
            {proposal.supervisorRequests.map(r => (
              <div key={r.id} className={`rounded-lg border p-3 ${REQ_STATUS_COLORS[r.status] ?? ''}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.lecturer.name}</div>
                    <div className="text-xs opacity-75">{r.lecturer.email}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{r.status}</span>
                  {r.status === 'PENDING' && (
                    <button
                      disabled={withdrawingReq === r.lecturerId}
                      onClick={() => withdrawRequest(r.lecturerId)}
                      className="text-xs text-bfh-gray-mid hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {withdrawingReq === r.lecturerId ? '…' : 'Withdraw'}
                    </button>
                  )}
                </div>
                {r.status === 'ACCEPTED' && r.specialisationFit !== null && (
                  <div className="mt-2 text-xs">
                    Specialisation fit:{' '}
                    <span className={r.specialisationFit ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
                      {r.specialisationFit ? 'Yes ✓' : 'Not confirmed'}
                    </span>
                  </div>
                )}
                {r.responseNote && (
                  <p className="mt-1.5 text-xs opacity-90 italic">"{r.responseNote}"</p>
                )}
                {r.respondedAt && (
                  <p className="mt-1 text-[10px] opacity-60">{formatDateTime(r.respondedAt)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}
