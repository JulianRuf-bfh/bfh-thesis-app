'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LevelBadge, MethodBadge, LanguageBadge } from '@/components/Badge'
import { PROGRAMME_LABELS } from '@/types'
import type { Programme } from '@/types'

export default function LecturerDashboard() {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const router = useRouter()

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const fetchTopics = useCallback(async () => {
    const res = await fetch('/api/lecturer/topics')
    if (res.ok) setTopics(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchTopics() }, [fetchTopics])

  const deleteTopic = async (id: string, title: string) => {
    if (!confirm(`Deactivate topic "${title}"? Students who selected it will lose this preference.`)) return
    const res = await fetch(`/api/lecturer/topics/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Topic deactivated', true)
      fetchTopics()
    } else {
      const { error } = await res.json()
      showToast(error ?? 'Could not delete', false)
    }
  }

  const totalCapacity = topics.filter(t => t.isActive).reduce((s: number, t: any) => s + t.maxStudents, 0)
  const totalMatches = topics.reduce((s: number, t: any) => s + (t.matchCount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>My Thesis Topics</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">
            Manage your topics for the active semester.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/lecturer/import" className="btn-secondary text-sm">Import Previous</a>
          <a href="/lecturer/topics/new" className="btn-primary text-sm">+ New Topic</a>
        </div>
      </div>

      {/* Capacity summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Topics', value: topics.filter((t: any) => t.isActive).length },
          { label: 'Total Capacity', value: `${totalCapacity}/8` },
          { label: 'Students Matched', value: totalMatches },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className="text-2xl font-bold text-bfh-gray-dark">{stat.value}</div>
            <div className="text-xs text-bfh-gray-mid mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      {totalCapacity > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Student capacity used</span>
            <span className={totalCapacity > 8 ? 'text-red-600 font-bold' : 'text-bfh-gray-mid'}>{totalCapacity}/8</span>
          </div>
          <div className="w-full bg-bfh-gray-border rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${totalCapacity >= 8 ? 'bg-bfh-red' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (totalCapacity / 8) * 100)}%` }}
            />
          </div>
          {totalCapacity >= 8 && (
            <p className="text-xs text-bfh-red mt-1">Maximum capacity reached. You cannot add more students.</p>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Topics table */}
      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
      ) : topics.length === 0 ? (
        <div className="card p-12 text-center text-bfh-gray-mid">
          <div className="text-4xl mb-3">📝</div>
          <p className="font-medium">No topics yet</p>
          <p className="text-sm mt-1">Add your first topic or import from a previous semester.</p>
          <div className="flex gap-2 justify-center mt-4">
            <a href="/lecturer/topics/new" className="btn-primary text-sm">+ New Topic</a>
            <a href="/lecturer/import" className="btn-secondary text-sm">Import Previous</a>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Level</th>
                <th>Method</th>
                <th>Language</th>
                <th>Programmes</th>
                <th>Capacity</th>
                <th>Interest</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t: any) => (
                <tr key={t.id}>
                  <td className="font-medium max-w-xs">
                    <div className="line-clamp-2">{t.title}</div>
                  </td>
                  <td><LevelBadge level={t.level} /></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(t.methods ?? []).map((m: string) => <MethodBadge key={m} method={m} />)}
                    </div>
                  </td>
                  <td><LanguageBadge language={t.language} /></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(t.programmes as Programme[]).map((p: Programme) => (
                        <span key={p} className="text-xs bg-bfh-gray-light rounded px-1.5 py-0.5">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-center font-medium">{t.maxStudents}</td>
                  <td>
                    <div className="text-sm">
                      <span className="font-medium">{t.preferenceCount}</span>
                      <span className="text-bfh-gray-mid"> selected</span>
                    </div>
                    {t.matchCount > 0 && (
                      <div className="text-xs text-green-700">{t.matchCount} matched</div>
                    )}
                  </td>
                  <td>
                    {t.isActive
                      ? <span className="text-xs text-green-700 bg-green-100 rounded px-2 py-0.5">Active</span>
                      : <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">Inactive</span>
                    }
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => router.push(`/lecturer/topics/${t.id}/edit`)} className="btn-secondary text-xs py-1">Edit</button>
                      {t.isActive && (
                        <button onClick={() => deleteTopic(t.id, t.title)} className="btn-danger text-xs py-1">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
