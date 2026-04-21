'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDateTime, rankLabel } from '@/lib/utils'
import { GRADING_CRITERIA, WRITTEN_CRITERIA, ORAL_CRITERIA, computeGrade, scoreColor } from '@/lib/gradingData'

const MAX_UPLOADS = 2

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
  proposalApproved:  boolean; proposalApprovedAt:  string | null
  proposalFeedback:  string | null
  proposalRejected:  boolean; proposalRejectedAt:  string | null
  proposalUploadCount: number
  midtermSubmitted:           boolean; midtermSubmittedAt:           string | null
  midtermMeetingCompleted:    boolean; midtermMeetingCompletedAt:    string | null
  midtermReflectionSubmitted: boolean; midtermReflectionSubmittedAt: string | null
  midtermReflectionRejected:  boolean; midtermReflectionRejectedAt:  string | null
  midtermApproved:   boolean; midtermApprovedAt:   string | null
  midtermFeedback:   string | null
  midtermRejected:   boolean; midtermRejectedAt:   string | null
  midtermUploadCount: number
  notifyOnUpload: boolean
  finalThesisSubmitted:   boolean; finalThesisSubmittedAt:   string | null
  finalThesisApproved:    boolean; finalThesisApprovedAt:    string | null
  finalThesisRejected:    boolean; finalThesisRejectedAt:    string | null
  finalThesisUploadCount: number
  finalPresentationSubmitted:   boolean; finalPresentationSubmittedAt:   string | null
  finalPresentationApproved:    boolean; finalPresentationApprovedAt:    string | null
  finalPresentationRejected:    boolean; finalPresentationRejectedAt:    string | null
  finalPresentationUploadCount: number
}

type MatchDetail = {
  id: string; matchedRank: number; matchedAt: string
  student:  { id: string; name: string; email: string; programme: string | null; level: string | null; studentId: string | null }
  topic:    { id: string; title: string; description: string | null; lecturer: { id: string; name: string; email: string } }
  semester: { id: string; name: string }
  progress: Progress | null
  files:    FileRecord[]
  coSupervisors: { lecturerId: string; lecturer: { id: string; name: string; email: string } }[]
}

type GradingData = {
  gradingJson: string
  aolJson: string
  submittedAt: string | null
  updatedAt: string | null
}

// ── Phase definitions (identical to lecturer + student views) ─────────────────
const PHASES = [
  { id: 1, label: 'Kick-off' },
  { id: 2, label: 'Proposal' },
  { id: 3, label: 'Midterm' },
  { id: 4, label: 'Final' },
] as const

