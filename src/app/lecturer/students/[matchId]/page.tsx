'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import GradingSection from './GradingSection'

type FileRecord = {
  id: string; matchId: string; milestone: string
  originalName: string; storedName: string
  mimeType: string | null; size: number | null
  seenByLecturer: boolean; uploadedAt: string
}

type Progress = {
  kickoffCompleted:              boolean; kickoffCompletedAt:              string | null
  kickoffStudentConfirmed:       boolean; kickoffStudentConfirmedAt:       string | null
  proposalSubmitted:             boolean; proposalSubmittedAt:             string | null
  proposalMeetingCompleted:      boolean; proposalMeetingCompletedAt:      string | null
  proposalMeetingStudentConfirmed: boolean; proposalMeetingStudentConfirmedAt: string | null
  proposalApproved:    boolean; proposalApprovedAt:    string | null
  proposalFeedback:    string | null
  midtermSubmitted:    boolean; midtermSubmittedAt:    string | null
  midtermApproved:     boolean; midtermApprovedAt:     string | null
  midtermFeedback:     string | null
  proposalRejected:    boolean; proposalRejectedAt:    string | null
  midtermRejected:     boolean; midtermRejectedAt:     string | null
  notifyOnUpload:      boolean
  finalThesisSubmitted:   boolean; finalThesisSubmittedAt:   string | null
  finalThesisApproved:    boolean; finalThesisApprovedAt:    string | null
  finalThesisRejected:    boolean; finalThesisRejectedAt:    string | null
  finalPresentationSubmitted:   boolean; finalPresentationSubmittedAt:   string | null
  finalPresentationApproved:    boolean; finalPresentationApprovedAt:    string | null
  finalPresentationRejected:    boolean; finalPresentationRejectedAt:    string | null
}

type CoSupervisor = { id: string; name: string; email: string; addedAt: string }
type LecturerResult = { id: string; name: string; email: string }

// ── Phase definitions ─────────────────────────────────────────────────────────
const PHASES = [
  { id: 1, label: 'Kick-off',  icon: '🚀' },
  { id: 2, label: 'Proposal',  icon: '📝' },
  { id: 3, label: 'Midterm',   icon: '📊' },
  { id: 4, label: 'Final',     icon: '🎓' },
] as const

// ── Milestone definitions (12 steps grouped into 4 phases) ────────────────────
const MILESTONES = [
  { key: 'kickoffCompleted'                as const, dateKey: 'kickoffCompletedAt'                as const, phase: 1, step: 1, label: 'Kick-off meeting',          by: 'lecturer', desc: 'Confirm the kick-off meeting with the student has taken place.', feedbackKey: undefined, rejKey: null },
  { key: 'kickoffStudentConfirmed'         as const, dateKey: 'kickoffStudentConfirmedAt'         as const, phase: 1, step: 2, label: 'Confirm kick-off',           by: 'student',  desc: 'Student confirms they attended the kick-off meeting.', feedbackKey: undefined, rejKey: null },
  { key: 'proposalSubmitted'               as const, dateKey: 'proposalSubmittedAt'               as const, phase: 2, step: 1, label: 'Proposal hand in',           by: 'student',  desc: 'Student uploads their written thesis proposal.', feedbackKey: undefined, rejKey: 'proposalRejected' as const },
  { key: 'proposalMeetingCompleted'        as const, dateKey: 'proposalMeetingCompletedAt'        as const, phase: 2, step: 2, label: 'Proposal meeting',           by: 'lecturer', desc: 'Confirm the proposal meeting with the student has taken place.', feedbackKey: undefined, rejKey: null },
  { key: 'proposalMeetingStudentConfirmed' as const, dateKey: 'proposalMeetingStudentConfirmedAt' as const, phase: 2, step: 3, label: 'Confirm proposal meeting',  by: 'student',  desc: 'Student confirms they attended the proposal meeting.', feedbackKey: undefined, rejKey: null },
  { key: 'proposalApproved'               as const, dateKey: 'proposalApprovedAt'               as const, phase: 2, step: 4, label: 'Proposal approved',          by: 'lecturer', desc: 'Approve the proposal to allow the student to proceed.', feedbackKey: 'proposalFeedback' as const, rejKey: null },
  { key: 'midtermSubmitted'               as const, dateKey: 'midtermSubmittedAt'               as const, phase: 3, step: 1, label: 'Midterm presentation',       by: 'student',  desc: 'Student uploads materials from their midterm presentation.', feedbackKey: undefined, rejKey: 'midtermRejected' as const },
  { key: 'midtermApproved'               as const, dateKey: 'midtermApprovedAt'               as const, phase: 3, step: 2, label: 'Midterm approved',           by: 'lecturer', desc: 'Confirm that the midterm presentation was completed successfully.', feedbackKey: 'midtermFeedback' as const, rejKey: null },
  { key: 'finalThesisSubmitted'          as const, dateKey: 'finalThesisSubmittedAt'          as const, phase: 4, step: 1, label: 'Final Thesis',               by: 'student',  desc: 'Student uploads their completed final thesis.', feedbackKey: undefined, rejKey: 'finalThesisRejected' as const },
  { key: 'finalThesisApproved'           as const, dateKey: 'finalThesisApprovedAt'           as const, phase: 4, step: 2, label: 'Final Thesis received',     by: 'lecturer', desc: 'Confirm receipt of the final thesis.', feedbackKey: undefined, rejKey: null },
  { key: 'finalPresentationSubmitted'    as const, dateKey: 'finalPresentationSubmittedAt'    as const, phase: 4, step: 3, label: 'Final Presentation',         by: 'student',  desc: 'Student uploads materials from their final presentation.', feedbackKey: undefined, rejKey: 'finalPresentationRejected' as const },
  { key: 'finalPresentationApproved'     as const, dateKey: 'finalPresentationApprovedAt'     as const, phase: 4, step: 4, label: 'Presentation confirmed',    by: 'lecturer', desc: 'Confirm the final presentation was completed successfully.', feedbackKey: undefined, rejKey: null },
] as const

