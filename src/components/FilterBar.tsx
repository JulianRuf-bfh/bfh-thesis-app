'use client'
import { useState, useCallback } from 'react'
import {
  BACHELOR_PROGRAMMES, MASTER_PROGRAMMES, ALL_SPECIALISATIONS,
  PROGRAMME_LABELS, SPECIALISATION_LABELS, LANGUAGE_LABELS,
} from '@/types'
import type { TopicFilters, Level, Programme, Specialisation, Language } from '@/types'

interface FilterBarProps {
  filters: TopicFilters
  onFiltersChange: (f: TopicFilters) => void
  /** If set, limits which level tabs are shown */
  fixedLevel?: Level
  lecturers?: { id: string; name: string }[]
  showSearch?: boolean
}

export function FilterBar({ filters, onFiltersChange, fixedLevel, lecturers, showSearch }: FilterBarProps) {
  const [search, setSearch] = useState(filters.search ?? '')

  const update = useCallback((patch: Partial<TopicFilters>) => {
    onFiltersChange({ ...filters, ...patch })
  }, [filters, onFiltersChange])

  const level = fixedLevel ?? filters.level
  const programmes = level === 'BACHELOR' ? BACHELOR_PROGRAMMES : level === 'MASTER' ? MASTER_PROGRAMMES : [...BACHELOR_PROGRAMMES, ...MASTER_PROGRAMMES]

  return (
    <div className="card p-4 space-y-4">
      {/* Level tabs — hidden if fixedLevel is set */}
      {!fixedLevel && (
        <div className="flex gap-2">
          {(['', 'BACHELOR', 'MASTER'] as const).map(l => (
            <button
              key={l}
              onClick={() => update({ level: l as Level | undefined, programme: undefined, specialisation: undefined })}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                (filters.level ?? '') === l
                  ? 'bg-bfh-red text-white'
                  : 'bg-bfh-gray-light text-bfh-gray-mid hover:bg-bfh-gray-border'
              }`}
            >
              {l === '' ? 'All' : l === 'BACHELOR' ? 'Bachelor' : 'Master'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Programme */}
        <div>
          <label className="label">Programme</label>
          <select
            className="input"
            value={filters.programme ?? ''}
            onChange={e => update({ programme: (e.target.value as Programme) || undefined, specialisation: undefined })}
          >
            <option value="">All programmes</option>
            {programmes.map(p => (
              <option key={p} value={p}>{p} – {PROGRAMME_LABELS[p]?.split('–')[1]?.trim()}</option>
            ))}
          </select>
        </div>

        {/* Specialisation — only for bachelor programmes */}
        {(level === 'BACHELOR' || BACHELOR_PROGRAMMES.includes(filters.programme as any)) && (
          <div>
            <label className="label">Specialisation</label>
            <select
              className="input"
              value={filters.specialisation ?? ''}
              onChange={e => update({ specialisation: (e.target.value as Specialisation) || undefined })}
            >
              <option value="">All specialisations</option>
              {ALL_SPECIALISATIONS.map(s => (
                <option key={s} value={s}>{SPECIALISATION_LABELS[s]}</option>
              ))}
            </select>
          </div>
        )}

        {/* Language */}
        <div>
          <label className="label">Language</label>
          <select
            className="input"
            value={filters.language ?? ''}
            onChange={e => update({ language: (e.target.value as Language) || undefined })}
          >
            <option value="">All languages</option>
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Lecturer */}
        {lecturers && (
          <div>
            <label className="label">Supervisor</label>
            <select
              className="input"
              value={filters.lecturerId ?? ''}
              onChange={e => update({ lecturerId: e.target.value || undefined })}
            >
              <option value="">All supervisors</option>
              {lecturers.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div>
          <input
            type="text"
            className="input"
            placeholder="Search topics by title or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && update({ search: search || undefined })}
          />
          <p className="text-xs text-bfh-gray-mid mt-1">Press Enter to search</p>
        </div>
      )}

      {/* Hide full topics toggle */}
      <div className="flex items-center gap-2">
        <button
          role="switch"
          aria-checked={!!filters.hideFullTopics}
          onClick={() => update({ hideFullTopics: !filters.hideFullTopics })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
            ${filters.hideFullTopics ? 'bg-bfh-yellow' : 'bg-bfh-gray-border'}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
              ${filters.hideFullTopics ? 'translate-x-4.5' : 'translate-x-0.5'}`}
          />
        </button>
        <span className="text-sm text-bfh-gray-dark">Hide full topics</span>
      </div>

      {/* Active filters summary + reset */}
      {(filters.level || filters.programme || filters.specialisation || filters.language || filters.lecturerId || filters.search || filters.hideFullTopics) && (
        <button
          onClick={() => { setSearch(''); onFiltersChange({}) }}
          className="text-xs text-bfh-red hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