// ── Milestone definitions — 14 steps, 4 phases (mirrors lecturer/student pages) ─
const MILESTONES = [
  // Phase 1 — Kick-off
  { key: 'kickoffCompleted'                as const, dateKey: 'kickoffCompletedAt'                as const, phase: 1, step: 1, label: 'Kick-off meeting',          by: 'lecturer', desc: 'Supervisor confirms the kick-off meeting took place.',              feedbackKey: undefined, rejKey: null },
  { key: 'kickoffStudentConfirmed'         as const, dateKey: 'kickoffStudentConfirmedAt'         as const, phase: 1, step: 2, label: 'Confirm kick-off',           by: 'student',  desc: 'Student confirms they attended the kick-off meeting.',              feedbackKey: undefined, rejKey: null },
  // Phase 2 — Proposal
  { key: 'proposalSubmitted'               as const, dateKey: 'proposalSubmittedAt'               as const, phase: 2, step: 1, label: 'Proposal hand in',           by: 'student',  desc: 'Student uploads their written thesis proposal.',                    feedbackKey: undefined, rejKey: 'proposalRejected' as const },
  { key: 'proposalMeetingCompleted'        as const, dateKey: 'proposalMeetingCompletedAt'        as const, phase: 2, step: 2, label: 'Proposal meeting',           by: 'lecturer', desc: 'Supervisor confirms the proposal meeting took place.',              feedbackKey: undefined, rejKey: null },
  { key: 'proposalMeetingStudentConfirmed' as const, dateKey: 'proposalMeetingStudentConfirmedAt' as const, phase: 2, step: 3, label: 'Confirm proposal meeting',  by: 'student',  desc: 'Student confirms they attended the proposal meeting.',              feedbackKey: undefined, rejKey: null },
  { key: 'proposalApproved'               as const, dateKey: 'proposalApprovedAt'               as const,  phase: 2, step: 4, label: 'Proposal approved',          by: 'lecturer', desc: 'Supervisor approves the proposal.',                                 feedbackKey: 'proposalFeedback' as const, rejKey: null },
  // Phase 3 — Midterm (4 steps)
  { key: 'midtermSubmitted'               as const, dateKey: 'midtermSubmittedAt'               as const,  phase: 3, step: 1, label: 'Midterm Materials',          by: 'student',  desc: 'Student uploads presentation slides and midterm paper.',            feedbackKey: undefined, rejKey: 'midtermRejected' as const },
  { key: 'midtermMeetingCompleted'        as const, dateKey: 'midtermMeetingCompletedAt'        as const,  phase: 3, step: 2, label: 'Midterm Presentation',       by: 'lecturer', desc: 'Supervisor confirms the midterm presentation took place.',           feedbackKey: undefined, rejKey: null },
  { key: 'midtermReflectionSubmitted'     as const, dateKey: 'midtermReflectionSubmittedAt'     as const,  phase: 3, step: 3, label: 'Feedback Reflection',        by: 'student',  desc: 'Student uploads their written reflection of the oral feedback.',    feedbackKey: 'midtermFeedback' as const, rejKey: 'midtermReflectionRejected' as const },
  { key: 'midtermApproved'               as const, dateKey: 'midtermApprovedAt'               as const,   phase: 3, step: 4, label: 'Midterm Approved',           by: 'lecturer', desc: 'Supervisor approves midterm materials and feedback reflection.',     feedbackKey: undefined, rejKey: null },
  // Phase 4 — Final
  { key: 'finalThesisSubmitted'          as const, dateKey: 'finalThesisSubmittedAt'          as const,   phase: 4, step: 1, label: 'Final Thesis',               by: 'student',  desc: 'Student uploads their completed final thesis.',                     feedbackKey: undefined, rejKey: 'finalThesisRejected' as const },
  { key: 'finalThesisApproved'           as const, dateKey: 'finalThesisApprovedAt'           as const,   phase: 4, step: 2, label: 'Final Thesis received',      by: 'lecturer', desc: 'Supervisor confirms receipt of the final thesis.',                  feedbackKey: undefined, rejKey: null },
  { key: 'finalPresentationSubmitted'    as const, dateKey: 'finalPresentationSubmittedAt'    as const,   phase: 4, step: 3, label: 'Final Presentation',          by: 'student',  desc: 'Student uploads materials from their final presentation.',          feedbackKey: undefined, rejKey: 'finalPresentationRejected' as const },
  { key: 'finalPresentationApproved'     as const, dateKey: 'finalPresentationApprovedAt'     as const,   phase: 4, step: 4, label: 'Presentation confirmed',     by: 'lecturer', desc: 'Supervisor confirms the final presentation was completed.',         feedbackKey: undefined, rejKey: null },
] as const

const EMPTY_PROGRESS: Progress = {
  kickoffCompleted: false, kickoffCompletedAt: null,
  kickoffStudentConfirmed: false, kickoffStudentConfirmedAt: null,
  proposalSubmitted: false, proposalSubmittedAt: null,
  proposalMeetingCompleted: false, proposalMeetingCompletedAt: null,
  proposalMeetingStudentConfirmed: false, proposalMeetingStudentConfirmedAt: null,
  proposalApproved: false, proposalApprovedAt: null, proposalFeedback: null,
  proposalRejected: false, proposalRejectedAt: null, proposalUploadCount: 0,
  midtermSubmitted: false, midtermSubmittedAt: null,
  midtermMeetingCompleted: false, midtermMeetingCompletedAt: null,
  midtermReflectionSubmitted: false, midtermReflectionSubmittedAt: null,
  midtermReflectionRejected: false, midtermReflectionRejectedAt: null,
  midtermApproved: false, midtermApprovedAt: null, midtermFeedback: null,
  midtermRejected: false, midtermRejectedAt: null, midtermUploadCount: 0,
  notifyOnUpload: false,
  finalThesisSubmitted: false, finalThesisSubmittedAt: null,
  finalThesisApproved: false, finalThesisApprovedAt: null,
  finalThesisRejected: false, finalThesisRejectedAt: null, finalThesisUploadCount: 0,
  finalPresentationSubmitted: false, finalPresentationSubmittedAt: null,
  finalPresentationApproved: false, finalPresentationApprovedAt: null,
  finalPresentationRejected: false, finalPresentationRejectedAt: null, finalPresentationUploadCount: 0,
}

