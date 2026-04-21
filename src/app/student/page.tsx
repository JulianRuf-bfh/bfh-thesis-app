'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { TopicCard } from '@/components/TopicCard'
import { FilterBar } from '@/components/FilterBar'
import type { TopicFilters, TopicWithCount, PreferenceWithTopic } from '@/types'

// ── DARK MODE FIXES ───────────────────────────────────────────────────────────
//
//  1. Preference summary bar: bg-bfh-yellow-light (#FFF8D6) is near-white,
//     invisible on dark:bg-gray-900.
//     Fixed: dark:bg-yellow-900/25 dark:border-yellow-700/50
//
//  2. Preference bar text: added dark:text-gray-100 / dark:text-gray-300.
//
//  3. Preference pills: redesigned as individual #N title tags instead of
//     a single truncated joined string — easier to scan, better in dark mode.
//
//  4. Topic count, empty state, loading state: added dark:text-gray-400.
//
// ─────────────────────────────────────────────────────────────────────────────

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
      const seen = new Set<string>()
      setLecturers(
        data.reduce((acc, t) => {
          if (!seen.has(t.lecturerId)) {
            seen.add(t.lecturerId)
            acc.push({ id: t.lecturerId, name: t.lecturerName })
          }
          return acc
        }, [] as { id: string; name: string }[]).sort((a, b) => a.name.localeCompare(b.name))
      )
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
  const visibleTopics = (
    filters.hideFullTopics ? topics.filter(t => t.availableSlots > 0) : topics
  )
    .slice()
    .sort((a, b) => {
      const ra = prefMap.get(a.id) ?? Infinity
      const rb = prefMap.get(b.id) ?? Infinity
      return ra - rb
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Browse Thesis Topics</h1>
        <p className="text-sm text-bfh-gray-mid dark:text-gray-400 mt-1">
          Select up to 4 topics as preferences.{' '}
          Your {studentLevel === 'BACHELOR' ? 'Bachelor' : 'Master'} topics are shown.
        </p>
      </div>

      {/* Preference summary bar
          Fixed: bg-bfh-yellow-light was near-invisible on dark backgrounds. */}
      {preferences.length > 0 && (
        <div className={[
          'rounded-lg px-4 py-3 flex items-center justify-between gap-3 border',
          // Light — subtle yellow tint
          'bg-bfh-yellow-light border-bfh-yellow',
          // Dark — deeper yellow tint that reads on gray-900
          'dark:bg-yellow-900/25 dark:border-yellow-700/50',
        ].join(' ')}>
          <div className="min-w-0">
            <span className="font-semibold text-bfh-gray-dark dark:text-gray-100">
              {preferences.length}/4 preferences selected
            </span>
            {/* Individual tag pills — easier to scan than a truncated joined string */}
            <div className="flex flex-wrap gap-1 mt-1">
              {preferences
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map(p => (
                  <span
                    key={p.topic.id}
                    className="text-xs bg-white/60 dark:bg-gray-800/60 border border-bfh-yellow/40 dark:border-yellow-700/40 rounded px-1.5 py-0.5 text-bfh-gray-dark dark:text-gray-300"
                  >
                    #{p.rank} {p.topic.title.substring(0, 28)}{p.topic.title.length > 28 ? '…' : ''}
                  </span>
                ))}
            </div>
          </div>
          <a href="/student/my-thesis" className="btn-primary text-xs py-1.5 shrink-0">
            Manage →
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
        <div className={[
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all',
          toast.ok ? 'bg-green-600' : 'bg-red-600',
        ].join(' ')}>
          {toast.msg}
        </div>
      )}

      {/* Results count */}
      {!loading && visibleTopics.length > 0 && (
        <p className="text-sm text-bfh-gray-mid dark:text-gray-400">
          {visibleTopics.length} topic{visibleTopics.length !== 1 ? 's' : ''} found
          {filters.hideFullTopics && visibleTopics.length < topics.length && (
            <span>
              {' '}({topics.length - visibleTopics.length} full topic
              {topics.length - visibleTopics.length !== 1 ? 's' : ''} hidden)
            </span>
          )}
        </p>
      )}

      {/* Topics grid */}
      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid dark:text-gray-400">
          Loading topics…
        </div>
      ) : visibleTopics.length === 0 ? (
        <div className="card p-12 text-center text-bfh-gray-mid dark:text-gray-400">
          <p className="font-medium">No topics found</p>
          <p className="text-sm mt-1">
            {filters.hideFullTopics && topics.length > 0
              ? `All ${topics.length} matching topics are currently full. Turn off "Hide full topics" to see them.`
              : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
