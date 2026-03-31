'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { PROGRAMME_LABELS } from '@/types'
import type { Programme } from '@/types'

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading dashboard…</div>

  const { semester, stats } = data ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1>Admin Dashboard</h1>
        {semester && (
          <p className="text-sm text-bfh-gray-mid mt-1">
            Active semester: <strong>{semester.name}</strong> ·
            Lecturer deadline: {formatDate(semester.lecturerDeadline)} ·
            Student deadline: {formatDate(semester.studentDeadline)}
          </p>
        )}
      </div>

      {!semester ? (
        <div className="card p-8 text-center text-bfh-gray-mid">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-medium">No active semester</p>
          <p className="text-sm mt-1">Create and activate a semester to get started.</p>
          <a href="/admin/semesters" className="btn-primary mt-4 inline-block text-sm">Manage Semesters</a>
        </div>
      ) : (
        <>
          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Lecturer deadline', passed: new Date() > new Date(semester.lecturerDeadline) },
              { label: 'Student deadline', passed: new Date() > new Date(semester.studentDeadline) },
              { label: 'Matching approved', passed: semester.matchingApproved },
              { label: 'Matching run', passed: semester.matchingRun },
              { label: 'Emails sent', passed: semester.emailsSent },
            ].map(({ label, passed }) => (
              <span key={label} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${passed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <span>{passed ? '✓' : '○'}</span> {label}
              </span>
            ))}
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Topics', value: stats.topicCount, sub: `${stats.totalCapacity} total slots` },
              { label: 'Students', value: stats.studentCount, sub: `${stats.studentsWithPrefs} submitted prefs` },
              { label: 'Matches Made', value: stats.matchCount, sub: stats.matchCount > 0 ? `${Math.round((stats.matchCount / stats.studentsWithPrefs) * 100)}% match rate` : '–' },
              { label: 'Capacity Used', value: `${stats.studentsWithPrefs}/${stats.totalCapacity}`, sub: 'preference selections' },
            ].map(k => (
              <div key={k.label} className="card p-5">
                <div className="text-3xl font-bold text-bfh-gray-dark">{k.value}</div>
                <div className="text-xs font-semibold text-bfh-gray-mid uppercase tracking-wider mt-1">{k.label}</div>
                <div className="text-xs text-bfh-gray-mid mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Two-column breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Topics by programme */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">Topics by Programme</h3>
              <div className="space-y-2">
                {Object.entries(stats.topicsByProgramme as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([prog, count]) => (
                    <div key={prog} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-12 text-bfh-gray-mid">{prog}</span>
                      <div className="flex-1 bg-bfh-gray-border rounded-full h-2">
                        <div
                          className="bg-bfh-red h-2 rounded-full"
                          style={{ width: `${Math.round((count / stats.topicCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-bfh-gray-mid w-6 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Students by programme */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">Students by Programme</h3>
              <div className="space-y-2">
                {Object.entries(stats.studentsByProgramme as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([prog, count]) => (
                    <div key={prog} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-12 text-bfh-gray-mid">{prog ?? '?'}</span>
                      <div className="flex-1 bg-bfh-gray-border rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${Math.round((count / stats.studentCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-bfh-gray-mid w-6 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/topics" className="btn-secondary text-sm">View All Topics</a>
              <a href="/admin/students" className="btn-secondary text-sm">View All Students</a>
              <a href="/admin/matching" className="btn-primary text-sm">Go to Matching →</a>
              <a href="/admin/semesters" className="btn-secondary text-sm">Manage Semester</a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