function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/** Simple file row used in both standard and midterm material sections. */
function FileRow({ f }: { f: FileRecord }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
      <span className="text-base"></span>
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
        className="shrink-0 text-xs px-2.5 py-1 rounded bg-bfh-red text-white hover:bg-bfh-red-dark transition-colors"
      >
        Download
      </a>
    </div>
  )
}

export default function AdminMatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const router = useRouter()

  const [match, setMatch]     = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [grading, setGrading] = useState<GradingData | null>(null)
  const [resettingGrading, setResettingGrading] = useState(false)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    const [matchRes, gradingRes] = await Promise.all([
      fetch(`/api/admin/match/${matchId}`),
      fetch(`/api/progress/${matchId}/grading`),
    ])
    if (matchRes.ok)   setMatch(await matchRes.json())
    if (gradingRes.ok) setGrading(await gradingRes.json())
    setLoading(false)
  }

  const resetGrading = async () => {
    if (!confirm('Reset the submission status? Grading data is kept but will be marked as not submitted.')) return
    setResettingGrading(true)
    const res = await fetch(`/api/progress/${matchId}/grading`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetSubmission: true }),
    })
    if (res.ok) {
      const data = await res.json()
      setGrading(prev => prev ? { ...prev, submittedAt: data.submittedAt } : null)
      showToast('Grading submission reset', true)
    } else {
      showToast('Could not reset grading submission', false)
    }
    setResettingGrading(false)
  }

  useEffect(() => { fetchData() }, [matchId])

  // Admin can toggle any milestone in either direction
  const toggleMilestone = async (field: string, current: boolean) => {
    if (!match) return
    setSaving(field)
    const res = await fetch(`/api/progress/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    })
    if (res.ok) {
      await fetchData()
      showToast(!current ? 'Milestone marked complete' : 'Milestone unmarked', true)
    } else {
      showToast('Could not update milestone', false)
    }
    setSaving(null)
  }

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
  if (!match)  return <div className="text-center py-12 text-bfh-gray-mid">Match not found.</div>

  const progress = match.progress ?? EMPTY_PROGRESS
  const files    = match.files ?? []
  const completedCount = MILESTONES.filter(m => progress[m.key]).length

  const milestonesByPhase = PHASES.map(phase => ({
    ...phase,
    milestones: MILESTONES.filter(m => m.phase === phase.id),
    completed:  MILESTONES.filter(m => m.phase === phase.id && progress[m.key]).length,
    total:      MILESTONES.filter(m => m.phase === phase.id).length,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push('/admin/matching')} className="text-sm text-bfh-gray-mid hover:text-bfh-gray-dark transition-colors">
        ← Back to Matching
      </button>

      {/* ── Student / pairing summary ──────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-bfh-yellow flex items-center justify-center text-bfh-gray-dark text-lg font-bold shrink-0">
            {match.student.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-bfh-gray-dark">{match.student.name}</h1>
            <a href={`mailto:${match.student.email}`} className="text-sm text-bfh-red hover:underline">{match.student.email}</a>
            <p className="text-xs text-bfh-gray-mid mt-0.5">
              {[match.student.programme, match.student.level, match.student.studentId].filter(Boolean).join(' · ')}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded ${
            match.matchedRank === 1 ? 'bg-green-100 text-green-800'
            : match.matchedRank === 2 ? 'bg-blue-100 text-blue-700'
            : 'bg-bfh-yellow-light text-bfh-gray-dark'
          }`}>
            {rankLabel(match.matchedRank)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-bfh-gray-light rounded-lg p-3">
            <div className="text-xs text-bfh-gray-mid font-medium uppercase tracking-wide mb-1">Topic</div>
            <div className="font-medium text-bfh-gray-dark leading-snug">{match.topic.title}</div>
          </div>
          <div className="bg-bfh-gray-light rounded-lg p-3">
            <div className="text-xs text-bfh-gray-mid font-medium uppercase tracking-wide mb-1">Supervisor</div>
            <div className="font-medium text-bfh-gray-dark">{match.topic.lecturer.name}</div>
            <a href={`mailto:${match.topic.lecturer.email}`} className="text-xs text-bfh-red hover:underline">{match.topic.lecturer.email}</a>
            {match.coSupervisors?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-bfh-gray-border">
                <div className="text-xs text-bfh-gray-mid font-medium uppercase tracking-wide mb-1">Co-Supervisors</div>
                {match.coSupervisors.map(cs => (
                  <div key={cs.lecturerId} className="text-sm mt-1">
                    <div className="font-medium text-bfh-gray-dark">{cs.lecturer.name}</div>
                    <a href={`mailto:${cs.lecturer.email}`} className="text-xs text-bfh-red hover:underline">{cs.lecturer.email}</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-bfh-gray-mid">
          Semester: {match.semester.name} · Matched: {formatDateTime(match.matchedAt)}
        </div>
      </div>

      {/* ── Thesis Progress ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Header + overall progress bar + phase pills */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-bfh-gray-dark">Thesis Progress</h2>
            <span className="text-xs font-medium text-bfh-gray-mid bg-bfh-gray-light px-2.5 py-1 rounded-full">
              {completedCount} / {MILESTONES.length} steps
            </span>
          </div>
          <div className="w-full bg-bfh-gray-border rounded-full h-1.5 mb-3">
            <div className="h-1.5 rounded-full bg-bfh-yellow transition-all duration-500"
              style={{ width: `${(completedCount / MILESTONES.length) * 100}%` }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {milestonesByPhase.map(phase => (
              <div key={phase.id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
                phase.completed === phase.total
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : phase.completed > 0
                    ? 'bg-bfh-yellow/20 border-bfh-yellow text-bfh-gray-dark'
                    : 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid'
              }`}>
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

              {/* Steps */}
              <div className="divide-y divide-bfh-gray-border">
                {phase.milestones.map((m) => {
                  const globalIdx  = MILESTONES.findIndex(x => x.key === m.key)
                  const done       = progress[m.key]
                  const dateVal    = progress[m.dateKey]
                  const isLecturer = m.by === 'lecturer'
                  const isSaving   = saving === m.key
                  const prevDone   = globalIdx === 0 || progress[MILESTONES[globalIdx - 1].key]
                  const isRejected = m.rejKey ? progress[m.rejKey] : false
                  const feedbackKey = m.feedbackKey as 'proposalFeedback' | 'midtermFeedback' | undefined

                  // ── Step 3.1: Midterm Materials — show presentation + paper separately ──
                  if (m.key === 'midtermSubmitted') {
                    const presFiles  = files.filter(f => f.milestone === 'midtermPresentation')
                    const paperFiles = files.filter(f => f.milestone === 'midtermPaper')
                    const hasNewPres  = presFiles.some(f => !f.seenByLecturer)
                    const hasNewPaper = paperFiles.some(f => !f.seenByLecturer)

                    return (
                      <div key={m.key} className={`transition-colors ${
                        done ? 'bg-green-50/60' : isRejected ? 'bg-red-50' : !prevDone ? 'bg-bfh-gray-light opacity-60' : 'bg-white'
                      }`}>
                        <div className="flex items-start gap-3 p-4">
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
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-bfh-yellow text-bfh-gray-dark">Student</span>
                              {(hasNewPres || hasNewPaper) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-400 text-white animate-pulse">New upload</span>
                              )}
                              {isRejected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">Rework requested</span>
                              )}
                            </div>
                            <p className="text-xs text-bfh-gray-mid mt-0.5">{m.desc}</p>
                            {done && dateVal && <p className="text-xs text-green-700 mt-1">✓ Both files submitted — {formatDateTime(dateVal)}</p>}
                            {!done && !isRejected && (presFiles.length > 0 || paperFiles.length > 0) && !(presFiles.length > 0 && paperFiles.length > 0) && (
                              <p className="text-xs text-amber-600 mt-1 font-medium">
                                ⚠ Waiting for {presFiles.length === 0 ? 'presentation slides' : 'midterm paper'}.
                              </p>
                            )}
                          </div>
                          {/* Admin reset */}
                          {done && (
                            <button
                              disabled={isSaving}
                              onClick={() => toggleMilestone(m.key, done)}
                              className="shrink-0 text-xs px-3 py-1.5 rounded font-medium border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                              {isSaving ? '…' : '↩ Reset'}
                            </button>
                          )}
                        </div>

                        {/* File groups: Presentation + Paper */}
                        {(presFiles.length > 0 || paperFiles.length > 0) && (
                          <div className="px-4 pb-4 space-y-3">
                            {presFiles.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                  Presentation Slides
                                  {hasNewPres && <span className="text-amber-600 font-bold">· New</span>}
                                </p>
                                {presFiles.map(f => <FileRow key={f.id} f={f} />)}
                              </div>
                            )}
                            {paperFiles.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                  Midterm Paper
                                  {hasNewPaper && <span className="text-amber-600 font-bold">· New</span>}
                                </p>
                                {paperFiles.map(f => <FileRow key={f.id} f={f} />)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // ── Standard step rendering ───────────────────────────────
                  const milestoneFiles = files.filter(f => f.milestone === m.key)
                  const hasNew = milestoneFiles.some(f => !f.seenByLecturer)

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
                          done ? 'bg-green-500 text-white' : isRejected ? 'bg-red-400 text-white' : 'bg-bfh-gray-border text-bfh-gray-mid'
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
                              {isLecturer ? 'Supervisor' : 'Student'}
                            </span>
                            {/* Co-supervisor note on midterm presentation step */}
                            {m.key === 'midtermMeetingCompleted' && match.coSupervisors?.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                                + {match.coSupervisors.length} co-supervisor{match.coSupervisors.length > 1 ? 's' : ''} attending
                              </span>
                            )}
                            {hasNew && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-400 text-white animate-pulse">New upload</span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">Rework requested</span>
                            )}
                          </div>
                          <p className="text-xs text-bfh-gray-mid mt-0.5">{m.desc}</p>
                          {done && dateVal && <p className="text-xs text-green-700 mt-1">✓ {formatDateTime(dateVal)}</p>}
                          {isRejected && !done && (
                            <p className="text-xs text-red-600 mt-1 italic">Waiting for student re-upload.</p>
                          )}
                          {!isLecturer && !done && !isRejected && prevDone && (
                            <p className="text-xs text-bfh-gray-mid italic mt-1">Waiting for student</p>
                          )}

                          {/* Feedback notes (read-only for admin) */}
                          {m.key === 'proposalApproved' && progress.proposalFeedback && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Supervisor feedback</p>
                              <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{progress.proposalFeedback}</p>
                            </div>
                          )}
                          {m.key === 'midtermReflectionSubmitted' && progress.midtermFeedback && (
                            <div className={`mt-2 p-2 rounded border ${isRejected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isRejected ? 'text-red-700' : 'text-blue-700'}`}>
                                {isRejected ? 'Supervisor correction' : 'Supervisor feedback'}
                              </p>
                              <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isRejected ? 'text-red-900' : 'text-blue-900'}`}>
                                {progress.midtermFeedback}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Admin can reset/toggle any step */}
                        <button
                          disabled={isSaving}
                          onClick={() => toggleMilestone(m.key, done)}
                          className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                            done
                              ? 'border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                              : prevDone
                                ? 'btn-primary'
                                : 'border border-bfh-gray-border text-bfh-gray-mid bg-white hover:bg-bfh-gray-light'
                          }`}
                        >
                          {isSaving ? '…' : done ? '↩ Reset' : '✓ Set'}
                        </button>
                      </div>

                      {/* Feedback notes shown below (read-only) */}
                      {feedbackKey && progress[feedbackKey] && m.key !== 'proposalApproved' && m.key !== 'midtermReflectionSubmitted' && (
                        <div className="border-t border-bfh-gray-border mx-4 mb-3 pt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid mb-1">Supervisor feedback</p>
                          <p className="text-xs text-bfh-gray-dark leading-relaxed whitespace-pre-wrap">{progress[feedbackKey]}</p>
                        </div>
                      )}

                      {/* Uploaded files */}
                      {milestoneFiles.length > 0 && (
                        <div className="border-t border-bfh-gray-border mx-4 mb-3 pt-2 space-y-1.5">
                          <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider mb-1">Uploaded files</p>
                          {milestoneFiles.map(f => <FileRow key={f.id} f={f} />)}
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

      {/* ── Thesis Grading — read-only admin view ─────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-bfh-gray-dark">Thesis Grading</h2>
          <div className="flex items-center gap-2">
            {grading?.submittedAt ? (
              <>
                <span className="text-xs text-green-700 bg-green-100 border border-green-200 rounded px-2 py-1 font-medium">
                  ✓ Submitted {formatDateTime(grading.submittedAt)}
                </span>
                <button
                  disabled={resettingGrading}
                  onClick={resetGrading}
                  className="text-xs px-3 py-1.5 rounded font-medium border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  {resettingGrading ? '…' : '↩ Reset Submission'}
                </button>
              </>
            ) : (
              <span className="text-xs text-bfh-gray-mid bg-bfh-gray-light rounded px-2 py-1">Not yet submitted</span>
            )}
          </div>
        </div>

        {(() => {
          if (!grading) return <p className="text-sm text-bfh-gray-mid italic">No grading data.</p>
          let gMap: Record<string, { score: number | null; comment: string }> = {}
          try { gMap = JSON.parse(grading.gradingJson) } catch {}
          const scoreMap = Object.fromEntries(GRADING_CRITERIA.map(c => [c.id, gMap[c.id]?.score ?? null]))
          const grade = computeGrade(scoreMap)
          const anyScoredCriteria = GRADING_CRITERIA.some(c => gMap[c.id]?.score != null)

          if (!anyScoredCriteria) return <p className="text-sm text-bfh-gray-mid italic">No scores entered yet.</p>

          const renderCriteria = (criteria: typeof WRITTEN_CRITERIA) => (
            <div className="space-y-2">
              {criteria.map(c => {
                const entry   = gMap[c.id]
                const score   = entry?.score ?? null
                const comment = entry?.comment?.trim() ?? ''
                return (
                  <div key={c.id} className="rounded border border-bfh-gray-border bg-white p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-bfh-gray-mid w-6 shrink-0">{c.id}</span>
                        <span className="text-sm font-medium text-bfh-gray-dark">{c.name}</span>
                        <span className="text-[10px] text-bfh-gray-mid bg-bfh-gray-light px-1.5 py-0.5 rounded shrink-0">{c.weightPercent}%</span>
                      </div>
                      {score !== null ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${scoreColor(score)}`}>{score.toFixed(1)}</span>
                      ) : (
                        <span className="text-xs text-bfh-gray-mid italic shrink-0">Not scored</span>
                      )}
                    </div>
                    {comment ? (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer list-none flex items-center gap-1 text-xs text-bfh-gray-mid hover:text-bfh-gray-dark transition-colors select-none">
                          <span className="transition-transform group-open:rotate-180 inline-block">▾</span>
                          <span>Comment</span>
                        </summary>
                        <p className="mt-1.5 text-xs text-bfh-gray-dark bg-bfh-gray-light rounded px-2 py-1.5 leading-relaxed">{comment}</p>
                      </details>
                    ) : (
                      <p className="mt-1.5 text-[10px] text-bfh-gray-mid italic">No comment</p>
                    )}
                  </div>
                )
              })}
            </div>
          )

          return (
            <div className="space-y-5">
              {grade.allSet && (
                <div className={`rounded-lg p-4 border ${grade.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-bfh-gray-mid font-medium uppercase tracking-wider mb-0.5">Final Grade</p>
                      <span className={`text-2xl font-bold ${grade.passed ? 'text-green-700' : 'text-red-700'}`}>{grade.finalGrade.toFixed(1)}</span>
                      <span className="text-xs text-bfh-gray-mid ml-1">/ 6.0</span>
                    </div>
                    <div className={`text-sm font-bold px-4 py-2 rounded-lg ${grade.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {grade.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-bfh-gray-dark mb-2">Written Part <span className="text-bfh-gray-mid font-normal">(50%)</span></h3>
                {renderCriteria(WRITTEN_CRITERIA)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bfh-gray-dark mb-2">Oral Part <span className="text-bfh-gray-mid font-normal">(50%)</span></h3>
                {renderCriteria(ORAL_CRITERIA)}
              </div>
            </div>
          )
        })()}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
