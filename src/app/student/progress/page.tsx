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
  proposalSubmitted:   boolean; proposalSubmittedAt:   string | null
  proposalApproved:    boolean; proposalApprovedAt:    string | null
  midtermSubmitted:    boolean; midtermSubmittedAt:    string | null
  midtermApproved:     boolean; midtermApprovedAt:     string | null
  proposalRejected:    boolean; proposalRejectedAt:    string | null
  midtermRejected:     boolean; midtermRejectedAt:     string | null
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

const MILESTONES = [
  { key: 'proposalSubmitted'          as const, dateKey: 'proposalSubmittedAt'          as const, countKey: 'proposalUploadCount'          as const, rejKey: 'proposalRejected'          as const, label: 'Proposal hand in',                    by: 'student',  desc: 'Upload your written thesis proposal.' },
  { key: 'proposalApproved'           as const, dateKey: 'proposalApprovedAt'           as const, countKey: null,                                     rejKey: null,                                  label: 'Proposal approved',                  by: 'lecturer', desc: 'Your supervisor reviews and approves the proposal.' },
  { key: 'midtermSubmitted'           as const, dateKey: 'midtermSubmittedAt'           as const, countKey: 'midtermUploadCount'           as const, rejKey: 'midtermRejected'           as const, label: 'Midterm presentation',                by: 'student',  desc: 'Upload materials / evidence of your midterm presentation.' },
  { key: 'midtermApproved'            as const, dateKey: 'midtermApprovedAt'            as const, countKey: null,                                     rejKey: null,                                  label: 'Midterm presentation approved',      by: 'lecturer', desc: 'Your supervisor confirms the midterm presentation was completed.' },
  { key: 'finalThesisSubmitted'       as const, dateKey: 'finalThesisSubmittedAt'       as const, countKey: 'finalThesisUploadCount'       as const, rejKey: 'finalThesisRejected'       as const, label: 'Final Thesis',                        by: 'student',  desc: 'Upload your completed final thesis document.' },
  { key: 'finalThesisApproved'        as const, dateKey: 'finalThesisApprovedAt'        as const, countKey: null,                                     rejKey: null,                                  label: 'Final Thesis approved',              by: 'lecturer', desc: 'Your supervisor confirms receipt of the final thesis.' },
  { key: 'finalPresentationSubmitted' as const, dateKey: 'finalPresentationSubmittedAt' as const, countKey: 'finalPresentationUploadCount' as const, rejKey: 'finalPresentationRejected' as const, label: 'Final Presentation',                  by: 'student',  desc: 'Upload materials from your final thesis presentation.' },
  { key: 'finalPresentationApproved'  as const, dateKey: 'finalPresentationApprovedAt'  as const, countKey: null,                                     rejKey: null,                                  label: 'Final Presentation approved',        by: 'lecturer', desc: 'Your supervisor confirms the final presentation was completed.' },
] as const

