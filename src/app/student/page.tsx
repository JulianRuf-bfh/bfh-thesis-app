'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { TopicCard } from '@/components/TopicCard'
import { FilterBar } from '@/components/FilterBar'
import type { TopicFilters, TopicWithCount, PreferenceWithTopic } from '@/types'

export default function StudentBrowsePage() {
  const { data: session } = useSession()
  const [topics, setTopics] = useState<TopicWithCount[]>([])
  const [preferences, setPreferences] = useState<PreferenceWithTopic[]>([])
  const [filters, setFilters] = useState<TopicFilters>({})
  const [lecturers, setLecturers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTopics = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.level)          params.set('level', filters.level)
    if (filters.programme)      params.set('programme', filters.programme)
    if (filters.specialisation) params.set('specialisation', filters.specialisation)
    if (filters.language)       params.set('language', filters.language)
    if (filters.lecturerId)     params.set('lecturerId', filters.lecturerId)
    if (filters.search)         params.set('search', filters.search)
    const res = await fetch(`/api/topics?${params}`)
    if (res.ok) {
      const data: TopicWithCount[] = await res.json()
      setTopics(data)
      // Extract unique lecturers
      const seen = new Set<string>()
      setLecturers(data.reduce((acc, t) => {
        if (!seen.has(t.lecturerId)) {
          seen.add(t.lecturerId)
          acc.push({ id: t.lecturerId, name: t.lecturerName })
        }
        return acc
      }, [] as { id: string; name: string }[]).sort((a, b) => a.name.localeCompare(b.name)))
    }
    setLoading(false)
  }, [filters])

  const fetchPreferences = useCallback(async () => {
    const res = await fetch('/api/preferences')
    if (res.ok) setPreferences(await res.json())
  }, [])

  useEffect(() => { fetchTopics() }, [fetchTopics])
  useEffect(() => { fetchPreferences() }, [fetchPreferences])

  const addPreference = async (topicId: string) => {
    setSaving(true)
    const res = await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('Added to preferences!', true)
      await Promise.all([fetchPreferences(), fetchTopics()])
    } else {
      const { error } = await res.json()
      showToast(error ?? 'Could not add preference', false)
    }
  }

  const removePreference = async (topicId: string) => {
    setSaving(true)
    const res = await fetch('/api/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('Removed from preferences', true)
      await Promise.all([fetchPreferences(), fetchTopics()])
    }
  }

  const prefMap = new Map(preferences.map(p => [p.topic.id, p.rank]))
  const studentLevel = session?.user.level as any
  const visibleTopics = (filters.hideFullTopics
    ? topics.filter(t => t.availableSlots > 0)
    : topics
  ).slice().sort((a, b) => {
    const ra = prefMap.get(a.id) ?? Infinity
    const rb = prefMap.get(b.id) ?? Infinity
    return ra - rb   // selected topics (#1, #2, …) float to top; unselected stay in original order
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Browse Thesis Topics</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">
          Select up to 4 topics as preferences. Your {studentLevel === 'BACHELOR' ? 'Bachelor' : 'Master'} topics are shown.
        </p>
      </div>

      {/* Preference summary bar */}
      {preferences.length > 0 && (
        <div className="bg-bfh-yellow-light border border-bfh-yellow rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-semibold text-bfh-gray-dark">{preferences.length}/4 preferences selected</span>
            <span className="text-sm text-bfh-gray-mid ml-2">
              {preferences.sort((a,b) => a.rank-b.rank).map(p => `#${p.rank} ${p.topic.title.substring(0,30)}…`).join(' | ')}
            </span>
          </div>
          <a href="/student/preferences" className="btn-primary text-xs py-1.5">
            Manage Preferences →
          </a>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        fixedLevel={studentLevel}
        lecturers={lecturers}
        showSearch
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Topics grid */}
      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading topics…</div>
      ) : visibleTopics.length === 0 ? (
        <div className="card p-12 text-center text-bfh-gray-mid">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">No topics found</p>
          <p className="text-sm mt-1">
            {filters.hideFullTopics && topics.length > 0
              ? `All ${topics.length} matching topics are currently full. Turn off "Hide full topics" to see them.`
              : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-bfh-gray-mid">
            {visibleTopics.length} topic{visibleTopics.length !== 1 ? 's' : ''} found
            {filters.hideFullTopics && visibleTopics.length < topics.length &&
              <span className="text-bfh-gray-mid"> ({topics.length - visibleTopics.length} full topic{topics.length - visibleTopics.length !== 1 ? 's' : ''} hidden)</span>
            }
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTopics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                currentRank={prefMap.get(topic.id)}
                prefCount={preferences.length}
                onAddPreference={addPreference}
                onRemove={removePreference}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
