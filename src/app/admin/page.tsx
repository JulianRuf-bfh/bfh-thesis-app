'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

// ── DARK MODE FIXES ───────────────────────────────────────────────────────────
//
//  1. Status chips: bg-green-50/bg-gray-50 + text/border — all invisible on
//     dark gray card backgrounds. Added dark: variants for each state.
//
//  2. KPI tile numbers: text-bfh-gray-dark — no dark variant. Added dark:text-white.
//
//  3. KPI tile labels/sub: text-bfh-gray-mid — added dark:text-gray-400/500.
//
//  4. Progress bar track: bg-bfh-gray-border — nearly invisible on dark:bg-gray-800.
//     Changed to dark:bg-gray-600.
//
//  5. Progress bar fill: was bg-bfh-red (old gray token). Updated to bg-bfh-slate.
//
//  OTHER IMPROVEMENTS:
//  · KPI label moved above number (reads faster: label → value → sub-label)
//  · Added a thin top colour accent bar per KPI tile for visual grouping
//    (yellow=topics, blue=students, green=matches, slate=capacity)
//
// ─────────────────────────────────────────────────────────────────────────────

const KPI_ACCENTS = ['bg-bfh-yellow', 'bg-blue-400', 'bg-green-500', 'bg-bfh-slate']

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-bfh-gray-mid dark:text-gray-400">Loading dashboard…</div>
  }

  const { semester, stats } = data ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1>Admin Dashboard</h1>
        {semester && (
          <p className="text-sm text-bfh-gray-mid dark:text-gray-400 mt-1">
            Active semester: <strong className="text-bfh-gray-dark dark:text-gray-200">{semester.name}</strong> ·
            Lecturer deadline: {formatDate(semester.lecturerDeadline)} ·
            Student deadline: {formatDate(semester.studentDeadline)}
          </p>
        )}
      </div>

      {!semester ? (
        <div className="card p-8 text-center text-bfh-gray-mid dark:text-gray-400">
          <p className="font-medium">No active semester</p>
          <p className="text-sm mt-1">Create and activate a semester to get started.</p>
          <a href="/admin/semesters" className="btn-primary mt-4 inline-block text-sm">
            Manage Semesters
          </a>
        </div>
      ) : (
        <>
          {/* Status chips — fixed: light-only colors were invisible on dark */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Lecturer deadline', passed: new Date() > new Date(semester.lecturerDeadline) },
              { label: 'Student deadline',  passed: new Date() > new Date(semester.studentDeadline) },
              { label: 'Matching approved', passed: semester.matchingApproved },
              { label: 'Matching run',      passed: semester.matchingRun },
              { label: 'Emails sent',       passed: semester.emailsSent },
            ].map(({ label, passed }) => (
              <span
                key={label}
                className={[
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border',
                  passed
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                    : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400',
                ].join(' ')}
              >
                <span>{passed ? '✓' : '○'}</span> {label}
              </span>
            ))}
          </div>

          {/* KPI tiles — fixed: numbers had no dark variant; added accent bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Topics',  value: stats.topicCount,   sub: `${stats.totalCapacity} total slots` },
              { label: 'Students',       value: stats.studentCount, sub: `${stats.studentsWithPrefs} submitted prefs` },
              {
                label: 'Matches Made',
                value: stats.matchCount,
                sub: stats.matchCount > 0
                  ? `${Math.round((stats.matchCount / stats.studentsWithPrefs) * 100)}% match rate`
                  : '–',
              },
              { label: 'Capacity Used', value: `${stats.studentsWithPrefs}/${stats.totalCapacity}`, sub: 'preference selections' },
            ].map((k, i) => (
              <div key={k.label} className="card p-5 relative overflow-hidden">
                {/* Colour accent bar — visual grouping per category */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${KPI_ACCENTS[i]}`} />
                {/* Label above number — scans faster */}
                <div className="text-xs font-semibold text-bfh-gray-mid dark:text-gray-400 uppercase tracking-wider mt-1">
                  {k.label}
                </div>
                <div className="text-3xl font-bold text-bfh-gray-dark dark:text-white mt-1">
                  {k.value}
                </div>
                <div className="text-xs text-bfh-gray-mid dark:text-gray-500 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Programme breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Topics by programme */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">Topics by Programme</h3>
              <div className="space-y-2">
                {Object.entries(stats.topicsByProgramme as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([prog, count]) => (
                    <div key={prog} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-12 text-bfh-gray-mid dark:text-gray-400">
                        {prog}
                      </span>
                      {/* Fixed: track was bg-bfh-gray-border (invisible on dark:bg-gray-800) */}
                      <div className="flex-1 bg-bfh-gray-border dark:bg-gray-600 rounded-full h-2">
                        {/* Fixed: fill was bg-bfh-red (old gray token) → now bg-bfh-slate */}
                        <div
                          className="bg-bfh-slate h-2 rounded-full"
                          style={{ width: `${Math.round((count / stats.topicCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-bfh-gray-mid dark:text-gray-400 w-6 text-right">
                        {count}
                      </span>
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
                      <span className="text-xs font-medium w-12 text-bfh-gray-mid dark:text-gray-400">
                        {prog ?? '?'}
                      </span>
                      <div className="flex-1 bg-bfh-gray-border dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${Math.round((count / stats.studentCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-bfh-gray-mid dark:text-gray-400 w-6 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/topics"    className="btn-secondary text-sm">View All Topics</a>
              <a href="/admin/students"  className="btn-secondary text-sm">View All Students</a>
              <a href="/admin/matching"  className="btn-primary  text-sm">Go to Matching →</a>
              <a href="/admin/semesters" className="btn-secondary text-sm">Manage Semester</a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
