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
  const [publishing, setPublishing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'matching' | 'own-topic'>('matching')

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

  // ── Own-Topic Requests state ────────────────────────────────────────────
  const [proposals, setProposals] = useState<any[]>([])
  const [otLoading, setOtLoading] = useState(true)
  const [otFilter, setOtFilter]   = useState<string>('SUBMITTED')
  const [otAssigning, setOtAssigning] = useState<string | null>(null)
  const [otToast, setOtToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [otSearch, setOtSearch]   = useState<Record<string, string>>({})
  const [otResults, setOtResults] = useState<Record<string, any[]>>({})
  const [otSearching, setOtSearching] = useState<string | null>(null)
  const otTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const showOtToast = (msg: string, ok: boolean) => {
    setOtToast({ msg, ok }); setTimeout(() => setOtToast(null), 3500)
  }

  const fetchOwnTopicData = useCallback(async () => {
    setOtLoading(true)
    const params = otFilter !== 'ALL' ? `?status=${otFilter}` : ''
    const r = await fetch(`/api/admin/own-topic-requests${params}`)
    if (r.ok) setProposals(await r.json())
    setOtLoading(false)
  }, [otFilter])

  useEffect(() => {
    if (activeTab === 'own-topic') fetchOwnTopicData()
  }, [activeTab, fetchOwnTopicData])

  const handleOtSearch = (proposalId: string, q: string) => {
    setOtSearch(prev => ({ ...prev, [proposalId]: q }))
    if (otTimers.current[proposalId]) clearTimeout(otTimers.current[proposalId])
    if (!q.trim()) { setOtResults(prev => ({ ...prev, [proposalId]: [] })); return }
    setOtSearching(proposalId)
    otTimers.current[proposalId] = setTimeout(async () => {
      const r = await fetch(`/api/lecturers?search=${encodeURIComponent(q)}`)
      const data = r.ok ? await r.json() : []
      setOtResults(prev => ({ ...prev, [proposalId]: data }))
      setOtSearching(null)
    }, 300)
  }

  const assignSupervisor = async (proposalId: string, lecturerId: string) => {
    setOtAssigning(proposalId)
    const res = await fetch('/api/admin/own-topic-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, lecturerId }),
    })
    if (res.ok) {
      showOtToast('Supervisor assigned — match created!', true)
      setOtSearch(prev => ({ ...prev, [proposalId]: '' }))
      setOtResults(prev => ({ ...prev, [proposalId]: [] }))
      await fetchOwnTopicData()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      showOtToast(error ?? 'Could not assign supervisor', false)
    }
    setOtAssigning(null)
  }

  const OT_STATUS_COLORS: Record<string, string> = {
    DRAFT:     'bg-bfh-gray-light text-bfh-gray-mid border-bfh-gray-border',
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
    MATCHED:   'bg-green-50 text-green-700 border-green-200',
    WITHDRAWN: 'bg-red-50 text-red-700 border-red-200',
  }

  const OT_METHOD_LABELS: Record<string, string> = {
    QUANTITATIVE:           'Quantitative',
    QUALITATIVE:            'Qualitative',
    DESIGN_SCIENCE_RESEARCH:'Design Science Research',
    LITERATURE_REVIEW:      'Literature Review',
  }

  const otFilterOptions = [
    { value: 'SUBMITTED', label: 'Open (Submitted)' },
    { value: 'MATCHED',   label: 'Matched' },
    { value: 'DRAFT',     label: 'Draft' },
    { value: 'WITHDRAWN', label: 'Withdrawn' },
    { value: 'ALL',       label: 'All' },
  ]

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

  const handlePublish = async () => {
    if (!semester) return
    if (!confirm('Publish results? Students and lecturers will be able to see their assignments.')) return
    setPublishing(true)
    const res = await fetch('/api/admin/matching', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semesterId: semester.id }),
    })
    setPublishing(false)
    if (res.ok) { showMsg('Results published — students and lecturers can now see their assignments.', true); fetchData() }
    else { const { error } = await res.json(); showMsg(error ?? 'Publish failed', false) }
  }

  const handleReset = async () => {
    if (!semester) return
    if (!confirm('Reset matching? This will delete all algorithm-generated matches and allow you to re-run. Manual matches are kept.')) return
    setResetting(true)
    const res = await fetch('/api/admin/matching', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semesterId: semester.id }),
    })
    setResetting(false)
    if (res.ok) { showMsg('Matching reset — you can now re-run the algorithm.', true); setResults(null); fetchData() }
    else { const { error } = await res.json(); showMsg(error ?? 'Reset failed', false) }
  }

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  // ── Progress dots — one dot per phase ──────────────────────────────────────
  // Each dot represents one of the 4 phases. Color logic:
  //   green  = phase fully complete
  //   red    = at least one step rejected / rework requested
  //   amber  = in progress (some steps done, not yet complete)
  //   gray   = not started

  type PhaseState = { cls: string; status: string; statusCls: string; detail: string }

  function phaseState(p: Record<string, boolean> | null, done: boolean, rejected: boolean, inProgress: boolean, detail: string): PhaseState {
    if (!p)         return { cls: 'bg-bfh-gray-border', status: 'Not started',  statusCls: 'text-bfh-gray-mid',  detail }
    if (done)       return { cls: 'bg-green-500',        status: 'Complete',     statusCls: 'text-green-300',     detail }
    if (rejected)   return { cls: 'bg-red-500',          status: 'Rework / rejected', statusCls: 'text-red-300', detail }
    if (inProgress) return { cls: 'bg-amber-400',        status: 'In progress',  statusCls: 'text-amber-300',     detail }
    return           { cls: 'bg-bfh-gray-border',        status: 'Not started',  statusCls: 'text-bfh-gray-mid',  detail }
  }

  // eslint-disable-next-line no-inner-declarations
  function TooltipDot({ cls, label, status, statusCls, detail }: { cls: string; label: string; status: string; statusCls: string; detail: string }) {
    return (
      <div className="relative group flex items-center">
        <span className={`w-2.5 h-2.5 rounded-full inline-block cursor-default ${cls}`} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
          <div className="bg-bfh-gray-dark text-white text-[10px] font-medium rounded px-2 py-1 whitespace-nowrap shadow-lg">
            <div className="font-semibold">{label}</div>
            <div className={statusCls}>{status}</div>
            {detail && <div className="text-bfh-gray-mid mt-0.5">{detail}</div>}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bfh-gray-dark" />
        </div>
      </div>
    )
  }

  // eslint-disable-next-line no-inner-declarations
  function ProgressDots({ progress: p }: { progress: Record<string, boolean> | null }) {
    // Phase 1 — Kick-off (2 steps)
    const p1Done = !!(p?.kickoffCompleted && p?.kickoffStudentConfirmed)
    const p1Prog = !!(p?.kickoffCompleted || p?.kickoffStudentConfirmed)
    const p1Steps = [p?.kickoffCompleted, p?.kickoffStudentConfirmed].filter(Boolean).length
    const phase1 = phaseState(p, p1Done, false, p1Prog && !p1Done, `${p1Steps}/2 steps`)

    // Phase 2 — Proposal (4 steps)
    const p2Done = !!p?.proposalApproved
    const p2Rej  = !!p?.proposalRejected
    const p2Steps = [p?.proposalSubmitted, p?.proposalMeetingCompleted, p?.proposalMeetingStudentConfirmed, p?.proposalApproved].filter(Boolean).length
    const phase2 = phaseState(p, p2Done, p2Rej, p2Steps > 0 && !p2Done, `${p2Steps}/4 steps`)

    // Phase 3 — Midterm (4 steps)
    const p3Done = !!p?.midtermApproved
    const p3Rej  = !!(p?.midtermRejected || p?.midtermReflectionRejected)
    const p3Steps = [p?.midtermSubmitted, p?.midtermMeetingCompleted, p?.midtermReflectionSubmitted, p?.midtermApproved].filter(Boolean).length
    const phase3 = phaseState(p, p3Done, p3Rej, p3Steps > 0 && !p3Done, `${p3Steps}/4 steps`)

    // Phase 4 — Final (4 steps)
    const p4Done = !!(p?.finalThesisApproved && p?.finalPresentationApproved)
    const p4Rej  = !!(p?.finalThesisRejected || p?.finalPresentationRejected)
    const p4Steps = [p?.finalThesisSubmitted, p?.finalThesisApproved, p?.finalPresentationSubmitted, p?.finalPresentationApproved].filter(Boolean).length
    const phase4 = phaseState(p, p4Done, p4Rej, p4Steps > 0 && !p4Done, `${p4Steps}/4 steps`)

    return (
      <div className="flex gap-1.5 items-center">
        <TooltipDot cls={phase1.cls} label="Phase 1 · Kick-off"  status={phase1.status} statusCls={phase1.statusCls} detail={phase1.detail} />
        <TooltipDot cls={phase2.cls} label="Phase 2 · Proposal"  status={phase2.status} statusCls={phase2.statusCls} detail={phase2.detail} />
        <TooltipDot cls={phase3.cls} label="Phase 3 · Midterm"   status={phase3.status} statusCls={phase3.statusCls} detail={phase3.detail} />
        <TooltipDot cls={phase4.cls} label="Phase 4 · Final"     status={phase4.status} statusCls={phase4.statusCls} detail={phase4.detail} />
      </div>
    )
  }

  // eslint-disable-next-line no-inner-declarations
  function GradingDots({ grading }: {
    grading: { mainScored: number; mainTotal: number; submitted: boolean; submittedAt: string | null; aolFilled: number; aolTotal: number } | null
  }) {
    const mainCls = !grading || grading.mainScored === 0
      ? 'bg-bfh-gray-border'
      : grading.submitted ? 'bg-green-500' : 'bg-amber-400'
    const mainStatus = !grading || grading.mainScored === 0
      ? 'Not started'
      : grading.submitted
      ? `Submitted · ${grading.mainScored}/${grading.mainTotal} scored`
      : `In progress · ${grading.mainScored}/${grading.mainTotal} scored`
    const mainStatusCls = grading?.submitted ? 'text-green-300' : grading && grading.mainScored > 0 ? 'text-amber-300' : 'text-bfh-gray-mid'

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

  return (
    <div className="space-y-6">
      <h1>Matching</h1>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-bfh-gray-light rounded-lg w-fit">
        {([
          { key: 'matching' as const, label: 'Algorithm Matching' },
          { key: 'own-topic' as const, label: 'Own-Topic Requests' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-bfh-gray-dark'
                : 'text-bfh-gray-mid hover:text-bfh-gray-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Own-Topic Requests Tab ── */}
      {activeTab === 'own-topic' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-bfh-gray-mid">
              Student-proposed topics awaiting a supervisor. You can manually assign a supervisor if needed.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-bfh-gray-mid font-medium">Show:</label>
              <select
                className="input text-sm py-1.5"
                value={otFilter}
                onChange={e => { setOtFilter(e.target.value); setOtLoading(true) }}
              >
                {otFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {otLoading ? (
            <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
          ) : proposals.length === 0 ? (
            <div className="card p-10 text-center text-bfh-gray-mid">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No proposals with status &ldquo;{otFilter}&rdquo;.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((p: any) => (
                <div key={p.id} className="card overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 py-3 bg-bfh-gray-light border-b border-bfh-gray-border flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-bfh-gray-dark">{p.student.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${OT_STATUS_COLORS[p.status]}`}>
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
                        {OT_METHOD_LABELS[p.method] ?? p.method}
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
                        {p.supervisorRequests.map((r: any) => (
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
                            {r.responseNote && <span className="text-bfh-gray-mid italic">&ldquo;{r.responseNote}&rdquo;</span>}
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
                          value={otSearch[p.id] ?? ''}
                          onChange={e => handleOtSearch(p.id, e.target.value)}
                        />
                        {otSearching === p.id && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-bfh-gray-mid text-xs">…</span>
                        )}
                        {(otResults[p.id]?.length ?? 0) > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 border border-bfh-gray-border rounded-lg bg-white shadow-sm z-10 overflow-hidden">
                            {otResults[p.id].map((l: any) => (
                              <div key={l.id} className="flex items-center gap-3 px-3 py-2 hover:bg-bfh-gray-light border-b border-bfh-gray-border last:border-0">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{l.name}</div>
                                  <div className="text-xs text-bfh-gray-mid">{l.email}</div>
                                </div>
                                <button
                                  disabled={otAssigning === p.id}
                                  onClick={() => assignSupervisor(p.id, l.id)}
                                  className="shrink-0 text-xs btn-primary py-1 px-2.5 disabled:opacity-50"
                                >
                                  {otAssigning === p.id ? '…' : 'Assign'}
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
          )}

          {otToast && (
            <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${otToast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
              {otToast.msg}
            </div>
          )}
        </div>
      )}

      {/* ── Algorithm Matching Tab ── */}
      {activeTab === 'matching' && <>
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
                { label: '1. Review data',     done: true },
                { label: '2. Approve',         done: semester.matchingApproved },
                { label: '3. Run matching',    done: semester.matchingRun },
                { label: '4. Review & publish',done: semester.resultsPublished },
                { label: '5. Send emails',     done: semester.emailsSent },
              ].map((step, i) => (
                <div key={i} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded ${step.done ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
                    <span>{step.done ? '✓' : '○'}</span> {step.label}
                  </div>
                  {i < 4 && <div className="w-4 h-px bg-bfh-gray-border mx-1 shrink-0"/>}
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
              {semester.matchingApproved && (
                <button onClick={handleRunMatching} disabled={running} className="btn-primary">
                  {running ? 'Running…' : semester.matchingRun ? '↺ Re-run Matching' : '▶ Run Matching Algorithm'}
                </button>
              )}
              {semester.matchingRun && !semester.resultsPublished && (
                <button onClick={handlePublish} disabled={publishing} className="btn-primary">
                  {publishing ? 'Publishing…' : '✅ Publish Results'}
                </button>
              )}
              {semester.resultsPublished && !semester.emailsSent && (
                <button onClick={handleSendEmails} disabled={sendingEmails} className="btn-primary">
                  {sendingEmails ? 'Sending…' : '✉ Send Result Emails'}
                </button>
              )}
              {semester.matchingRun && (
                <button onClick={handleReset} disabled={resetting} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
                  {resetting ? 'Resetting…' : '↺ Reset Matching'}
                </button>
              )}
            </div>

            {/* Admin-only preview notice */}
            {semester.matchingRun && !semester.resultsPublished && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span>⚠️</span>
                <span><strong>Preview mode:</strong> Results are visible to admins only. Students and lecturers cannot see assignments until you publish.</span>
              </div>
            )}
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
      </>}
    </div>
  )
}