const EMPTY_PROGRESS: Progress = {
  kickoffCompleted: false, kickoffCompletedAt: null,
  kickoffStudentConfirmed: false, kickoffStudentConfirmedAt: null,
  proposalSubmitted: false, proposalSubmittedAt: null,
  proposalMeetingCompleted: false, proposalMeetingCompletedAt: null,
  proposalMeetingStudentConfirmed: false, proposalMeetingStudentConfirmedAt: null,
  proposalApproved:  false, proposalApprovedAt:  null, proposalFeedback: null,
  midtermSubmitted:  false, midtermSubmittedAt:  null,
  midtermApproved:   false, midtermApprovedAt:   null, midtermFeedback: null,
  proposalRejected:  false, proposalRejectedAt:  null,
  midtermRejected:   false, midtermRejectedAt:   null,
  notifyOnUpload: false,
  finalThesisSubmitted: false,   finalThesisSubmittedAt: null,
  finalThesisApproved:  false,   finalThesisApprovedAt:  null,
  finalThesisRejected:  false,   finalThesisRejectedAt:  null,
  finalPresentationSubmitted: false, finalPresentationSubmittedAt: null,
  finalPresentationApproved:  false, finalPresentationApprovedAt:  null,
  finalPresentationRejected:  false, finalPresentationRejectedAt:  null,
}

