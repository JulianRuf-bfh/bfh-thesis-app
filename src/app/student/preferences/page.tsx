'use client'
import { useState, useEffect, useCallback } from 'react'
import { PreferencesList } from '@/components/PreferencesList'
import { formatDate } from '@/lib/utils'
import type { PreferenceWithTopic } from '@/types'

export default function StudentPreferencesPage() {
  const [preferences, setPreferences] = useState<PreferenceWithTopic[]>([])
  const [semester, setSemester] = useState<{ studentDeadline: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    const [prefRes, semRes] = await Promise.all([
      fetch('/api/preferences'),
      fetch('/api/admin/semesters').then(r => r.json()).catch(() => []),
    ])
    if (prefRes.ok) setPreferences(await prefRes.json())
    // Get active semester
    const sems = Array.isArray(semRes) ? semRes : []
    const active = sems.find((s: any) => s.isActive)
    if (active) setSemester(active)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const deadlinePassed = semester ? new Date() > new Date(semester.studentDeadline) : false

  const moveUp = async (topicId: string) => {
    const sorted = [...preferences].sort((a, b) => a.rank - b.rank)
    const idx = sorted.findIndex(p => p.topic.id === topicId)
    if (idx <= 0) return
    ;[sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]]
    await saveOrder(sorted.map(p => p.topic.id))
  }

  const moveDown = async (topicId: string) => {
    const sorted = [...preferences].sort((a, b) => a.rank - b.rank)
    const idx = sorted.findIndex(p => p.topic.id === topicId)
    if (idx < 0 || idx >= sorted.length - 1) return
    ;[sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]]
    await saveOrder(sorted.map(p => p.topic.id))
  }

  const saveOrder = async (orderedTopicIds: string[]) => {
    setSaving(true)
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedTopicIds }),
    })
    if (res.ok) {
      setPreferences(prev => {
        const map = new Map(prev.map(p => [p.topic.id, p]))
        return orderedTopicIds.map((id, idx) => ({ ...map.get(id)!, rank: idx + 1 }))
      })
      showToast('Order saved', true)
    } else {
      const { error } = await res.json()
      showToast(error ?? 'Could not save order', false)
    }
    setSaving(false)
  }

  const remove = async (topicId: string) => {
    setSaving(true)
    const res = await fetch('/api/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId }),
    })
    if (res.ok) {
      setPreferences(prev => {
        const filtered = prev.filter(p => p.topic.id !== topicId).sort((a, b) => a.rank - b.rank)
        return filtered.map((p, idx) => ({ ...p, rank: idx + 1 }))
      })
      showToast('Preference removed', true)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1>My Preferences</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">
            Rank your topics from most (1) to least (4) preferred. Drag rows or use the ▲ ▼ arrows.
          </p>
        </div>
        <a href="/student" className="btn-secondary text-xs">Browse Topics</a>
      </div>

      {/* Deadline info */}
      {semester && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${deadlinePassed ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {deadlinePassed
            ? `Submission deadline has passed (${formatDate(semester.studentDeadline)}). Preferences are locked.`
            : `Deadline: ${formatDate(semester.studentDeadline)} — you can still change your preferences until then.`}
        </div>
      )}

      {/* Slots */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map(rank => {
          const pref = preferences.find(p => p.rank === rank)
          return (
            <div key={rank} className={`flex-1 rounded-lg border-2 p-2 text-center text-xs ${pref ? 'border-bfh-yellow bg-bfh-yellow-light' : 'border-dashed border-bfh-gray-border bg-white'}`}>
              <div className="font-bold text-bfh-gray-dark">#{rank}</div>
              <div className="text-bfh-gray-mid truncate">{pref ? pref.topic.title.substring(0, 20) + '…' : 'Empty'}</div>
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-bfh-gray-mid">Loading…</div>
      ) : (
        <PreferencesList
          preferences={preferences}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onRemove={remove}
          onReorder={saveOrder}
          saving={saving || deadlinePassed}
        />
      )}

      {!loading && preferences.length < 4 && !deadlinePassed && (
        <div className="text-center">
          <p className="text-sm text-bfh-gray-mid mb-2">You have {4 - preferences.length} preference slot(s) remaining.</p>
          <a href="/student" className="btn-primary text-sm">Browse More Topics</a>
        </div>
      )}
    </div>
  )
}
