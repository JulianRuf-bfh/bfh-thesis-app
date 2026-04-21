'use client'
import { LevelBadge, MethodBadge, LanguageBadge } from './Badge'
import { PROGRAMME_LABELS, SPECIALISATION_LABELS } from '@/types'
import type { TopicWithCount } from '@/types'

// ── WHAT CHANGED ────────────────────────────────────────────────────────────
//
//  Structure
//  · Card split into three zones: header / body / footer (visual dividers)
//  · No more flat p-4 + gap-3 — each zone has its own padding
//
//  Title & hierarchy
//  · Title: text-sm (13px) → text-base (16px), slightly heavier weight
//  · Lecturer name gets a small dot prefix so it reads as a sub-label
//  · Description kept at text-xs but now text-bfh-gray-dark/70 (slightly darker)
//
//  Selected state
//  · Was: gray border + gray "#N" badge
//  · Now: yellow border + ring + subtle yellow tint on header background
//        + filled yellow "#N" badge (much easier to spot in a grid)
//
//  Availability
//  · Removed AvailabilityBadge from the badge cluster (it broke visual rhythm)
//  · Moved to the footer as a standalone pill, next to the CTA
//  · Full topics get a muted "Full" label; 1-slot-left gets an amber pill
//
//  CTA button
//  · Was: muted gray btn-primary (confusing with disabled state)
//  · Now: yellow background, dark text — high affordance, matches BFH brand
//  · Disabled/full states use btn-secondary with opacity as before
//
//  Metadata
//  · Programmes + specialisations consolidated into one compact line
//  · Slot count (N/M selected) moved to footer beside availability
//
// ─────────────────────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicWithCount
  currentRank?: number
  prefCount?: number
  onAddPreference?: (topicId: string) => void
  onRemove?: (topicId: string) => void
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
  const isFull     = topic.availableSlots <= 0 && !isSelected
  const canAdd     = !isSelected && !isFull && prefCount < 4 && !!onAddPreference

  // Compact programme list — just the short code, not the full label
  const progCodes = topic.programmes
    .map(p => PROGRAMME_LABELS[p]?.split('–')[0].trim() ?? p)
    .join(', ')

  const specLabels = topic.specialisations
    .map(s => SPECIALISATION_LABELS[s as keyof typeof SPECIALISATION_LABELS] ?? s)
    .join(', ')

  return (
    <div
      className={[
        'bg-white dark:bg-gray-800 rounded-xl border shadow-sm flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        isSelected
          ? 'border-bfh-yellow ring-2 ring-bfh-yellow ring-offset-0'
          : 'border-bfh-gray-border dark:border-gray-700',
      ].join(' ')}
    >
      {/* ── HEADER ── */}
      <div
        className={[
          'px-4 pt-4 pb-3 border-b border-bfh-gray-border dark:border-gray-700',
          isSelected ? 'bg-bfh-yellow-light dark:bg-yellow-900/20' : '',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base text-bfh-gray-dark dark:text-gray-100 leading-snug line-clamp-2 flex-1 min-w-0">
            {topic.title}
          </h3>

          {/* Rank badge — yellow filled when selected */}
          {isSelected && (
            <span className="shrink-0 bg-bfh-yellow text-bfh-gray-dark text-xs font-extrabold rounded-md px-2 py-0.5 leading-tight">
              #{currentRank}
            </span>
          )}
        </div>

        {/* Lecturer */}
        <p className="text-xs text-bfh-gray-mid dark:text-gray-400 mt-1.5 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-bfh-gray-border dark:bg-gray-600 shrink-0" />
          {topic.lecturerName}
        </p>
      </div>

      {/* ── BODY ── */}
      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        {/* Description */}
        {topic.description && (
          <p className="text-xs text-bfh-gray-mid dark:text-gray-400 leading-relaxed line-clamp-2">
            {topic.description}
          </p>
        )}

        {/* Badges — level + methods + language (no availability here) */}
        <div className="flex flex-wrap gap-1">
          <LevelBadge level={topic.level} />
          {(topic.methods ?? []).map(m => <MethodBadge key={m} method={m} />)}
          <LanguageBadge language={topic.language} />
        </div>

        {/* Programme / specialisation — one compact line */}
        {(progCodes || specLabels) && (
          <p className="text-xs text-bfh-gray-mid dark:text-gray-400 leading-snug">
            {progCodes && <span>{progCodes}</span>}
            {progCodes && specLabels && <span className="mx-1 opacity-40">·</span>}
            {specLabels && <span>{specLabels}</span>}
          </p>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-bfh-gray-border dark:border-gray-700 mt-auto">
        {/* Availability pill */}
        <AvailabilityPill slots={topic.availableSlots} preferenceCount={topic.preferenceCount} maxStudents={topic.maxStudents} />

        {/* Actions */}
        <div className="flex gap-1.5 shrink-0">
          {onAddPreference && (
            <button
              onClick={() => canAdd && onAddPreference(topic.id)}
              disabled={!canAdd}
              title={
                isFull        ? 'Topic is full' :
                isSelected    ? `Already in your preferences at rank ${currentRank}` :
                prefCount >= 4 ? 'You already have 4 preferences' :
                'Add to preferences'
              }
              className={
                canAdd
                  // Yellow CTA — high affordance
                  ? 'inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-bfh-yellow text-bfh-gray-dark text-xs font-bold hover:bg-yellow-400 transition-colors shadow-sm'
                  : 'inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-bfh-gray-border dark:border-gray-600 bg-white dark:bg-gray-700 text-bfh-gray-mid dark:text-gray-500 text-xs font-medium opacity-50 cursor-not-allowed'
              }
            >
              {isSelected    ? `#${currentRank} selected` :
               isFull        ? 'Full' :
               prefCount >= 4 ? 'Max reached' :
               '+ Add'}
            </button>
          )}

          {isSelected && onRemove && (
            <button
              onClick={() => onRemove(topic.id)}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-bfh-gray-border dark:border-gray-600 bg-white dark:bg-gray-800 text-bfh-gray-mid dark:text-gray-300 text-xs font-medium hover:bg-bfh-gray-light dark:hover:bg-gray-700 transition-colors"
            >
              Remove
            </button>
          )}

          {showActions && (
            <>
              {onEdit && (
                <button
                  onClick={() => onEdit(topic.id)}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-bfh-gray-border dark:border-gray-600 bg-white dark:bg-gray-800 text-bfh-gray-dark dark:text-gray-200 text-xs font-medium hover:bg-bfh-gray-light dark:hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(topic.id)}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Availability pill (replaces AvailabilityBadge in the footer) ─────────────
// Shows slot count + demand context in one place.
function AvailabilityPill({
  slots,
  preferenceCount,
  maxStudents,
}: {
  slots: number
  preferenceCount: number
  maxStudents: number
}) {
  if (slots <= 0) {
    return (
      <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-full px-2.5 py-0.5">
        Full
      </span>
    )
  }
  if (slots === 1) {
    return (
      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-full px-2.5 py-0.5">
        1 slot left · {preferenceCount}/{maxStudents}
      </span>
    )
  }
  return (
    <span className="text-xs font-medium text-bfh-gray-mid dark:text-gray-400">
      {preferenceCount}/{maxStudents} interested
    </span>
  )
}
