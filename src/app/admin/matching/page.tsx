'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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

  // ── Manual match state ───────────────────────────────────────────────────
  const [manualOpen, setManualOpen]             = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [topicMode, setTopicMode]               = useState<'existing' | 'new'>('existing')

  // Student
  const [studentQ, setStudentQ]               = useState('')
  const [studentResults, setStudentResults]   = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const studentTimer = useRef<NodeJS.Timeout | null>(null)

  // Existing topic
  const [topicQ, setTopicQ]               = useState('')
  const [topicResults, setTopicResults]   = useState<any[]>([])
  const [selectedTopic, setSelectedTopic] = useState<any>(null)
  const topicTimer = useRef<NodeJS.Timeout | null>(null)

  // New topic fields
  const [newTopicTitle, setNewTopicTitle]       = useState('')
  const [newTopicMethod, setNewTopicMethod]     = useState('')
  const [newTopicLanguage, setNewTopicLanguage] = useState('')
  const [supQ, setSupQ]                         = useState('')
  const [supResults, setSupResults]             = useState<any[]>([])
  const [selectedSup, setSelectedSup]           = useState<any>(null)
  const supTimer = useRef<NodeJS.Timeout | null>(null)

  // Co-supervisors
  const [coQ, setCoQ]                       = useState('')
  const [coResults, setCoResults]           = useState<any[]>([])
  const [selectedCoSups, setSelectedCoSups] = useState<any[]>([])
  const coTimer = useRef<NodeJS.Timeout | null>(null)

  const searchStudents = (q: string) => {
    setStudentQ(q); setSelectedStudent(null)
    if (studentTimer.current) clearTimeout(studentTimer.current)
    if (!q.trim()) { setStudentResults([]); return }
    studentTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/admin/users?role=STUDENT`)
      const all = r.ok ? await r.json() : []
      const ql = q.toLowerCase()
      setStudentResults(all.filter((u: any) =>
        u.name.toLowerCase().includes(ql) || u.email.toLowerCase().includes(ql)
      ).slice(0, 8))
    }, 300)
  }

  const searchTopics = (q: string) => {
    setTopicQ(q); setSelectedTopic(null)
    if (topicTimer.current) clearTimeout(topicTimer.current)
    if (!q.trim()) { setTopicResults([]); return }
    topicTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/topics?search=${encodeURIComponent(q)}`)
      setTopicResults(r.ok ? (await r.json()).slice(0, 8) : [])
    }, 300)
  }

  const searchSupervisors = (q: string) => {
    setSupQ(q); setSelectedSup(null)
    if (supTimer.current) clearTimeout(supTimer.current)
    if (!q.trim()) { setSupResults([]); return }
    supTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/lecturers?search=${encodeURIComponent(q)}`)
      setSupResults(r.ok ? await r.json() : [])
    }, 300)
  }

  const searchCoSups = (q: string) => {
    setCoQ(q)
    if (coTimer.current) clearTimeout(coTimer.current)
    if (!q.trim()) { setCoResults([]); return }
    coTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/lecturers?search=${encodeURIComponent(q)}`)
      setCoResults(r.ok ? await r.json() : [])
    }, 300)
  }

  const resetManualForm = () => {
    setSelectedStudent(null); setStudentQ(''); setStudentResults([])
    setSelectedTopic(null);   setTopicQ('');   setTopicResults([])
    setNewTopicTitle(''); setNewTopicMethod(''); setNewTopicLanguage('')
    setSelectedSup(null); setSupQ(''); setSupResults([])
    setSelectedCoSups([]); setCoQ(''); setCoResults([])
    setTopicMode('existing')
  }

  const submitManualMatch = async () => {
    if (!selectedStudent) { showMsg('Please select a student', false); return }
    if (topicMode === 'existing' && !selectedTopic) { showMsg('Please select a topic', false); return }
    if (topicMode === 'new' && (!newTopicTitle.trim() || !selectedSup || !newTopicMethod || !newTopicLanguage)) {
      showMsg('Please fill in all new topic fields', false); return
    }

    setManualSubmitting(true)
    const body = topicMode === 'existing'
      ? { studentId: selectedStudent.id, topicId: selectedTopic.id, coSupervisorIds: selectedCoSups.map((c: any) => c.id) }
      : { studentId: selectedStudent.id, newTopic: { title: newTopicTitle.trim(), lecturerId: selectedSup.id, method: newTopicMethod, language: newTopicLanguage }, coSupervisorIds: selectedCoSups.map((c: any) => c.id) }

    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const label = topicMode === 'existing' ? selectedTopic.title : newTopicTitle.trim()
      showMsg(`Matched ${selectedStudent.name} → ${label}`, true)
      resetManualForm()
      setManualOpen(false)
      fetchData()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showMsg(error ?? 'Could not create match', false)
    }
    setManualSubmitting(false)
  }

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

