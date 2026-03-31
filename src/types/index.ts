// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'STUDENT' | 'LECTURER' | 'ADMIN'
export type Level = 'BACHELOR' | 'MASTER'
export type Method =
  | 'QUANTITATIVE'
  | 'QUALITATIVE'
  | 'DESIGN_SCIENCE_RESEARCH'
  | 'LITERATURE_REVIEW'
export type Language = 'GERMAN' | 'ENGLISH' | 'BOTH'

export type BachelorProgramme = 'BBA' | 'IBA' | 'DIGI'
export type MasterProgramme = 'MBA' | 'MDBA' | 'MEBI' | 'DGOV'
export type Programme = BachelorProgramme | MasterProgramme

export type Specialisation =
  | 'MARKETING'
  | 'GLOBAL_MANAGEMENT'
  | 'FINANCE'
  | 'SUSTAINABLE_BUSINESS'

// ─── Labels (for display) ─────────────────────────────────────────────────────

export const LEVEL_LABELS: Record<Level, string> = {
  BACHELOR: 'Bachelor',
  MASTER: 'Master',
}

export const METHOD_LABELS: Record<Method, string> = {
  QUANTITATIVE: 'Quantitative',
  QUALITATIVE: 'Qualitative',
  DESIGN_SCIENCE_RESEARCH: 'Design Science Research',
  LITERATURE_REVIEW: 'Literature Review',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  GERMAN: 'Deutsch',
  ENGLISH: 'English',
  BOTH: 'Deutsch & English',
}

export const PROGRAMME_LABELS: Record<Programme, string> = {
  BBA: 'BBA – Bachelor of Business Administration',
  IBA: 'IBA – International Business Administration',
  DIGI: 'Digitale Transformation',
  MBA: 'MBA – Master of Business Administration',
  MDBA: 'MDBA – Master of Digital Business & Analytics',
  MEBI: 'MEBI – Master of Engineering Business & Innovation',
  DGOV: 'DGOV – Digital Government',
}

export const SPECIALISATION_LABELS: Record<Specialisation, string> = {
  MARKETING: 'Marketing',
  GLOBAL_MANAGEMENT: 'Global Management',
  FINANCE: 'Finance',
  SUSTAINABLE_BUSINESS: 'Sustainable Business',
}

export const BACHELOR_PROGRAMMES: BachelorProgramme[] = ['BBA', 'IBA', 'DIGI']
export const MASTER_PROGRAMMES: MasterProgramme[] = ['MBA', 'MDBA', 'MEBI', 'DGOV']
export const ALL_PROGRAMMES: Programme[] = [...BACHELOR_PROGRAMMES, ...MASTER_PROGRAMMES]
export const ALL_SPECIALISATIONS: Specialisation[] = [
  'MARKETING',
  'GLOBAL_MANAGEMENT',
  'FINANCE',
  'SUSTAINABLE_BUSINESS',
]
export const BACHELOR_METHODS: Method[] = [
  'QUANTITATIVE',
  'QUALITATIVE',
  'DESIGN_SCIENCE_RESEARCH',
  'LITERATURE_REVIEW',
]
export const MASTER_METHODS: Method[] = [
  'QUANTITATIVE',
  'QUALITATIVE',
  'DESIGN_SCIENCE_RESEARCH',
]

// ─── Utility Types ────────────────────────────────────────────────────────────

export interface TopicFilters {
  level?: Level
  programme?: Programme
  specialisation?: Specialisation
  language?: Language
  lecturerId?: string
  search?: string
  hideFullTopics?: boolean
}

// Extended topic with preference count (for availability display)
export interface TopicWithCount {
  id: string
  title: string
  description: string | null
  methods: Method[]
  language: Language
  level: Level
  programmes: Programme[]
  specialisations: Specialisation[]
  maxStudents: number
  isActive: boolean
  semesterId: string
  lecturerId: string
  lecturerName: string
  preferenceCount: number  // how many students currently have this in preferences
  availableSlots: number   // maxStudents - preferenceCount
  createdAt: string
}

export interface PreferenceWithTopic {
  id: string
  rank: number
  priorityDate: string
  topic: TopicWithCount
}
