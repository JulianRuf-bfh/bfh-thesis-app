'use client'
import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '@/lib/utils'

type FileRecord = {
  id: string; matchId: string; milestone: string
  originalName: string; storedName: string
  mimeType: string | null; size: number | null
  uploadedAt: string
}

const MAX_UPLOADS = 2

type Progress = {
  kickoffCompleted:              boolean; kickoffCompletedAt:              string | null
  kickoffStudentConfirmed:       boolean; kickoffStudentConfirmedAt:       string | null
  proposalSubmitted:             boolean; proposalSubmittedAt:             string | null
  proposalMeetingCompleted:      boolean; proposalMeetingCompletedAt:      string | null
  proposalMeetingStudentConfirmed: boolean; proposalMeetingStudentConfirmedAt: string | null
  proposalApproved:    boolean; proposalApprovedAt:    string | null
  proposalFeedback:    string | null
  midtermSubmitted:    boolean; midtermSubmittedAt:    string | null
  midtermMeetingCompleted:       boolean; midtermMeetingCompletedAt:       string | null
  midtermReflectionSubmitted:    boolean; midtermReflectionSubmittedAt:    string | null
  midtermReflectionRejected:     boolean; midtermReflectionRejectedAt:     string | null
  midtermApproved:     boolean; midtermApprovedAt:     string | null
  midtermFeedback:     string | null
  midtermRejected:     boolean; midtermRejectedAt:     string | null
  proposalRejected:    boolean; proposalRejectedAt:    string | null
  notifyOnUpload:      boolean
  proposalUploadCount: number
  midtermUploadCount:  number
  finalThesisSubmitted:   boolean; finalThesisSubmittedAt:   string | null
  finalThesisApproved:    boolean; finalThesisApprovedAt:    string | null
  finalThesisRejected:    boolean; finalThesisRejectedAt:    string | null
  finalThesisUploadCount: number
  finalPresentationSubmitted:   boolean; finalPresentationSubmittedAt:   string | null
  finalPresentationApproved:    boolean; finalPresentationApprovedAt:    string | null
  finalPresentationRejected:    boolean; finalPresentationRejectedAt:    string | null
  finalPresentationUploadCount: number
}

// ── Phase definitions ─────────────────────────────────────────────────────────
const PHASES = [
  { id: 1, label: 'Kick-off',  icon: '🚀' },
  { id: 2, label: 'Proposal',  icon: '📝' },
  { id: 3, label: 'Midterm',   icon: '📊' },
  { id: 4, label: 'Final',     icon: '🎓' },
] as const