const EMPTY_PROGRESS: Progress = {
  proposalSubmitted: false, proposalSubmittedAt: null,
  proposalApproved:  false, proposalApprovedAt:  null,
  midtermSubmitted:  false, midtermSubmittedAt:  null,
  midtermApproved:   false, midtermApprovedAt:   null,
  proposalRejected:  false, proposalRejectedAt:  null,
  midtermRejected:   false, midtermRejectedAt:   null,
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

export default function StudentProgressPage() {
  const [matchId, setMatchId]     = useState<string | null>(null)
  const [semesterName, setSemName] = useState('')
  const [progress, setProgress]   = useState<Progress>(EMPTY_PROGRESS)
  const [files, setFiles]         = useState<FileRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [noMatch, setNoMatch]     = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1>Thesis Progress</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">{semesterName}</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-bfh-gray-dark">Milestones</h3>
          <span className="text-xs font-medium text-bfh-gray-mid bg-bfh-gray-light px-2.5 py-1 rounded-full">
            {completedCount} / {MILESTONES.length} completed
          </span>
        </div>
        <div className="w-full bg-bfh-gray-border rounded-full h-1.5 mb-5">
          <div
            className="h-1.5 rounded-full bg-bfh-yellow transition-all duration-500"
            style={{ width: `${(completedCount / MILESTONES.length) * 100}%` }}
          />
        </div>

        <div className="space-y-4">
          {MILESTONES.map((m, i) => {
            const done        = progress[m.key]
            const dateVal     = progress[m.dateKey]
            const isStudent   = m.by === 'student'
            const prevDone    = i === 0 || progress[MILESTONES[i - 1].key]
            const milestoneFiles = files.filter(f => f.milestone === m.key)
            const isUploading    = uploading === m.key
            const uploadCount  = (m.countKey && progress[m.countKey]) ?? 0
            const isRejected   = (m.rejKey && progress[m.rejKey]) ?? false
            const nextApproved = MILESTONES[i + 1] ? progress[MILESTONES[i + 1].key] : false
            const limitReached = isStudent && uploadCount >= MAX_UPLOADS && !isRejected
            const canUpload    = isStudent && prevDone && !nextApproved && (uploadCount < MAX_UPLOADS || isRejected)

            return (
              <div key={m.key} className={`rounded-lg border transition-colors ${
                done        ? 'bg-green-50 border-green-200'
                : isRejected ? 'bg-red-50 border-red-200'
                : prevDone  ? 'bg-white border-bfh-gray-border'
                :              'bg-bfh-gray-light border-bfh-gray-border opacity-60'
              }`}>
                <div className="flex items-start gap-3 p-3">
                  <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    done       ? 'bg-green-500 text-white'
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
                        isStudent ? 'bg-bfh-yellow text-bfh-gray-dark' : 'bg-bfh-red text-white'
                      }`}>
                        {isStudent ? 'You' : 'Supervisor'}
                      </span>
                      {m.countKey && !isRejected && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                          limitReached ? 'bg-red-50 border-red-200 text-red-700' : 'bg-bfh-gray-light border-bfh-gray-border text-bfh-gray-mid'
                        }`}>
                          {uploadCount} / {MAX_UPLOADS} uploads used
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">
                          Rework required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-bfh-gray-mid mt-0.5">{m.desc}</p>
                    {done && dateVal && <p className="text-xs text-green-700 mt-1">Submitted: {formatDateTime(dateVal)}</p>}
                    {isRejected && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Your supervisor has requested a rework. Please upload a revised version.
                      </p>
                    )}
                    {!isRejected && limitReached && !nextApproved && (
                      <p className="text-xs text-red-600 mt-1 font-medium">Upload limit reached — no further changes allowed.</p>
                    )}
                  </div>

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
                        disabled={isUploading}
                        onClick={() => fileRefs.current[m.key]?.click()}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                          isRejected ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'
                        }`}
                      >
                        {isUploading ? 'Uploading…' : isRejected ? '↑ Re-upload Rework' : '↑ Upload'}
                      </button>
                    </>
                  )}
                  {isStudent && !canUpload && (
                    <input ref={el => { fileRefs.current[m.key] = el }} type="file" className="hidden" />
                  )}
                </div>

                {milestoneFiles.length > 0 && (
                  <div className="border-t border-bfh-gray-border mx-3 mb-3 pt-2 space-y-1.5">
                    <p className="text-[10px] text-bfh-gray-mid font-semibold uppercase tracking-wider mb-1">Upload history</p>
                    {milestoneFiles.map((f, fi) => (
                      <div key={f.id} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-bfh-gray-border">
                        <span className="text-xs font-bold text-bfh-gray-mid w-5 shrink-0">#{fi + 1}</span>
                        <span className="text-base">📄</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-bfh-gray-dark truncate">{f.originalName}</div>
                          <div className="text-[10px] text-bfh-gray-mid">{formatBytes(f.size)} · {formatDateTime(f.uploadedAt)}</div>
                        </div>
                        <a
                          href={`/api/files/${f.matchId}/${f.storedName}`}
                          download={f.originalName}
                          className="text-xs text-bfh-red hover:underline shrink-0"
                        >
                          Download
                        </a>
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
    </div>
  )
}