function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1024)         return `${b} B`
  if (b < 1024 * 1024)  return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function LecturerStudentDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const router = useRouter()

  const [match, setMatch]               = useState<any>(null)
  const [isFirstSupervisor, setIsFirst] = useState(false)
  const [progress, setProgress]         = useState<Progress>(EMPTY_PROGRESS)
  const [files, setFiles]               = useState<FileRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState<string | null>(null)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)

  // Co-supervisor state
  const [coSups, setCoSups]         = useState<CoSupervisor[]>([])
  const [coSearch, setCoSearch]     = useState('')
  const [coResults, setCoResults]   = useState<LecturerResult[]>([])
  const [coSearching, setCoSearching] = useState(false)
  const [coAdding, setCoAdding]     = useState<string | null>(null)
  const [coRemoving, setCoRemoving] = useState<string | null>(null)
  const [coMsg, setCoMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    const [matchesRes, progRes, coRes] = await Promise.all([
      fetch('/api/lecturer/students'),
      fetch(`/api/progress/${matchId}`),
      fetch(`/api/lecturer/students/${matchId}/co-supervisors`),
    ])
    const [matchesData, pd, coData] = await Promise.all([
      matchesRes.json(), progRes.json(), coRes.json(),
    ])
    // API returns { primary, co }
    const primaryMatches = matchesData?.primary ?? []
    const found = [...primaryMatches, ...(matchesData?.co ?? [])].find((m: any) => m.id === matchId) ?? null
    setMatch(found ?? null)
    setIsFirst(primaryMatches.some((m: any) => m.id === matchId))
    const prog = pd?.progress ?? EMPTY_PROGRESS
    setProgress(prog)
    setFiles(pd?.files ?? [])
    setCoSups(Array.isArray(coData) ? coData : [])
    setFeedbackDraft({
      proposalFeedback: prog.proposalFeedback ?? '',
      midtermFeedback:  prog.midtermFeedback  ?? '',
    })
    setLoading(false)

    // Mark all unseen files as seen
    fetch(`/api/progress/${matchId}/mark-seen`, { method: 'POST' })
  }

  useEffect(() => { fetchData() }, [matchId])

  const toggleMilestone = async (field: string, current: boolean) => {
    setSaving(field)
    const res = await fetch(`/api/progress/${matchId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: !current }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProgress(updated)
      showToast(!current ? 'Milestone marked complete' : 'Milestone unmarked', true)
    } else {
      showToast('Could not update milestone', false)
    }
    setSaving(null)
  }

  const toggleNotify = async (current: boolean) => {
    setSaving('notifyOnUpload')
    const res = await fetch(`/api/progress/${matchId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ notifyOnUpload: !current }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProgress(updated)
      showToast(!current ? 'Notifications enabled' : 'Notifications disabled', true)
    } else {
      showToast('Could not update notification setting', false)
    }
    setSaving(null)
  }

  const saveFeedback = async (field: 'proposalFeedback' | 'midtermFeedback') => {
    const text = feedbackDraft[field] ?? ''
    if (text === (progress[field] ?? '')) return // unchanged
    setSavingFeedback(field)
    const res = await fetch(`/api/progress/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: text || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProgress(updated)
    }
    setSavingFeedback(null)
  }

  // ── Co-supervisor management ───────────────────────────────────────────────
  const handleCoSearch = (q: string) => {
    setCoSearch(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setCoResults([]); return }
    setCoSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const r = await fetch(`/api/lecturers?search=${encodeURIComponent(q)}`)
      setCoResults(r.ok ? await r.json() : [])
      setCoSearching(false)
    }, 300)
  }

  const addCoSup = async (lecturer: LecturerResult) => {
    setCoAdding(lecturer.id)
    const res = await fetch(`/api/lecturer/students/${matchId}/co-supervisors`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lecturerId: lecturer.id }),
    })
    if (res.ok) {
      setCoSups(prev => [...prev, { ...lecturer, addedAt: new Date().toISOString() }])
      setCoResults(prev => prev.filter(r => r.id !== lecturer.id))
      setCoMsg({ text: `${lecturer.name} added as co-supervisor`, ok: true })
    } else {
      const { error: err } = await res.json()
      setCoMsg({ text: err ?? 'Could not add co-supervisor', ok: false })
    }
    setCoAdding(null)
    setTimeout(() => setCoMsg(null), 3000)
  }

  const removeCoSup = async (lecturerId: string) => {
    setCoRemoving(lecturerId)
    await fetch(`/api/lecturer/students/${matchId}/co-supervisors`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lecturerId }),
    })
    setCoSups(prev => prev.filter(cs => cs.id !== lecturerId))
    setCoRemoving(null)
  }

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
  if (!match)  return <div className="text-center py-12 text-bfh-gray-mid">Student not found.</div>

  const completedCount = MILESTONES.filter(m => progress[m.key]).length

  // Group milestones by phase for display
  const milestonesByPhase = PHASES.map(phase => ({
    ...phase,
    milestones: MILESTONES.filter(m => m.phase === phase.id),
    completed: MILESTONES.filter(m => m.phase === phase.id && progress[m.key]).length,
    total: MILESTONES.filter(m => m.phase === phase.id).length,
  }))

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/lecturer/students')} className="text-sm text-bfh-gray-mid hover:text-bfh-gray-dark transition-colors">
        ← Back to My Students
      </button>

      {/* Student info card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-bfh-yellow flex items-center justify-center text-bfh-gray-dark text-lg font-bold shrink-0">
            {match.student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-bfh-gray-dark">{match.student.name}</h1>
            <a href={`mailto:${match.student.email}`} className="text-sm text-bfh-red hover:underline">{match.student.email}</a>
            {(match.student.programme || match.student.level) && (
              <p className="text-xs text-bfh-gray-mid mt-1">
                {[match.student.programme, match.student.level].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-bfh-gray-border text-sm">
          <span className="text-bfh-gray-mid font-medium">Topic: </span>
          <span className="text-bfh-gray-dark">{match.topic.title}</span>
        </div>
        <div className="mt-1 text-xs text-bfh-gray-mid">
          Semester: {match.semester.name} · Matched: {formatDateTime(match.matchedAt)}
        </div>
      </div>

      {/* ── Co-supervisor section ──────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-bfh-gray-dark">Co-Supervisors</h2>
          <p className="text-xs text-bfh-gray-mid mt-0.5">
            Co-supervisors can view progress and download submissions for this student.
          </p>
        </div>

        {coSups.length > 0 ? (
          <div className="space-y-2">
            {coSups.map(cs => (
              <div key={cs.id} className="flex items-center gap-3 bg-bfh-gray-light rounded-lg px-3 py-2.5">
                <div className="h-8 w-8 rounded-full bg-bfh-red flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {cs.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-bfh-gray-dark">{cs.name}</div>
                  <div className="text-xs text-bfh-gray-mid">{cs.email}</div>
                </div>
                {isFirstSupervisor && (
                  <button
                    disabled={coRemoving === cs.id}
                    onClick={() => removeCoSup(cs.id)}
                    className="shrink-0 text-xs text-bfh-gray-mid hover:text-red-600 transition-colors disabled:opacity-40"
                    title="Remove co-supervisor"
                  >
                    {coRemoving === cs.id ? '…' : '✕ Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-bfh-gray-mid italic">No co-supervisors assigned yet.</p>
        )}

        {isFirstSupervisor && (
          <div>
            <label className="label">Add co-supervisor</label>
            <div className="relative">
              <input
                type="text"
                className="input pr-8"
                placeholder="Search by name or email…"
                value={coSearch}
                onChange={e => handleCoSearch(e.target.value)}
              />
              {coSearching && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bfh-gray-mid text-xs">…</span>
              )}
            </div>
            {coResults.length > 0 && (
              <div className="mt-1 border border-bfh-gray-border rounded-lg overflow-hidden shadow-sm">
                {coResults
                  .filter(r => !coSups.some(cs => cs.id === r.id))
                  .map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-bfh-gray-light border-b border-bfh-gray-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-bfh-gray-dark">{r.name}</div>
                        <div className="text-xs text-bfh-gray-mid">{r.email}</div>
                      </div>
                      <button
                        disabled={coAdding === r.id}
                        onClick={() => addCoSup(r)}
                        className="shrink-0 text-xs btn-primary py-1 px-2.5 disabled:opacity-50"
                      >
                        {coAdding === r.id ? '…' : '+ Add'}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {coMsg && (
          <div className={`text-xs px-3 py-2 rounded border ${coMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {coMsg.text}
          </div>
        )}
      </div>

      {/* ── Progress tracker ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Header row with notification toggle and overall progress */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-bfh-gray-dark">Thesis Progress</h2>
              <span className="text-xs font-medium text-bfh-gray-mid bg-bfh-gray-light px-2.5 py-1 rounded-full">
                {completedCount} / {MILESTONES.length} steps
              </span>
            </div>

            {/* Notification toggle */}
            <button
              onClick={() => toggleNotify(progress.notifyOnUpload)}
              disabled={saving === 'notifyOnUpload'}
              title={progress.notifyOnUpload ? 'Notifications on — click to disable' : 'Notifications off — click to enable'}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                progress.notifyOnUpload
                  ? 'bg-bfh-yellow border-bfh-yellow text-bfh-gray-dark'
                  : 'bg-white border-bfh-gray-border text-bfh-gray-mid hover:border-bfh-gray-mid'
              }`}
            >
              <span className="text-base leading-none">{progress.notifyOnUpload ? '🔔' : '🔕'}</span>
              <span>{progress.notifyOnUpload ? 'Notify on upload' : 'Notifications off'}</span>
            </button>
          </div>

          {/* Overall progress bar */}
          <div className="w-full bg-bfh-gray-border rounded-full h-1.5 mb-3">
            <div className="h-1.5 rounded-full bg-bfh-yellow transition-all duration-500"
              style={{ width: `${(completedCount / MILESTONES.length) * 100}%` }} />
          </div>

          {/* Phase summary pills */}
          <div className="flex gap-2 flex-wrap">
            {milestonesByPhase.map(phase => (
              <div key={phase.id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
                phase.completed === phase.total
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : phase.completed > 0
                    ? 'bg-bfh-yellow/20 border-bfh-yellow text-bfh-gray-dark'
                    : 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid'
              }`}>
                <span>{phase.icon}</span>
                <span>{phase.id}. {phase.label}</span>
                <span className="opacity-70">{phase.completed}/{phase.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase cards */}
        {milestonesByPhase.map(phase => {
          const phaseDone    = phase.completed === phase.total
          const phaseStarted = phase.completed > 0

          return (
            <div key={phase.id} className="card overflow-hidden">
              {/* Phase header */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${
                phaseDone ? 'bg-green-50 border-green-200' : phaseStarted ? 'bg-bfh-yellow/10 border-bfh-yellow/40' : 'bg-bfh-gray-light border-bfh-gray-border'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{phase.icon}</span>
                  <div>
                    <span className="text-xs font-semibold text-bfh-gray-mid uppercase tracking-wider">Phase {phase.id}</span>
                    <h3 className={`font-bold text-sm leading-tight ${phaseDone ? 'text-green-800' : 'text-bfh-gray-dark'}`}>
                      {phase.label}
                    </h3>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  phaseDone ? 'bg-green-200 text-green-800' : 'bg-bfh-gray-border text-bfh-gray-mid'
                }`}>
                  {phase.completed}/{phase.total}
                </span>
              </div>

              {/* Steps within phase */}
              <div className="divide-y divide-bfh-gray-border">
                {phase.milestones.map((m) => {
                  const globalIdx  = MILESTONES.findIndex(x => x.key === m.key)
                  const done       = progress[m.key]
                  const dateVal    = progress[m.dateKey]
                  const isLecturer = m.by === 'lecturer'
                  const isSaving   = saving === m.key
                  const prevDone   = globalIdx === 0 || progress[MILESTONES[globalIdx - 1].key]
                  const milestoneFiles = files.filter(f => f.milestone === m.key)
                  const hasNew     = milestoneFiles.some(f => !f.seenByLecturer)
                  const rejKey     = m.rejKey
                  const isRejected = rejKey ? progress[rejKey] : false
                  const feedbackKey = m.feedbackKey as 'proposalFeedback' | 'midtermFeedback' | undefined

                  return (
                    <div key={m.key} className={`transition-colors ${
                      done        ? 'bg-green-50/60'
                      : isRejected ? 'bg-red-50'
                      : !prevDone  ? 'bg-bfh-gray-light opacity-60'
                      :              'bg-white'
                    }`}>
                      <div className="flex items-start gap-3 p-4">
                        {/* Step number badge (phase.step format) */}
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                          done ? 'bg-green-500 text-white'
                          : isRejected ? 'bg-red-400 text-white'
                          : 'bg-bfh-gray-border text-bfh-gray-mid'
                        }`}>
                          {done ? '✓' : isRejected ? '✗' : `${m.phase}.${m.step}`}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${
                              done ? 'text-green-800' : isRejected ? 'text-red-700' : 'text-bfh-gray-dark'
                            }`}>{m.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isLecturer ? 'bg-bfh-red text-white' : 'bg-bfh-yellow text-bfh-gray-dark'
                            }`}>
                              {isLecturer ? 'You' : 'Student'}
                            </span>
                            {hasNew && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-400 text-white animate-pulse">
                                New upload
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">
                                Rework requested
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-bfh-gray-mid mt-0.5">{m.desc}</p>
                          {done && dateVal && <p className="text-xs text-green-700 mt-1">✓ {formatDateTime(dateVal)}</p>}
                          {isRejected && !done && (
                            <p className="text-xs text-red-600 mt-1 italic">Waiting for student to re-upload a reworked version.</p>
                          )}
                          {!isLecturer && !done && !isRejected && prevDone && (
                            <p className="text-xs text-bfh-gray-mid italic mt-1">Waiting for student upload</p>
                          )}
                        </div>

                        {/* Approve / Undo — lecturer steps */}
                        {isLecturer && prevDone && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              disabled={isSaving}
                              onClick={() => toggleMilestone(m.key, done)}
                              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                                done ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'btn-primary text-xs py-1.5'
                              }`}
                            >
                              {isSaving ? '…' : done ? 'Undo' : 'Approve'}
                            </button>
                          </div>
                        )}

                        {/* Request Rework — on student steps when submitted but not yet approved */}
                        {!isLecturer && done && !isRejected && (() => {
                          const nextMilestone = MILESTONES[globalIdx + 1]
                          const nextApproved  = nextMilestone ? progress[nextMilestone.key] : false
                          return !nextApproved && rejKey
                        })() && (
                          <button
                            disabled={isSaving}
                            onClick={() => toggleMilestone(rejKey!, !isRejected)}
                            className="shrink-0 text-xs px-3 py-1.5 rounded font-medium border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {isSaving ? '…' : 'Request Rework'}
                          </button>
                        )}

                        {/* Cancel rework */}
                        {isRejected && rejKey && (
                          <button
                            disabled={isSaving}
                            onClick={() => toggleMilestone(rejKey, true)}
                            className="shrink-0 text-xs px-3 py-1.5 rounded font-medium text-bfh-gray-mid hover:text-bfh-gray-dark border border-bfh-gray-border bg-white transition-colors disabled:opacity-50"
                          >
                            {isSaving ? '…' : 'Cancel'}
                          </button>
                        )}
                      </div>

                      {/* Feedback textarea — for proposal/midterm approval steps */}
                      {feedbackKey && isLecturer && (
                        <div className="border-t border-bfh-gray-border mx-4 mb-3 pt-2">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid flex items-center gap-2">
                            Feedback for student
                            {savingFeedback === feedbackKey && <span className="text-bfh-gray-mid font-normal normal-case">Saving…</span>}
                            {savingFeedback !== feedbackKey && feedbackDraft[feedbackKey] === (progress[feedbackKey] ?? '') && feedbackDraft[feedbackKey] && (
                              <span className="text-green-600 font-normal normal-case">Saved</span>
                            )}
                          </label>
                          <textarea
                            rows={3}
                            className="input mt-1 text-xs resize-none"
                            placeholder="Add feedback or notes for the student…"
                            value={feedbackDraft[feedbackKey] ?? ''}
                            onChange={e => setFeedbackDraft(prev => ({ ...prev, [feedbackKey]: e.target.value }))}
                            onBlur={() => saveFeedback(feedbackKey)}
                          />
                        </div>
                      )}

                      {/* Uploaded files */}
                      {milestoneFiles.length > 0 && (
                        <div className="border-t border-bfh-gray-border mx-4 mb-3 pt-2 space-y-1.5">
                          <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider mb-1">
                            Uploaded files
                          </p>
                          {milestoneFiles.map(f => (
                            <div key={f.id} className={`flex items-center gap-2 rounded px-2 py-1.5 border ${
                              !f.seenByLecturer ? 'bg-amber-50 border-amber-200' : 'bg-white border-bfh-gray-border'
                            }`}>
                              <span className="text-base">📄</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
                                <div className="text-[10px] text-bfh-gray-mid">
                                  {formatBytes(f.size)} · {formatDateTime(f.uploadedAt)}
                                  {!f.seenByLecturer && <span className="ml-1.5 text-amber-600 font-semibold">New</span>}
                                </div>
                              </div>
                              <a
                                href={`/api/files/${f.matchId}/${f.storedName}`}
                                download={f.originalName}
                                onClick={() => setFiles(prev => prev.map(x => x.id === f.id ? { ...x, seenByLecturer: true } : x))}
                                className="shrink-0 text-xs px-2.5 py-1 rounded bg-bfh-red text-white hover:bg-bfh-red-dark transition-colors"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Thesis Grading */}
      <GradingSection
        matchId={matchId}
        studentLevel={match.student.level ?? null}
        isSupervisor={isFirstSupervisor}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