// ── Progress dots ─────────────────────────────────────────────────────────────
const PROGRESS_MILESTONES = [
  { label: 'Proposal',      submitted: 'proposalSubmitted',          approved: 'proposalApproved',          rejected: 'proposalRejected' },
  { label: 'Midterm',       submitted: 'midtermSubmitted',           approved: 'midtermApproved',           rejected: 'midtermRejected' },
  { label: 'Final Thesis',  submitted: 'finalThesisSubmitted',       approved: 'finalThesisApproved',       rejected: 'finalThesisRejected' },
  { label: 'Final Pres.',   submitted: 'finalPresentationSubmitted', approved: 'finalPresentationApproved', rejected: 'finalPresentationRejected' },
] as const

// ── Shared tooltip dot ────────────────────────────────────────────────────────
function TooltipDot({ cls, label, status, statusCls }: { cls: string; label: string; status: string; statusCls: string }) {
  return (
    <div className="relative group flex items-center">
      <span className={`w-2.5 h-2.5 rounded-full inline-block cursor-default ${cls}`} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
        <div className="bg-bfh-gray-dark text-white text-[10px] font-medium rounded px-2 py-1 whitespace-nowrap shadow-lg">
          <div>{label}</div>
          <div className={statusCls}>{status}</div>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bfh-gray-dark" />
      </div>
    </div>
  )
}

function ProgressDots({ progress }: { progress: Record<string, boolean> | null }) {
  return (
    <div className="flex gap-1.5 items-center">
      {PROGRESS_MILESTONES.map(m => {
        const approved  = progress?.[m.approved]
        const rejected  = progress?.[m.rejected]
        const submitted = progress?.[m.submitted]
        let cls = 'bg-bfh-gray-border'; let status = 'Not started'; let statusCls = 'text-bfh-gray-mid'
        if (approved)       { cls = 'bg-green-500'; status = 'Approved';        statusCls = 'text-green-300' }
        else if (rejected)  { cls = 'bg-red-500';   status = 'Rejected';        statusCls = 'text-red-300' }
        else if (submitted) { cls = 'bg-amber-400'; status = 'Pending review';  statusCls = 'text-amber-300' }
        return <TooltipDot key={m.label} cls={cls} label={m.label} status={status} statusCls={statusCls} />
      })}
    </div>
  )
}

