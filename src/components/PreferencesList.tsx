'use client'
import { useState } from 'react'
import { MethodBadge, LanguageBadge } from './Badge'
import type { PreferenceWithTopic } from '@/types'

interface PreferencesListProps {
  preferences: PreferenceWithTopic[]
  onMoveUp: (topicId: string) => void
  onMoveDown: (topicId: string) => void
  onRemove: (topicId: string) => void
  onReorder: (orderedTopicIds: string[]) => void
  saving?: boolean
}

const rankBorderColors = [
  'border-l-bfh-yellow',
  'border-l-bfh-red',
  'border-l-bfh-red',
  'border-l-bfh-gray-border',
]

const rankLabels = ['#1 — Top choice', '#2', '#3', '#4 — Last choice']

export function PreferencesList({
  preferences,
  onMoveUp,
  onMoveDown,
  onRemove,
  onReorder,
  saving,
}: PreferencesListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const sorted = [...preferences].sort((a, b) => a.rank - b.rank)

  const handleDrop = (toIdx: number) => {
    if (dragIdx !== null && dragIdx !== toIdx) {
      const reordered = [...sorted]
      const [moved] = reordered.splice(dragIdx, 1)
      reordered.splice(toIdx, 0, moved)
      onReorder(reordered.map(p => p.topic.id))
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  if (sorted.length === 0) {
    return (
      <div className="card p-8 text-center text-bfh-gray-mid">
        <div className="text-4xl mb-3">📋</div>
        <p className="font-medium">No preferences selected yet</p>
        <p className="text-sm mt-1">Browse topics and add up to 4 to your preference list.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-bfh-gray-mid mb-1">
        Drag rows to reorder, or use the ▲ ▼ arrows.
      </p>
      {sorted.map((pref, idx) => {
        const isDragging = dragIdx === idx
        const isDragOver = dragOverIdx === idx && dragIdx !== idx

        return (
          <div
            key={pref.topic.id}
            draggable={!saving}
            onDragStart={() => { setDragIdx(idx) }}
            onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
            className={[
              'card p-4 flex items-center gap-4 border-l-4 transition-all select-none',
              rankBorderColors[idx] ?? 'border-l-gray-200',
              isDragging ? 'opacity-40 scale-[0.98] cursor-grabbing' : 'cursor-grab',
              isDragOver ? 'ring-2 ring-bfh-yellow ring-offset-1 scale-[1.01] bg-bfh-yellow-light' : '',
              saving ? 'opacity-60 cursor-not-allowed' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Drag handle + rank + arrows */}
            <div className="flex flex-col items-center gap-1 shrink-0 w-10">
              {/* Drag handle icon */}
              <div className="text-bfh-gray-border text-base leading-none" title="Drag to reorder">
                ⠿
              </div>
              <span className="text-xs font-black text-bfh-gray-dark">#{pref.rank}</span>
              <button
                onClick={e => { e.stopPropagation(); onMoveUp(pref.topic.id) }}
                disabled={pref.rank === 1 || saving}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-bfh-yellow-light
                           text-bfh-gray-mid hover:text-bfh-gray-dark disabled:opacity-20 disabled:cursor-not-allowed
                           transition-colors text-base font-bold"
                title="Move up"
              >
                ▲
              </button>
              <button
                onClick={e => { e.stopPropagation(); onMoveDown(pref.topic.id) }}
                disabled={pref.rank === sorted.length || saving}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-bfh-yellow-light
                           text-bfh-gray-mid hover:text-bfh-gray-dark disabled:opacity-20 disabled:cursor-not-allowed
                           transition-colors text-base font-bold"
                title="Move down"
              >
                ▼
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid mb-0.5">
                {rankLabels[idx]}
              </p>
              <p className="font-semibold text-sm text-bfh-gray-dark line-clamp-2 leading-snug">
                {pref.topic.title}
              </p>
              <p className="text-xs text-bfh-gray-mid mt-0.5">{pref.topic.lecturerName}</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {(pref.topic.methods ?? []).map(m => <MethodBadge key={m} method={m} />)}
                <LanguageBadge language={pref.topic.language} />
              </div>
            </div>

            {/* Availability warning */}
            {pref.topic.availableSlots <= 0 && (
              <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 shrink-0">
                Full – lower priority
              </div>
            )}

            {/* Remove */}
            <button
              onClick={e => { e.stopPropagation(); onRemove(pref.topic.id) }}
              disabled={saving}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                         text-bfh-gray-mid hover:text-white hover:bg-red-500
                         transition-colors text-lg leading-none disabled:opacity-40"
              title="Remove preference"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
