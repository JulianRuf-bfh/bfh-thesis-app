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
  midtermSubmitted:  boolean; midtermSubmittedAt:  string | null
  midtermApproved:   boolean; midtermApprovedAt:   string | null
  midtermFeedback:   string | null
  proposalRejected:  boolean; proposalRejectedAt:  string | null
  midtermRejected:   boolean; midtermRejectedAt:   string | null
  notifyOnUpload:    boolean
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

const MILESTONES = [
  { key: 'kickoffCompleted'                as const, dateKey: 'kickoffCompletedAt'                as const, countKey: null,                                        rejKey: null,                                  label: 'Kick-off thesis process',       by: 'lecturer' },
  { key: 'kickoffStudentConfirmed'         as const, dateKey: 'kickoffStudentConfirmedAt'         as const, countKey: null,                                        rejKey: null,                                  label: 'Kick-off thesis process',       by: 'student' },
  { key: 'proposalSubmitted'               as const, dateKey: 'proposalSubmittedAt'               as const, countKey: 'proposalUploadCount'          as const,     rejKey: 'proposalRejected'          as const,  label: 'Proposal hand in',              by: 'student' },
  { key: 'proposalMeetingCompleted'        as const, dateKey: 'proposalMeetingCompletedAt'        as const, countKey: null,                                        rejKey: null,                                  label: 'Proposal meeting',              by: 'lecturer' },
  { key: 'proposalMeetingStudentConfirmed' as const, dateKey: 'proposalMeetingStudentConfirmedAt' as const, countKey: null,                                        rejKey: null,                                  label: 'Proposal meeting',              by: 'student' },
  { key: 'proposalApproved'               as const, dateKey: 'proposalApprovedAt'               as const, countKey: null,                                        rejKey: null,                                  label: 'Proposal approved',             by: 'lecturer' },
  { key: 'midtermSubmitted'               as const, dateKey: 'midtermSubmittedAt'               as const, countKey: 'midtermUploadCount'           as const,     rejKey: 'midtermRejected'           as const,  label: 'Midterm presentation',          by: 'student' },
  { key: 'midtermApproved'               as const, dateKey: 'midtermApprovedAt'               as const, countKey: null,                                        rejKey: null,                                  label: 'Midterm presentation approved', by: 'lecturer' },
  { key: 'finalThesisSubmitted'          as const, dateKey: 'finalThesisSubmittedAt'          as const, countKey: 'finalThesisUploadCount'       as const,     rejKey: 'finalThesisRejected'       as const,  label: 'Final Thesis',                  by: 'student' },
  { key: 'finalThesisApproved'           as const, dateKey: 'finalThesisApprovedAt'           as const, countKey: null,                                        rejKey: null,                                  label: 'Final Thesis approved',         by: 'lecturer' },
  { key: 'finalPresentationSubmitted'    as const, dateKey: 'finalPresentationSubmittedAt'    as const, countKey: 'finalPresentationUploadCount' as const,     rejKey: 'finalPresentationRejected' as const,  label: 'Final Presentation',            by: 'student' },
  { key: 'finalPresentationApproved'     as const, dateKey: 'finalPresentationApprovedAt'     as const, countKey: null,                                        rejKey: null,                                  label: 'Final Presentation approved',   by: 'lecturer' },
] as const