// ── Milestone definitions ─────────────────────────────────────────────────────
// Phase 3 (Midterm) has been expanded to 4 steps:
//   3.1 Upload Materials (presentation + paper, two separate files in one step)
//   3.2 Supervisor confirms presentation took place
//   3.3 Student uploads written feedback reflection
//   3.4 Supervisor approves midterm & reflection
const MILESTONES = [
  // Phase 1 — Kick-off
  { key: 'kickoffCompleted'                as const, dateKey: 'kickoffCompletedAt'                as const, countKey: null, rejKey: null,                           confirmOnly: false, phase: 1, step: 1, label: 'Kick-off meeting',          by: 'lecturer', desc: 'Your supervisor officially kicks off the thesis process with you.' },
  { key: 'kickoffStudentConfirmed'         as const, dateKey: 'kickoffStudentConfirmedAt'         as const, countKey: null, rejKey: null,                           confirmOnly: true,  phase: 1, step: 2, label: 'Confirm kick-off',           by: 'student',  desc: 'Confirm you have attended the kick-off meeting with your supervisor.' },
  // Phase 2 — Proposal
  { key: 'proposalSubmitted'               as const, dateKey: 'proposalSubmittedAt'               as const, countKey: 'proposalUploadCount' as const, rejKey: 'proposalRejected' as const, confirmOnly: false, phase: 2, step: 1, label: 'Proposal hand in', by: 'student', desc: 'Upload your written thesis proposal.' },
  { key: 'proposalMeetingCompleted'        as const, dateKey: 'proposalMeetingCompletedAt'        as const, countKey: null, rejKey: null,                           confirmOnly: false, phase: 2, step: 2, label: 'Proposal meeting',           by: 'lecturer', desc: 'Your supervisor confirms the proposal meeting has taken place.' },
  { key: 'proposalMeetingStudentConfirmed' as const, dateKey: 'proposalMeetingStudentConfirmedAt' as const, countKey: null, rejKey: null,                           confirmOnly: true,  phase: 2, step: 3, label: 'Confirm proposal meeting',  by: 'student',  desc: 'Confirm you have attended the proposal meeting.' },
  { key: 'proposalApproved'               as const, dateKey: 'proposalApprovedAt'               as const,  countKey: null, rejKey: null,                           confirmOnly: false, phase: 2, step: 4, label: 'Proposal approved',         by: 'lecturer', desc: 'Your supervisor reviews and approves the proposal.' },
  // Phase 3 — Midterm (4 steps)
  { key: 'midtermSubmitted'               as const, dateKey: 'midtermSubmittedAt'               as const,  countKey: null, rejKey: 'midtermRejected' as const,     confirmOnly: false, phase: 3, step: 1, label: 'Midterm Materials',         by: 'student',  desc: 'Upload your midterm presentation slides and your midterm paper. Both files are required before this step is complete.' },
  { key: 'midtermMeetingCompleted'        as const, dateKey: 'midtermMeetingCompletedAt'        as const,  countKey: null, rejKey: null,                           confirmOnly: false, phase: 3, step: 2, label: 'Midterm Presentation',      by: 'lecturer', desc: 'Your supervisor confirms the midterm presentation has taken place. Both your primary and co-supervisor attend and give oral feedback.' },
  { key: 'midtermReflectionSubmitted'     as const, dateKey: 'midtermReflectionSubmittedAt'     as const,  countKey: null, rejKey: 'midtermReflectionRejected' as const, confirmOnly: false, phase: 3, step: 3, label: 'Feedback Reflection', by: 'student', desc: 'Write up the oral feedback you received from your supervisors and what concrete actions you plan to take. Upload it as a PDF or Word document.' },
  { key: 'midtermApproved'               as const, dateKey: 'midtermApprovedAt'               as const,   countKey: null, rejKey: null,                           confirmOnly: false, phase: 3, step: 4, label: 'Midterm Approved',          by: 'lecturer', desc: 'Your supervisor confirms both the midterm and your feedback reflection are satisfactory.' },
  // Phase 4 — Final
  { key: 'finalThesisSubmitted'          as const, dateKey: 'finalThesisSubmittedAt'          as const,   countKey: 'finalThesisUploadCount' as const,  rejKey: 'finalThesisRejected' as const,  confirmOnly: false, phase: 4, step: 1, label: 'Final Thesis',           by: 'student',  desc: 'Upload your completed final thesis document.' },
  { key: 'finalThesisApproved'           as const, dateKey: 'finalThesisApprovedAt'           as const,   countKey: null, rejKey: null,                           confirmOnly: false, phase: 4, step: 2, label: 'Final Thesis received',    by: 'lecturer', desc: 'Your supervisor confirms receipt of the final thesis.' },
  { key: 'finalPresentationSubmitted'    as const, dateKey: 'finalPresentationSubmittedAt'    as const,   countKey: 'finalPresentationUploadCount' as const, rejKey: 'finalPresentationRejected' as const, confirmOnly: false, phase: 4, step: 3, label: 'Final Presentation', by: 'student', desc: 'Upload materials from your final thesis presentation.' },
  { key: 'finalPresentationApproved'     as const, dateKey: 'finalPresentationApprovedAt'     as const,   countKey: null, rejKey: null,                           confirmOnly: false, phase: 4, step: 4, label: 'Presentation confirmed',   by: 'lecturer', desc: 'Your supervisor confirms the final presentation was completed.' },
] as const

