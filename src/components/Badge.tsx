import { cn } from '@/lib/utils'

type BadgeVariant = 'red' | 'blue' | 'green' | 'yellow' | 'gray' | 'orange' | 'purple'

const variants: Record<BadgeVariant, string> = {
  red:    'bg-red-100 text-red-800',
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray:   'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-800',
}

export function Badge({
  children,
  variant = 'gray',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

// Preset badges used throughout the app
export function LevelBadge({ level }: { level: string }) {
  return <Badge variant={level === 'BACHELOR' ? 'blue' : 'purple'}>{level === 'BACHELOR' ? 'Bachelor' : 'Master'}</Badge>
}

export function MethodBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    QUANTITATIVE:          { label: 'Quantitative',          variant: 'blue' },
    QUALITATIVE:           { label: 'Qualitative',           variant: 'green' },
    DESIGN_SCIENCE_RESEARCH: { label: 'Design Science Research', variant: 'orange' },
    LITERATURE_REVIEW:     { label: 'Literature Review',     variant: 'yellow' },
  }
  const { label, variant } = map[method] ?? { label: method, variant: 'gray' as BadgeVariant }
  return <Badge variant={variant}>{label}</Badge>
}

export function LanguageBadge({ language }: { language: string }) {
  const map: Record<string, string> = {
    GERMAN: 'Deutsch', ENGLISH: 'English', BOTH: 'DE & EN',
  }
  return <Badge variant="gray">{map[language] ?? language}</Badge>
}

export function AvailabilityBadge({ slots }: { slots: number }) {
  if (slots <= 0) return <Badge variant="red">Full</Badge>
  if (slots === 1) return <Badge variant="yellow">1 slot left</Badge>
  return <Badge variant="green">{slots} slots</Badge>
}
