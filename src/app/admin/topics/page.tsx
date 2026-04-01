'use client'
import { useState, useEffect, useCallback } from 'react'
import { FilterBar } from '@/components/FilterBar'
import { LevelBadge, MethodBadge, LanguageBadge } from '@/components/Badge'
import type { TopicFilters, TopicWithCount } from '@/types'

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<TopicWithCount[]>([])
  const [filters, setFilters] = useState<TopicFilters>({})
  const [lecturers, setLecturers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

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
      setLecturers(data.reduce((acc, t) => {
        if (!seen.has(t.lecturerId)) { seen.add(t.lecturerId); acc.push({ id: t.lecturerId, name: t.lecturerName }) }
        return acc
      }, [] as { id: string; name: string }[]).sort((a, b) => a.name.localeCompare(b.name)))
    }
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchTopics() }, [fetchTopics])

  return (
    <div className="space-y-6">
      <div>
        <h1>All Topics</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">View all topics in the active semester with same filters as students.</p>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} lecturers={lecturers} showSearch />

      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
      ) : (() => {
        const visibleTopics = filters.hideFullTopics ? topics.filter(t => t.availableSlots > 0) : topics
        const hiddenCount = topics.length - visibleTopics.length
        return (
        <>
          <p className="text-sm text-bfh-gray-mid">
            {visibleTopics.length} topic{visibleTopics.length !== 1 ? 's' : ''}
            {hiddenCount > 0 && <span> ({hiddenCount} full hidden)</span>}
          </p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Supervisor</th>
                  <th>Level</th>
                  <th>Method</th>
                  <th>Language</th>
                  <th>Programmes</th>
                  <th>Capacity</th>
                  <th>Selected by</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleTopics.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium max-w-xs">
                      <div className="line-clamp-2 text-sm">{t.title}</div>
                    </td>
                    <td className="text-sm">{t.lecturerName}</td>
                    <td><LevelBadge level={t.level} /></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(t.methods ?? []).map(m => <MethodBadge key={m} method={m} />)}
                      </div>
                    </td>
                    <td><LanguageBadge language={t.language} /></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {t.programmes.map(p => <span key={p} className="text-xs bg-bfh-gray-light rounded px-1 py-0.5">{p}</span>)}
                      </div>
                    </td>
                    <td className="text-center font-medium">{t.maxStudents}</td>
                    <td>
                      <div className="text-sm">
                        <span className={t.preferenceCount >= t.maxStudents ? 'text-red-600 font-bold' : 'text-bfh-gray-dark'}>
                          {t.preferenceCount}
                        </span>
                        <span className="text-bfh-gray-mid">/{t.maxStudents}</span>
                      </div>
                    </td>
                    <td>
                      {t.availableSlots <= 0
                        ? <span className="badge bg-red-100 text-red-700">Full</span>
                        : <span className="badge bg-green-100 text-green-700">{t.availableSlots} left</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
        )
      })()}
    </div>
  )
}