const EMPTY_PROGRESS: Progress = {
  kickoffCompleted:  false, kickoffCompletedAt:  null,
  kickoffStudentConfirmed: false, kickoffStudentConfirmedAt: null,
  proposalSubmitted: false, proposalSubmittedAt: null,
  proposalMeetingCompleted: false, proposalMeetingCompletedAt: null,
  proposalMeetingStudentConfirmed: false, proposalMeetingStudentConfirmedAt: null,
  proposalApproved:  false, proposalApprovedAt:  null, proposalFeedback: null,
  midtermSubmitted:  false, midtermSubmittedAt:  null,
  midtermMeetingCompleted: false, midtermMeetingCompletedAt: null,
  midtermReflectionSubmitted: false, midtermReflectionSubmittedAt: null,
  midtermReflectionRejected: false,  midtermReflectionRejectedAt: null,
  midtermApproved:   false, midtermApprovedAt:   null, midtermFeedback: null,
  midtermRejected:   false, midtermRejectedAt:   null,
  proposalRejected:  false, proposalRejectedAt:  null,
  notifyOnUpload: false,
  proposalUploadCount: 0,
  midtermUploadCount: 0,
  finalThesisSubmitted: false,   finalThesisSubmittedAt: null,
  finalThesisApproved:  false,   finalThesisApprovedAt:  null,
  finalThesisRejected:  false,   finalThesisRejectedAt:  null,
  finalThesisUploadCount: 0,
  finalPresentationSubmitted: false, finalPresentationSubmittedAt: null,
  finalPresentationApproved:  false, finalPresentationApprovedAt:  null,
  finalPresentationRejected:  false, finalPresentationRejectedAt:  null,
  finalPresentationUploadCount: 0,
}

function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// ── Fehlversuch warning modal ─────────────────────────────────────────────────
function FehlversuchModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">⚠️</div>
          <div>
            <h2 className="font-bold text-bfh-gray-dark text-base">Official Start of Thesis Process</h2>
            <p className="text-xs text-bfh-gray-mid mt-0.5">Please read carefully before confirming</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
          <p className="text-sm text-bfh-gray-dark leading-relaxed">
            By confirming this, you <strong>officially enter the thesis process</strong>. From this point on, the thesis is registered and binding.
          </p>
          <p className="text-sm text-bfh-gray-dark leading-relaxed">
            Interrupting or stopping the thesis process after this confirmation will result in a{' '}
            <strong className="text-red-700">failed attempt (Fehlversuch)</strong> being recorded on your academic record.
          </p>
          <p className="text-xs text-bfh-gray-mid mt-2 italic">
            Durch diese Bestätigung treten Sie offiziell in den Thesis-Prozess ein. Ein Abbruch führt zu einem <strong>Fehlversuch</strong>.
          </p>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-bfh-gray-border text-bfh-gray-dark hover:bg-bfh-gray-light transition-colors font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 text-sm px-4 py-2.5 rounded-lg bg-bfh-red text-white hover:bg-bfh-red-dark transition-colors font-semibold">
            I understand — Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reusable file upload sub-section (used inside the midterm materials step) ─
