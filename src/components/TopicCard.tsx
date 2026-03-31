'use client'
import { LevelBadge, MethodBadge, LanguageBadge, AvailabilityBadge } from './Badge'
import { PROGRAMME_LABELS, SPECIALISATION_LABELS } from '@/types'
import type { TopicWithCount } from '@/types'

interface TopicCardProps {
  topic: TopicWithCount
  /** Rank the student currently has for this topic (undefined = not selected) */
  currentRank?: number
  /** Total slots used in student preferences */
  prefCount?: number
  onAddPreference?: (topicId: string) => void
  onRemove?: (topicId: string) => void
  /** Show edit/delete actions (lecturer/admin view) */
  showActions?: boolean
  onEdit?: (topicId: string) => void
  onDelete?: (topicId: string) => void
}

export function TopicCard({
  topic,
  currentRank,
  prefCount = 0,
  onAddPreference,
  onRemove,
  showActions,
  onEdit,
  onDelete,
}: TopicCardProps) {
  const isSelected = currentRank !== undefined
  const isFull = topic.availableSlots <= 0 && !isSelected
  const canAdd = !isSelected && !isFull && prefCount < 4 && !!onAddPreference

  return (
    <div className={`card p-4 flex flex-col gap-3 ${isSelected ? 'border-bfh-red ring-1 ring-bfh-red' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-bfh-gray-dark leading-snug line-clamp-2 text-sm">
            {topic.title}
          </h3>
          <p className="text-xs text-bfh-gray-mid mt-0.5">{topic.lecturerName}</p>
        </div>
        {isSelected && (
          <span className="shrink-0 text-xs font-bold text-bfh-red border border-bfh-red rounded px-2 py-0.5">
            #{currentRank}
          </span>
        )}
      </div>

      {/* Description */}
      {topic.description && (
        <p className="text-xs text-bfh-gray-mid line-clamp-2">{topic.description}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        <LevelBadge level={topic.level} />
        {(topic.methods ?? []).map(m => <MethodBadge key={m} method={m} />)}
        <LanguageBadge language={topic.language} />
        <AvailabilityBadge slots={topic.availableSlots} />
      </div>

      {/* Programmes / Specialisations */}
      <div className="text-xs text-bfh-gray-mid space-y-0.5">
        {topic.programmes.length > 0 && (
          <div>
            <span className="font-medium">Programmes: </span>
            {topic.programmes.map(p => PROGRAMME_LABELS[p]?.split('–')[0].trim() ?? p).join(', ')}
          </div>
        )}
        {topic.specialisations.length > 0 && (
          <div>
            <span className="font-medium">Specialisations: </span>
            {topic.specialisations.map(s => SPECIALISATION_LABELS[s as keyof typeof SPECIALISATION_LABELS] ?? s).join(', ')}
          </div>
        )}
        <div>
          <span className="font-medium">Supervisor slots: </span>
          {topic.preferenceCount}/{topic.maxStudents} selected
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        {onAddPreference && (
          <button
            onClick={() => canAdd && onAddPreference(topic.id)}
            disabled={!canAdd}
            className={canAdd ? 'btn-primary text-xs py-1.5' : 'btn-secondary text-xs py-1.5 opacity-60 cursor-not-allowed'}
            title={
              isFull ? 'Topic is full' :
              isSelected ? `Already in your preferences at rank ${currentRank}` :
              prefCount >= 4 ? 'You already have 4 preferences' :
              'Add to preferences'
            }
          >
            {isSelected ? `In preferences (#${currentRank})` : isFull ? 'Full' : prefCount >= 4 ? 'Preferences full' : '+ Add to Preferences'}
          </button>
        )}
        {isSelected && onRemove && (
          <button
            onClick={() => onRemove(topic.id)}
            className="btn-secondary text-xs py-1.5"
          >
            Remove
          </button>
        )}
        {showActions && (
          <>
            {onEdit && (
              <button onClick={() => onEdit(topic.id)} className="btn-secondary text-xs py-1.5">Edit</button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(topic.id)} className="btn-danger text-xs py-1.5">Delete</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