function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function AdminMatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const router = useRouter()

  const [match, setMatch]   = useState<MatchDetail | null>(null)
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
    if (!confirm('Reset the submission status? The grading data will be kept, but the grading will be marked as not submitted.')) return
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

  const progress = match.progress
  const completedCount = MILESTONES.filter(m => progress?.[m.key]).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push('/admin/matching')} className="text-sm text-bfh-gray-mid hover:text-bfh-gray-dark transition-colors">
        ← Back to Matching
      </button>

      {/* Pairing summary */}
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
                  <div key={cs.lecturerId} className="text-sm">
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

      {/* Progress tracker */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-bfh-gray-dark">Thesis Progress</h2>
          <span className="text-xs font-medium text-bfh-gray-mid bg-bfh-gray-light px-2.5 py-1 rounded-full">
            {completedCount} / {MILESTONES.length} completed
          </span>
        </div>

        <div className="w-full bg-bfh-gray-border rounded-full h-1.5 mb-5">
          <div className="h-1.5 rounded-full bg-bfh-yellow transition-all duration-500"
            style={{ width: `${(completedCount / MILESTONES.length) * 100}%` }} />
        </div>

        <div className="space-y-4">
          {MILESTONES.map((m, i) => {
            const done        = progress?.[m.key] ?? false
            const dateVal     = progress?.[m.dateKey] ?? null
            const isLecturer  = m.by === 'lecturer'
            const isSaving    = saving === m.key
            const prevDone    = i === 0 || (progress?.[MILESTONES[i - 1].key] ?? false)
            const uploadCount = (m.countKey && progress?.[m.countKey]) ?? 0
            const isRejected  = (m.rejKey && progress?.[m.rejKey]) ?? false
            const milestoneFiles = match.files.filter(f => f.milestone === m.key)

            return (
              <div key={m.key} className={`rounded-lg border transition-colors ${
                done        ? 'bg-green-50 border-green-200'
                : isRejected ? 'bg-red-50 border-red-200'
                : prevDone  ? 'bg-white border-bfh-gray-border'
                :              'bg-bfh-gray-light border-bfh-gray-border opacity-60'
              }`}>
                <div className="flex items-start gap-3 p-3">
                  <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    done        ? 'bg-green-500 text-white'
                    : isRejected ? 'bg-red-400 text-white'
                    :              'bg-bfh-gray-border text-bfh-gray-mid'
                  }`}>
                    {done ? '✓' : isRejected ? '✗' : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${
                        done ? 'text-green-800' : isRejected ? 'text-red-700' : 'text-bfh-gray-dark'
                      }`}>{m.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isLecturer ? 'bg-bfh-red text-white' : 'bg-bfh-yellow text-bfh-gray-dark'
                      }`}>
                        {isLecturer ? 'Supervisor' : 'Student'}
                      </span>
                      {m.countKey && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                          uploadCount >= MAX_UPLOADS ? 'bg-red-50 border-red-200 text-red-700' : 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid'
                        }`}>
                          {uploadCount} / {MAX_UPLOADS} uploads
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">
                          Rework requested
                        </span>
                      )}
                    </div>
                    {done && dateVal && <p className="text-xs text-green-700 mt-1">Completed: {formatDateTime(dateVal)}</p>}
                    {isRejected && <p className="text-xs text-red-600 italic mt-1">Supervisor requested a rework — awaiting student re-upload.</p>}
                    {!isLecturer && !done && !isRejected && prevDone && (
                      <p className="text-xs text-bfh-gray-mid italic mt-1">Waiting for student</p>
                    )}
                    {m.key === 'proposalApproved' && progress?.proposalFeedback && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Supervisor feedback</p>
                        <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{progress.proposalFeedback}</p>
                      </div>
                    )}
                    {m.key === 'midtermApproved' && progress?.midtermFeedback && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Supervisor feedback</p>
                        <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{progress.midtermFeedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Lecturer approval steps: Approve / Undo */}
                  {isLecturer && prevDone && (
                    <button
                      disabled={isSaving}
                      onClick={() => toggleMilestone(m.key, done)}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                        done ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'btn-primary text-xs py-1.5'
                      }`}
                    >
                      {isSaving ? '…' : done ? 'Undo' : 'Approve'}
                    </button>
                  )}
                  {/* Student steps: admin can reset a completed submission */}
                  {!isLecturer && done && (
                    <button
                      disabled={isSaving}
                      onClick={() => toggleMilestone(m.key, done)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded font-medium border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? '…' : '↩ Reset'}
                    </button>
                  )}
                </div>

                {/* File upload timeline */}
                {milestoneFiles.length > 0 && (
                  <div className="border-t border-bfh-gray-border mx-3 mb-3 pt-2">
                    <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider mb-2">
                      Upload history
                    </p>
                    <div className="space-y-1.5">
                      {milestoneFiles.map((f, fi) => (
                        <div key={f.id} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
                          <span className="text-xs font-bold text-bfh-gray-mid w-5 shrink-0">#{fi + 1}</span>
                          <span className="text-base">📄</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
                            <div className="text-[10px] text-bfh-gray-mid">
                              {formatBytes(f.size)} · Uploaded {formatDateTime(f.uploadedAt)}
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Thesis Grading — read-only admin view */}
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
              <span className="text-xs text-bfh-gray-mid bg-bfh-gray-light rounded px-2 py-1">
                Not yet submitted
              </span>
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

          if (!anyScoredCriteria) return (
            <p className="text-sm text-bfh-gray-mid italic">No scores entered yet.</p>
          )

          const renderCriteria = (criteria: typeof WRITTEN_CRITERIA) => (
            <div className="space-y-2">
              {criteria.map(c => {
                const entry = gMap[c.id]
                const score = entry?.score ?? null
                const comment = entry?.comment?.trim() ?? ''
                return (
                  <div key={c.id} className="rounded border border-bfh-gray-border bg-white p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-bfh-gray-mid w-6 shrink-0">{c.id}</span>
                        <span className="text-sm font-medium text-bfh-gray-dark">{c.name}</span>
                        <span className="text-[10px] text-bfh-gray-mid bg-bfh-gray-light px-1.5 py-0.5 rounded shrink-0">{c.weightPercent}%</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {score !== null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${scoreColor(score)}`}>
                            {score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-bfh-gray-mid italic">Not scored</span>
                        )}
                      </div>
                    </div>
                    {comment ? (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer list-none flex items-center gap-1 text-xs text-bfh-gray-mid hover:text-bfh-gray-dark transition-colors select-none">
                          <span className="transition-transform group-open:rotate-180 inline-block">▾</span>
                          <span>Comment</span>
                        </summary>
                        <p className="mt-1.5 text-xs text-bfh-gray-dark bg-bfh-gray-light rounded px-2 py-1.5 leading-relaxed">
                          {comment}
                        </p>
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
              {/* Grade summary */}
              {grade.allSet && (
                <div className={`rounded-lg p-4 border ${grade.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-bfh-gray-mid font-medium uppercase tracking-wider mb-0.5">Final Grade</p>
                      <span className={`text-2xl font-bold ${grade.passed ? 'text-green-700' : 'text-red-700'}`}>
                        {grade.finalGrade.toFixed(1)}
                      </span>
                      <span className="text-xs text-bfh-gray-mid ml-1">/ 6.0</span>
                    </div>
                    <div className={`text-sm font-bold px-4 py-2 rounded-lg ${grade.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {grade.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
                    </div>
                  </div>
                </div>
              )}

              {/* Written */}
              <div>
                <h3 className="text-sm font-semibold text-bfh-gray-dark mb-2">Written Part <span className="text-bfh-gray-mid font-normal">(50%)</span></h3>
                {renderCriteria(WRITTEN_CRITERIA)}
              </div>

              {/* Oral */}
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