function FileUploadArea({
  label, milestoneKey, files, matchId, disabled, isRework, uploading,
  fileRef, onUpload, onDelete, deleting,
}: {
  label: string; milestoneKey: string; files: FileRecord[]; matchId: string
  disabled: boolean; isRework: boolean; uploading: boolean
  fileRef: (el: HTMLInputElement | null) => void
  onUpload: (milestone: string, file: File) => void
  onDelete: (fileId: string) => void; deleting: string | null
}) {
  const hasFile = files.length > 0
  const limitReached = files.length >= MAX_UPLOADS && !isRework

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${hasFile ? 'border-green-200 bg-green-50/40' : 'border-bfh-gray-border bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${hasFile ? '✅' : '📎'}`}>{hasFile ? '✅' : '📎'}</span>
          <span className="text-sm font-semibold text-bfh-gray-dark">{label}</span>
          {hasFile && <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium">Uploaded</span>}
        </div>
        {!disabled && !limitReached && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) onUpload(milestoneKey, f)
                e.target.value = ''
              }}
            />
            <button
              disabled={uploading}
              onClick={() => (document.querySelector(`[data-upload-key="${milestoneKey}"]`) as HTMLInputElement)?.click()}
              className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                isRework ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'
              }`}
            >
              {uploading ? 'Uploading…' : isRework ? '↑ Re-upload' : hasFile ? '↑ Replace' : '↑ Upload'}
            </button>
          </>
        )}
      </div>
      {files.map((f, fi) => (
        <div key={f.id} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
          <span className="text-xs font-bold text-bfh-gray-mid w-5 shrink-0">#{fi + 1}</span>
          <span className="text-base">📄</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
            <div className="text-[10px] text-bfh-gray-mid">{formatBytes(f.size)} · {formatDateTime(f.uploadedAt)}</div>
          </div>
          <a href={`/api/files/${f.matchId}/${f.storedName}`} download={f.originalName} className="text-xs text-bfh-red hover:underline shrink-0">Download</a>
          {!disabled && (
            <button disabled={deleting === f.id} onClick={() => onDelete(f.id)} className="text-xs text-gray-400 hover:text-red-600 shrink-0 disabled:opacity-50">
              {deleting === f.id ? '…' : '✕'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default function StudentProgressPage() {
  const [matchId, setMatchId]       = useState<string | null>(null)
  const [semesterName, setSemName]  = useState('')
  const [progress, setProgress]     = useState<Progress>(EMPTY_PROGRESS)
  const [files, setFiles]           = useState<FileRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [noMatch, setNoMatch]       = useState(false)
  const [uploading, setUploading]   = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [showFehlversuch, setShowFehlversuch] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const fetchData = async () => {
    const r  = await fetch('/api/student/result')
    const d  = await r.json()
    if (!d?.match?.id) { setNoMatch(true); setLoading(false); return }
    setMatchId(d.match.id)
    setSemName(d.semester?.name ?? '')
    const pr = await fetch(`/api/progress/${d.match.id}`)
    const pd = await pr.json()
    setProgress(pd.progress ?? EMPTY_PROGRESS)
    setFiles(pd.files ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleUpload = async (milestone: string, file: File) => {
    if (!matchId) return
    setUploading(milestone)
    const form = new FormData()
    form.append('file', file)
    form.append('milestone', milestone)
    await fetch(`/api/progress/${matchId}/upload`, { method: 'POST', body: form })
    await fetchData()
    setUploading(null)
  }

  const handleConfirm = async (key: string) => {
    if (!matchId) return
    setConfirming(key)
    await fetch(`/api/progress/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: true }),
    })
    await fetchData()
    setConfirming(null)
  }

  // Clicking confirm on the kickoff step shows the Fehlversuch warning first
  const handleConfirmClick = (key: string) => {
    if (key === 'kickoffStudentConfirmed') {
      setShowFehlversuch(true)
    } else {
      handleConfirm(key)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!matchId) return
    setDeleting(fileId)
    await fetch(`/api/progress/${matchId}/files/${fileId}`, { method: 'DELETE' })
    await fetchData()
    setDeleting(null)
  }

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  if (noMatch) {
    return (
      <div className="max-w-lg mx-auto mt-12 card p-8 text-center text-bfh-gray-mid">
        <div className="text-4xl mb-3">⏳</div>
        <p className="font-medium">No thesis assignment yet.</p>
        <a href="/student/result" className="btn-primary mt-4 inline-block text-sm">View My Result</a>
      </div>
    )
  }

  const completedCount = MILESTONES.filter(m => progress[m.key]).length

  // Group milestones by phase
  const milestonesByPhase = PHASES.map(phase => ({
    ...phase,
    milestones: MILESTONES.filter(m => m.phase === phase.id),
    completed:  MILESTONES.filter(m => m.phase === phase.id && progress[m.key]).length,
    total:      MILESTONES.filter(m => m.phase === phase.id).length,
  }))

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Fehlversuch warning modal */}
      {showFehlversuch && (
        <FehlversuchModal
          onConfirm={() => { setShowFehlversuch(false); handleConfirm('kickoffStudentConfirmed') }}
          onCancel={() => setShowFehlversuch(false)}
        />
      )}

      <div>
        <h1>Thesis Progress</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">{semesterName}</p>
      </div>

      {/* Overall progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-bfh-gray-dark">Overall Progress</span>
          <span className="text-xs font-medium text-bfh-gray-mid bg-bfh-gray-light px-2.5 py-1 rounded-full">
            {completedCount} / {MILESTONES.length} steps completed
          </span>
        </div>
        <div className="w-full bg-bfh-gray-border rounded-full h-2">
          <div className="h-2 rounded-full bg-bfh-yellow transition-all duration-500"
            style={{ width: `${(completedCount / MILESTONES.length) * 100}%` }} />
        </div>
        {/* Phase summary pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
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
                const globalIdx    = MILESTONES.findIndex(x => x.key === m.key)
                const done         = progress[m.key]
                const dateVal      = progress[m.dateKey]
                const isStudent    = m.by === 'student'
                const prevDone     = globalIdx === 0 || progress[MILESTONES[globalIdx - 1].key]
                const isConfirming = confirming === m.key
                const isRejected   = (m.rejKey && progress[m.rejKey]) ?? false
                const nextApproved = MILESTONES[globalIdx + 1] ? progress[MILESTONES[globalIdx + 1].key] : false

                // ── Step 3.1: Midterm Materials — dual upload ───────────────
                if (m.key === 'midtermSubmitted') {
                  const presFiles  = files.filter(f => f.milestone === 'midtermPresentation')
                  const paperFiles = files.filter(f => f.milestone === 'midtermPaper')
                  const hasPresBeen  = presFiles.length > 0
                  const hasPaperBeen = paperFiles.length > 0
                  const stepUnlocked = prevDone && !nextApproved

                  return (
                    <div key={m.key} className={`transition-colors ${
                      done ? 'bg-green-50/60' : isRejected ? 'bg-red-50' : !prevDone ? 'bg-bfh-gray-light opacity-60' : 'bg-white'
                    }`}>
                      <div className="flex items-start gap-3 p-4">
                        {/* Step badge */}
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                          done ? 'bg-green-500 text-white' : isRejected ? 'bg-red-400 text-white' : 'bg-bfh-gray-border text-bfh-gray-mid'
                        }`}>
                          {done ? '✓' : isRejected ? '✗' : `${m.phase}.${m.step}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${done ? 'text-green-800' : isRejected ? 'text-red-700' : 'text-bfh-gray-dark'}`}>
                              {m.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-bfh-yellow text-bfh-gray-dark">You</span>
                            {isRejected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">Rework required</span>
                            )}
                          </div>
                          <p className="text-xs text-bfh-gray-mid mt-0.5">{m.desc}</p>
                          {done && dateVal && <p className="text-xs text-green-700 mt-1">✓ Both files submitted — {formatDateTime(dateVal)}</p>}
                          {isRejected && <p className="text-xs text-red-600 font-medium mt-1">Your supervisor has requested a rework. Please re-upload the required files.</p>}
                        </div>
                      </div>

                      {/* Dual upload areas */}
                      {prevDone && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Hidden file inputs with data attributes for targeting */}
                          <input
                            data-upload-key="midtermPresentation"
                            ref={el => { fileRefs.current['midtermPresentation'] = el }}
                            type="file" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload('midtermPresentation', f); e.target.value = '' }}
                          />
                          <input
                            data-upload-key="midtermPaper"
                            ref={el => { fileRefs.current['midtermPaper'] = el }}
                            type="file" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload('midtermPaper', f); e.target.value = '' }}
                          />

                          {/* Presentation upload area */}
                          <div className={`rounded-lg border p-3 space-y-2 ${hasPresBeen ? 'border-green-200 bg-green-50/40' : 'border-bfh-gray-border bg-white'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{hasPresBeen ? '✅' : '🖥️'}</span>
                                <span className="text-sm font-semibold text-bfh-gray-dark">Presentation Slides</span>
                                {hasPresBeen && <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium">Uploaded</span>}
                              </div>
                              {stepUnlocked && (presFiles.length < MAX_UPLOADS || isRejected) && (
                                <button
                                  disabled={uploading === 'midtermPresentation'}
                                  onClick={() => fileRefs.current['midtermPresentation']?.click()}
                                  className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                                    isRejected ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'
                                  }`}
                                >
                                  {uploading === 'midtermPresentation' ? 'Uploading…' : hasPresBeen ? '↑ Replace' : '↑ Upload'}
                                </button>
                              )}
                            </div>
                            {presFiles.map((f, fi) => (
                              <div key={f.id} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
                                <span className="text-xs font-bold text-bfh-gray-mid w-5 shrink-0">#{fi + 1}</span>
                                <span className="text-base">📄</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
                                  <div className="text-[10px] text-bfh-gray-mid">{formatBytes(f.size)} · {formatDateTime(f.uploadedAt)}</div>
                                </div>
                                <a href={`/api/files/${f.matchId}/${f.storedName}`} download={f.originalName} className="text-xs text-bfh-red hover:underline shrink-0">Download</a>
                                {stepUnlocked && (
                                  <button disabled={deleting === f.id} onClick={() => handleDelete(f.id)} className="text-xs text-gray-400 hover:text-red-600 shrink-0 disabled:opacity-50">
                                    {deleting === f.id ? '…' : '✕'}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Paper upload area */}
                          <div className={`rounded-lg border p-3 space-y-2 ${hasPaperBeen ? 'border-green-200 bg-green-50/40' : 'border-bfh-gray-border bg-white'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{hasPaperBeen ? '✅' : '📄'}</span>
                                <span className="text-sm font-semibold text-bfh-gray-dark">Midterm Paper</span>
                                {hasPaperBeen && <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium">Uploaded</span>}
                              </div>
                              {stepUnlocked && (paperFiles.length < MAX_UPLOADS || isRejected) && (
                                <button
                                  disabled={uploading === 'midtermPaper'}
                                  onClick={() => fileRefs.current['midtermPaper']?.click()}
                                  className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                                    isRejected ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'
                                  }`}
                                >
                                  {uploading === 'midtermPaper' ? 'Uploading…' : hasPaperBeen ? '↑ Replace' : '↑ Upload'}
                                </button>
                              )}
                            </div>
                            {paperFiles.map((f, fi) => (
                              <div key={f.id} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
                                <span className="text-xs font-bold text-bfh-gray-mid w-5 shrink-0">#{fi + 1}</span>
                                <span className="text-base">📄</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
                                  <div className="text-[10px] text-bfh-gray-mid">{formatBytes(f.size)} · {formatDateTime(f.uploadedAt)}</div>
                                </div>
                                <a href={`/api/files/${f.matchId}/${f.storedName}`} download={f.originalName} className="text-xs text-bfh-red hover:underline shrink-0">Download</a>
                                {stepUnlocked && (
                                  <button disabled={deleting === f.id} onClick={() => handleDelete(f.id)} className="text-xs text-gray-400 hover:text-red-600 shrink-0 disabled:opacity-50">
                                    {deleting === f.id ? '…' : '✕'}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Status message when waiting for the other file */}
                          {!done && !isRejected && (hasPresBeen || hasPaperBeen) && !(hasPresBeen && hasPaperBeen) && (
                            <p className="text-xs text-amber-600 font-medium">
                              ⚠ Please also upload your {!hasPresBeen ? 'presentation slides' : 'midterm paper'} to complete this step.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                // ── Standard step rendering ─────────────────────────────────
                const uploadCount  = (m.countKey && progress[m.countKey]) ?? 0
                const limitReached = isStudent && !m.confirmOnly && uploadCount >= MAX_UPLOADS && !isRejected
                const canUpload    = isStudent && !m.confirmOnly && prevDone && !nextApproved && (uploadCount < MAX_UPLOADS || isRejected)
                const canConfirm   = isStudent && m.confirmOnly && prevDone && !done

                return (
                  <div key={m.key} className={`transition-colors ${
                    done        ? 'bg-green-50/60'
                    : isRejected ? 'bg-red-50'
                    : !prevDone  ? 'bg-bfh-gray-light opacity-60'
                    :              'bg-white'
                  }`}>
                    <div className="flex items-start gap-3 p-4">
                      {/* Step number badge */}
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                        done        ? 'bg-green-500 text-white'
                        : isRejected ? 'bg-red-400 text-white'
                        :              'bg-bfh-gray-border text-bfh-gray-mid'
                      }`}>
                        {done ? '✓' : isRejected ? '✗' : `${m.phase}.${m.step}`}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${
                            done ? 'text-green-800' : isRejected ? 'text-red-700' : 'text-bfh-gray-dark'
                          }`}>{m.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isStudent ? 'bg-bfh-yellow text-bfh-gray-dark' : 'bg-bfh-red text-white'
                          }`}>
                            {isStudent ? 'You' : 'Supervisor'}
                          </span>
                          {m.countKey && !isRejected && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                              limitReached ? 'bg-red-50 border-red-200 text-red-700' : 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid'
                            }`}>
                              {uploadCount} / {MAX_UPLOADS} uploads
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">
                              Rework required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-bfh-gray-mid mt-0.5">{m.desc}</p>
                        {done && dateVal && <p className="text-xs text-green-700 mt-1">✓ {formatDateTime(dateVal)}</p>}
                        {isRejected && (
                          <p className="text-xs text-red-600 font-medium mt-1">Your supervisor has requested a rework. Please upload a revised version.</p>
                        )}
                        {!isRejected && limitReached && !nextApproved && (
                          <p className="text-xs text-red-600 mt-1 font-medium">Upload limit reached — awaiting supervisor review.</p>
                        )}

                        {/* Supervisor feedback on proposal */}
                        {m.key === 'proposalApproved' && progress.proposalFeedback && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Supervisor feedback</p>
                            <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{progress.proposalFeedback}</p>
                          </div>
                        )}

                        {/* Supervisor correction note on reflection — shown when rejected OR after approval */}
                        {m.key === 'midtermReflectionSubmitted' && progress.midtermFeedback && (
                          <div className={`mt-2 p-2 rounded border ${
                            isRejected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                          }`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
                              isRejected ? 'text-red-700' : 'text-blue-700'
                            }`}>
                              {isRejected ? 'Supervisor correction' : 'Supervisor feedback'}
                            </p>
                            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                              isRejected ? 'text-red-900' : 'text-blue-900'
                            }`}>{progress.midtermFeedback}</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {canConfirm && (
                        <button
                          disabled={isConfirming}
                          onClick={() => handleConfirmClick(m.key)}
                          className="shrink-0 text-xs px-3 py-1.5 rounded font-medium btn-primary disabled:opacity-50 transition-colors"
                        >
                          {isConfirming ? 'Confirming…' : '✓ Confirm'}
                        </button>
                      )}
                      {canUpload && (
                        <>
                          <input
                            ref={el => { fileRefs.current[m.key] = el }}
                            type="file"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) handleUpload(m.key, f)
                              e.target.value = ''
                            }}
                          />
                          <button
                            disabled={uploading === m.key}
                            onClick={() => fileRefs.current[m.key]?.click()}
                            className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                              isRejected ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'
                            }`}
                          >
                            {uploading === m.key ? 'Uploading…' : isRejected ? '↑ Re-upload' : '↑ Upload'}
                          </button>
                        </>
                      )}
                      {isStudent && !canUpload && m.key !== 'midtermSubmitted' && (
                        <input ref={el => { fileRefs.current[m.key] = el }} type="file" className="hidden" />
                      )}
                    </div>

                    {/* Upload history (for standard upload steps, not midtermSubmitted) */}
                    {m.key !== 'midtermSubmitted' && files.filter(f => f.milestone === m.key).length > 0 && (
                      <div className="border-t border-bfh-gray-border mx-4 mb-3 pt-2 space-y-1.5">
                        <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider mb-1">Upload history</p>
                        {files.filter(f => f.milestone === m.key).map((f, fi) => (
                          <div key={f.id} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
                            <span className="text-xs font-bold text-bfh-gray-mid w-5 shrink-0">#{fi + 1}</span>
                            <span className="text-base">📄</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
                              <div className="text-[10px] text-bfh-gray-mid">{formatBytes(f.size)} · {formatDateTime(f.uploadedAt)}</div>
                            </div>
                            <a href={`/api/files/${f.matchId}/${f.storedName}`} download={f.originalName} className="text-xs text-bfh-red hover:underline shrink-0">Download</a>
                            <button
                              disabled={deleting === f.id}
                              onClick={() => handleDelete(f.id)}
                              className="text-xs text-gray-400 hover:text-red-600 shrink-0 disabled:opacity-50"
                            >
                              {deleting === f.id ? '…' : '✕'}
                            </button>
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
  )
}
