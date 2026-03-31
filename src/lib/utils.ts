import type { Programme, Level, Method, BachelorProgramme, MasterProgramme } from '@/types'
import { BACHELOR_PROGRAMMES, MASTER_PROGRAMMES } from '@/types'

export function parseProgrammes(json: string): Programme[] {
  try { return JSON.parse(json) } catch { return [] }
}

export function parseSpecialisations(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}

/** Parses methods — handles both legacy single string "QUANTITATIVE" and new JSON array "["QUANTITATIVE"]" */
export function parseMethods(raw: string): Method[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Method[]
    return [parsed as Method]
  } catch {
    if (raw && raw.length > 0) return [raw as Method]
    return []
  }
}

export function programmesToJson(p: Programme[]): string {
  return JSON.stringify(p)
}

export function getProgrammeLevel(programme: Programme): Level {
  return (BACHELOR_PROGRAMMES as string[]).includes(programme) ? 'BACHELOR' : 'MASTER'
}

export function isBachelorProgramme(p: string): p is BachelorProgramme {
  return (BACHELOR_PROGRAMMES as string[]).includes(p)
}

export function isMasterProgramme(p: string): p is MasterProgramme {
  return (MASTER_PROGRAMMES as string[]).includes(p)
}

/** Format a Date as DD.MM.YYYY */
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Format a Date as DD.MM.YYYY HH:mm */
export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function rankLabel(rank: number): string {
  const labels: Record<number, string> = {
    1: '1st Choice', 2: '2nd Choice', 3: '3rd Choice', 4: '4th Choice',
  }
  return labels[rank] ?? `Choice ${rank}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
