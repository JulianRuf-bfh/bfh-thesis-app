'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatDateTime, rankLabel } from '@/lib/utils'

const MAX_UPLOADS = 2

type FileRecord = {
  id: string; matchId: string; milestone: string
  originalName: string; storedName: string
  mimeType: string | null; size: number | null
  seenByLecturer: boolean; uploadedAt: string
}
type Progress = {
  proposalSubmitted: boolean; proposalSubmittedAt: string | null
  proposalApproved:  boolean; proposalApprovedAt:  string | null
  midtermSubmitted:  boolean; midtermSubmittedAt:  string | null
  midtermApproved:   boolean; midtermApprovedAt:   string | null
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
}

const MILESTONES = [
  { key: 'proposalSubmitted'          as const, dateKey: 'proposalSubmittedAt'          as const, countKey: 'proposalUploadCount'          as const, rejKey: 'proposalRejected'          as const, label: 'Proposal hand in',              by: 'student' },
  { key: 'proposalApproved'           as const, dateKey: 'proposalApprovedAt'           as const, countKey: null,                                     rejKey: null,                                  label: 'Proposal approved',             by: 'lecturer' },
  { key: 'midtermSubmitted'           as const, dateKey: 'midtermSubmittedAt'           as const, countKey: 'midtermUploadCount'           as const, rejKey: 'midtermRejected'           as const, label: 'Midterm presentation',          by: 'student' },
  { key: 'midtermApproved'            as const, dateKey: 'midtermApprovedAt'            as const, countKey: null,                                     rejKey: null,                                  label: 'Midterm presentation approved', by: 'lecturer' },
  { key: 'finalThesisSubmitted'       as const, dateKey: 'finalThesisSubmittedAt'       as const, countKey: 'finalThesisUploadCount'       as const, rejKey: 'finalThesisRejected'       as const, label: 'Final Thesis',                  by: 'student' },
  { key: 'finalThesisApproved'        as const, dateKey: 'finalThesisApprovedAt'        as const, countKey: null,                                     rejKey: null,                                  label: 'Final Thesis approved',         by: 'lecturer' },
  { key: 'finalPresentationSubmitted' as const, dateKey: 'finalPresentationSubmittedAt' as const, countKey: 'finalPresentationUploadCount' as const, rejKey: 'finalPresentationRejected' as const, label: 'Final Presentation',            by: 'student' },
  { key: 'finalPresentationApproved'  as const, dateKey: 'finalPresentationApprovedAt'  as const, countKey: null,                                     rejKey: null,                                  label: 'Final Presentation approved',   by: 'lecturer' },
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

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    const r = await fetch(`/api/admin/match/${matchId}`)
    if (r.ok) setMatch(await r.json())
    setLoading(false)
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
                  </div>

                  {/* Admin can toggle lecturer approval steps */}
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

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
