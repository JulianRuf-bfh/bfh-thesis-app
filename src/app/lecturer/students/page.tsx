'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const MILESTONES = [
  { key: 'kickoffCompleted',                  label: 'Kick-off thesis process (lecturer)' },
  { key: 'kickoffStudentConfirmed',            label: 'Kick-off thesis process (student)' },
  { key: 'proposalSubmitted',                  label: 'Proposal handed in' },
  { key: 'proposalMeetingCompleted',           label: 'Proposal meeting (lecturer)' },
  { key: 'proposalMeetingStudentConfirmed',    label: 'Proposal meeting (student)' },
  { key: 'proposalApproved',                   label: 'Proposal approved' },
  { key: 'midtermSubmitted',                   label: 'Midterm presented' },
  { key: 'midtermApproved',                    label: 'Midterm approved' },
  { key: 'finalThesisSubmitted',               label: 'Final Thesis' },
  { key: 'finalThesisApproved',                label: 'Final Thesis approved' },
  { key: 'finalPresentationSubmitted',         label: 'Final Presentation' },
  { key: 'finalPresentationApproved',          label: 'Final Presentation approved' },
] as const

function ProgressDots({ progress }: { progress: any }) {
  return (
    <div className="flex gap-1">
      {MILESTONES.map(m => (
        <div
          key={m.key}
          className={`h-2.5 w-2.5 rounded-full ${progress?.[m.key] ? 'bg-green-500' : 'bg-bfh-gray-border'}`}
          title={m.label}
        />
      ))}
    </div>
  )
}

function progressLabel(progress: any): string {
  if (!progress) return 'Not started'
  const done = MILESTONES.filter(m => progress[m.key]).length
  if (done === 0)                 return 'Not started'
  if (done === MILESTONES.length) return 'Completed'
  return `${done} / ${MILESTONES.length} steps`
}

function StudentTable({ matches, onSelect }: { matches: any[]; onSelect: (id: string) => void }) {
  if (matches.length === 0) return <p className="text-sm text-bfh-gray-mid italic px-4 py-3">No students in this category.</p>

  const byTopic: Record<string, { topicTitle: string; items: any[] }> = {}
  for (const m of matches) {
    if (!byTopic[m.topic.id]) byTopic[m.topic.id] = { topicTitle: m.topic.title, items: [] }
    byTopic[m.topic.id].items.push(m)
  }

  return (
    <div className="space-y-4">
      {Object.values(byTopic).map(({ topicTitle, items }) => (
        <div key={topicTitle} className="card overflow-hidden">
          <div className="px-4 py-3 bg-bfh-gray-light border-b border-bfh-gray-border">
            <h3 className="font-semibold text-bfh-gray-dark text-sm line-clamp-1">{topicTitle}</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-bfh-gray-border text-xs text-bfh-gray-mid font-medium uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-left">Programme</th>
                <th className="px-4 py-2 text-left">Progress</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Uploads</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => {
                const done        = MILESTONES.filter(ms => m.progress?.[ms.key]).length
                const unseenFiles = m.files?.filter((f: any) => !f.seenByLecturer).length ?? 0
                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelect(m.id)}
                    className="border-b border-bfh-gray-border last:border-0 hover:bg-bfh-gray-light cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-bfh-gray-dark">{m.student.name}</div>
                      <div className="text-xs text-bfh-gray-mid">{m.student.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-bfh-gray-mid">
                      {m.student.programme ?? '—'}
                      {m.student.level && <span className="ml-1 text-xs">({m.student.level})</span>}
                    </td>
                    <td className="px-4 py-3"><ProgressDots progress={m.progress} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        done === MILESTONES.length ? 'bg-green-100 text-green-800'
                        : done > 0               ? 'bg-bfh-yellow-light text-bfh-gray-dark'
                        :                          'bg-bfh-gray-light text-bfh-gray-mid'
                      }`}>
                        {progressLabel(m.progress)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {unseenFiles > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full">
                          📬 {unseenFiles} new
                        </span>
                      ) : m.files?.length > 0 ? (
                        <span className="text-xs text-bfh-gray-mid">{m.files.length} file{m.files.length !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-xs text-bfh-gray-border">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-bfh-red font-medium">View →</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export default function LecturerStudentsPage() {
  const [primary, setPrimary] = useState<any[]>([])
  const [co, setCo]           = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'primary' | 'co'>('primary')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/lecturer/students')
      .then(r => r.json())
      .then(d => {
        setPrimary(Array.isArray(d?.primary) ? d.primary : [])
        setCo(Array.isArray(d?.co) ? d.co : [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  const total      = primary.length + co.length
  const totalUnseen = [...primary, ...co].reduce(
    (s, m) => s + (m.files?.filter((f: any) => !f.seenByLecturer).length ?? 0), 0
  )

  if (total === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12 card p-10 text-center text-bfh-gray-mid">
        <div className="text-4xl mb-3">🎓</div>
        <h2 className="text-lg font-semibold mb-2">No students assigned yet</h2>
        <p className="text-sm">Once the matching algorithm has run, your assigned students will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>My Students</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">
            {primary.length} as first supervisor · {co.length} as co-supervisor
          </p>
        </div>
        {totalUnseen > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-3 py-2 rounded-lg">
            <span className="text-base">📬</span>
            {totalUnseen} new upload{totalUnseen !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bfh-gray-border">
        {[
          { key: 'primary' as const, label: 'First Supervisor', count: primary.length },
          { key: 'co'      as const, label: 'Co-Supervisor',    count: co.length },
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

      {tab === 'primary' && (
        <div>
          {primary.length === 0
            ? <p className="text-sm text-bfh-gray-mid italic">No students assigned as first supervisor.</p>
            : <StudentTable matches={primary} onSelect={id => router.push(`/lecturer/students/${id}`)} />}
        </div>
      )}

      {tab === 'co' && (
        <div>
          {co.length === 0 ? (
            <div className="card p-8 text-center text-bfh-gray-mid">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm">You are not assigned as co-supervisor on any topic yet.</p>
              <p className="text-xs mt-1">A first supervisor adds you via their topic's edit page.</p>
            </div>
          ) : (
            <StudentTable matches={co} onSelect={id => router.push(`/lecturer/students/${id}`)} />
          )}
        </div>
      )}
    </div>
  )
}