// ── Grading dots ──────────────────────────────────────────────────────────────
function GradingDots({ grading }: {
  grading: { mainScored: number; mainTotal: number; submitted: boolean; submittedAt: string | null; aolFilled: number; aolTotal: number } | null
}) {
  // Main grading dot: green = submitted, amber = in progress, gray = not started
  const mainCls = !grading || grading.mainScored === 0
    ? 'bg-bfh-gray-border'
    : grading.submitted ? 'bg-green-500' : 'bg-amber-400'
  const mainStatus = !grading || grading.mainScored === 0
    ? 'Not started'
    : grading.submitted
    ? `Submitted · ${grading.mainScored}/${grading.mainTotal} scored`
    : `In progress · ${grading.mainScored}/${grading.mainTotal} scored`
  const mainStatusCls = grading?.submitted ? 'text-green-300' : grading && grading.mainScored > 0 ? 'text-amber-300' : 'text-bfh-gray-mid'

  // AoL dot: green = all filled, amber = partial, gray = none
  const aolCls = !grading || grading.aolFilled === 0
    ? 'bg-bfh-gray-border'
    : grading.aolFilled >= grading.aolTotal ? 'bg-green-500' : 'bg-amber-400'
  const aolStatus = !grading || grading.aolFilled === 0
    ? 'Not started'
    : `${grading.aolFilled}/${grading.aolTotal} criteria filled`
  const aolStatusCls = grading && grading.aolFilled >= grading.aolTotal ? 'text-green-300' : grading && grading.aolFilled > 0 ? 'text-amber-300' : 'text-bfh-gray-mid'

  return (
    <div className="flex gap-1.5 items-center">
      <TooltipDot cls={mainCls} label="Main Grading" status={mainStatus} statusCls={mainStatusCls} />
      <TooltipDot cls={aolCls}  label="AoL Assessment" status={aolStatus} statusCls={aolStatusCls} />
    </div>
  )
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

          {/* Manual Match Card — always available to admin */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setManualOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-bfh-gray-dark hover:bg-bfh-gray-light transition-colors"
            >
              <span>➕ Manually assign a student to a topic</span>
              <span className="text-bfh-gray-mid">{manualOpen ? '▲' : '▼'}</span>
            </button>

            {manualOpen && (
              <div className="border-t border-bfh-gray-border px-5 py-4 space-y-4">
                <p className="text-xs text-bfh-gray-mid">
                  Bypasses all deadlines and matching locks. Creates a match visible in the normal workflow.
                </p>

                {/* Student picker */}
                <div>
                  <label className="label">Student <span className="text-bfh-red">*</span></label>
                  {selectedStudent ? (
                    <div className="flex items-center gap-2 p-2 rounded border border-green-200 bg-green-50 text-sm">
                      <span className="font-medium text-green-800">{selectedStudent.name}</span>
                      <span className="text-green-600 text-xs">{selectedStudent.email}</span>
                      <button onClick={() => { setSelectedStudent(null); setStudentQ('') }} className="ml-auto text-xs text-bfh-gray-mid hover:text-red-600">✕</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        className="input text-sm"
                        placeholder="Search student by name or email…"
                        value={studentQ}
                        onChange={e => searchStudents(e.target.value)}
                      />
                      {studentResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-20 overflow-hidden">
                          {studentResults.map((s: any) => (
                            <div key={s.id} onClick={() => { setSelectedStudent(s); setStudentQ(s.name); setStudentResults([]) }}
                              className="px-3 py-2 hover:bg-bfh-gray-light cursor-pointer border-b border-bfh-gray-border last:border-0">
                              <div className="text-sm font-medium">{s.name}</div>
                              <div className="text-xs text-bfh-gray-mid">{s.email} · {s.programme ?? '–'} {s.level ?? ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Topic mode toggle */}
                <div>
                  <label className="label">Topic &amp; Supervisor <span className="text-bfh-red">*</span></label>
                  <div className="flex gap-1 p-1 bg-bfh-gray-light rounded-lg w-fit mb-3">
                    {(['existing', 'new'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => { setTopicMode(mode); setSelectedTopic(null); setTopicQ(''); setTopicResults([]); setNewTopicTitle(''); setNewTopicMethod(''); setNewTopicLanguage(''); setSelectedSup(null); setSupQ(''); setSupResults([]) }}
                        className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${topicMode === mode ? 'bg-white shadow-sm text-bfh-gray-dark' : 'text-bfh-gray-mid hover:text-bfh-gray-dark'}`}
                      >
                        {mode === 'existing' ? '🔍 Use existing topic' : '✏️ Create new topic'}
                      </button>
                    ))}
                  </div>

                  {/* Existing topic search */}
                  {topicMode === 'existing' && (
                    selectedTopic ? (
                      <div className="flex items-center gap-2 p-2 rounded border border-green-200 bg-green-50 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-green-800 truncate">{selectedTopic.title}</div>
                          <div className="text-xs text-green-600">Supervisor: {selectedTopic.lecturerName} · {selectedTopic.availableSlots} slot(s) left</div>
                        </div>
                        <button onClick={() => { setSelectedTopic(null); setTopicQ('') }} className="shrink-0 text-xs text-bfh-gray-mid hover:text-red-600">✕</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          className="input text-sm"
                          placeholder="Search topic by title…"
                          value={topicQ}
                          onChange={e => searchTopics(e.target.value)}
                        />
                        {topicResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-20 overflow-hidden">
                            {topicResults.map((t: any) => (
                              <div key={t.id} onClick={() => { setSelectedTopic(t); setTopicQ(t.title); setTopicResults([]) }}
                                className="px-3 py-2 hover:bg-bfh-gray-light cursor-pointer border-b border-bfh-gray-border last:border-0">
                                <div className="text-sm font-medium line-clamp-1">{t.title}</div>
                                <div className="text-xs text-bfh-gray-mid">{t.lecturerName} · {t.availableSlots} slot(s) left</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* New topic form */}
                  {topicMode === 'new' && (
                    <div className="space-y-3 p-3 border border-bfh-gray-border rounded-lg bg-bfh-gray-light/40">
                      <div>
                        <label className="label text-xs">Topic title <span className="text-bfh-red">*</span></label>
                        <input
                          className="input text-sm"
                          placeholder="Working title for the new topic…"
                          value={newTopicTitle}
                          onChange={e => setNewTopicTitle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Method <span className="text-bfh-red">*</span></label>
                          <select className="input text-sm" value={newTopicMethod} onChange={e => setNewTopicMethod(e.target.value)}>
                            <option value="">Select…</option>
                            <option value="QUANTITATIVE">Quantitative</option>
                            <option value="QUALITATIVE">Qualitative</option>
                            <option value="DESIGN_SCIENCE_RESEARCH">Design Science Research</option>
                            <option value="LITERATURE_REVIEW">Literature Review</option>
                          </select>
                        </div>
                        <div>
                          <label className="label text-xs">Language <span className="text-bfh-red">*</span></label>
                          <select className="input text-sm" value={newTopicLanguage} onChange={e => setNewTopicLanguage(e.target.value)}>
                            <option value="">Select…</option>
                            <option value="GERMAN">German</option>
                            <option value="ENGLISH">English</option>
                            <option value="BOTH">German or English</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="label text-xs">Supervisor <span className="text-bfh-red">*</span></label>
                        {selectedSup ? (
                          <div className="flex items-center gap-2 p-2 rounded border border-green-200 bg-green-50 text-sm">
                            <span className="font-medium text-green-800 flex-1">{selectedSup.name}</span>
                            <span className="text-xs text-green-600">{selectedSup.email}</span>
                            <button onClick={() => { setSelectedSup(null); setSupQ('') }} className="text-xs text-bfh-gray-mid hover:text-red-600">✕</button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              className="input text-sm"
                              placeholder="Search lecturer by name or email…"
                              value={supQ}
                              onChange={e => searchSupervisors(e.target.value)}
                            />
                            {supResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-20 overflow-hidden">
                                {supResults.map((s: any) => (
                                  <div key={s.id} onClick={() => { setSelectedSup(s); setSupQ(s.name); setSupResults([]) }}
                                    className="px-3 py-2 hover:bg-bfh-gray-light cursor-pointer border-b border-bfh-gray-border last:border-0">
                                    <div className="text-sm font-medium">{s.name}</div>
                                    <div className="text-xs text-bfh-gray-mid">{s.email}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Co-supervisor picker */}
                <div>
                  <label className="label">Co-supervisor(s) <span className="text-xs text-bfh-gray-mid font-normal">(optional)</span></label>
                  {selectedCoSups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedCoSups.map((c: any) => (
                        <span key={c.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                          {c.name}
                          <button onClick={() => setSelectedCoSups(prev => prev.filter(x => x.id !== c.id))} className="hover:text-red-600">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      className="input text-sm"
                      placeholder="Search lecturer to add as co-supervisor…"
                      value={coQ}
                      onChange={e => searchCoSups(e.target.value)}
                    />
                    {coResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-20 overflow-hidden">
                        {coResults
                          .filter((c: any) => !selectedCoSups.some((s: any) => s.id === c.id))
                          .map((c: any) => (
                            <div key={c.id} onClick={() => { setSelectedCoSups(prev => [...prev, c]); setCoQ(''); setCoResults([]) }}
                              className="px-3 py-2 hover:bg-bfh-gray-light cursor-pointer border-b border-bfh-gray-border last:border-0">
                              <div className="text-sm font-medium">{c.name}</div>
                              <div className="text-xs text-bfh-gray-mid">{c.email}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    disabled={manualSubmitting || !selectedStudent || !selectedTopic}
                    onClick={submitManualMatch}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {manualSubmitting ? 'Creating…' : 'Create Match'}
                  </button>
                  <button onClick={() => { resetManualForm(); setManualOpen(false) }} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
                        <th>Progress</th>
                        <th>Grading</th>
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
                                 m.lecturerName.toLowerCase().includes(q) ||
                                 (m.coSupervisors ?? []).some((cs: any) => cs.name.toLowerCase().includes(q))
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
                          <td>
                            <div>{m.lecturerName}</div>
                            {m.coSupervisors?.length > 0 && (
                              <div className="text-xs text-bfh-gray-mid mt-0.5">
                                Co: {m.coSupervisors.map((cs: any) => cs.name).join(', ')}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${m.matchedRank === 1 ? 'bg-green-100 text-green-700' : m.matchedRank === 2 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              #{m.matchedRank}
                            </span>
                          </td>
                          <td><ProgressDots progress={m.progress} /></td>
                          <td><GradingDots grading={m.grading} /></td>
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
