'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BACHELOR_PROGRAMMES, MASTER_PROGRAMMES, ALL_SPECIALISATIONS,
  PROGRAMME_LABELS, SPECIALISATION_LABELS, LANGUAGE_LABELS, METHOD_LABELS,
  BACHELOR_METHODS, MASTER_METHODS,
} from '@/types'
import type { Level, Programme, Specialisation, Method, Language } from '@/types'

interface TopicFormProps {
  initialData?: {
    id?: string
    title?: string
    description?: string
    methods?: Method[]
    language?: Language
    level?: Level
    programmes?: Programme[]
    specialisations?: Specialisation[]
    maxStudents?: number
  }
  mode: 'create' | 'edit'
}

export function TopicForm({ initialData, mode }: TopicFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [methods, setMethods] = useState<Method[]>(initialData?.methods ?? ['QUANTITATIVE'])
  const [language, setLanguage] = useState<Language>(initialData?.language ?? 'GERMAN')
  const [level, setLevel] = useState<Level>(initialData?.level ?? 'BACHELOR')
  const [programmes, setProgrammes] = useState<Programme[]>(initialData?.programmes ?? [])
  const [specialisations, setSpecialisations] = useState<Specialisation[]>(initialData?.specialisations ?? [])
  const [maxStudents, setMaxStudents] = useState(initialData?.maxStudents ?? 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableProgrammes = level === 'BACHELOR' ? BACHELOR_PROGRAMMES : MASTER_PROGRAMMES
  const availableMethods = level === 'BACHELOR' ? BACHELOR_METHODS : MASTER_METHODS
  const showSpecialisations = level === 'BACHELOR'

  const toggleProgramme = (p: Programme) => {
    setProgrammes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const toggleSpecialisation = (s: Specialisation) => {
    setSpecialisations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const toggleMethod = (m: Method) => {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  // If level changes, reset programmes and remove any methods not available for the new level
  const handleLevelChange = (l: Level) => {
    setLevel(l)
    setProgrammes([])
    setSpecialisations([])
    const available = l === 'BACHELOR' ? BACHELOR_METHODS : MASTER_METHODS
    setMethods(prev => {
      const filtered = prev.filter(m => available.includes(m))
      return filtered.length > 0 ? filtered : ['QUANTITATIVE']
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (programmes.length === 0) { setError('Select at least one programme.'); return }
    if (methods.length === 0) { setError('Select at least one research method.'); return }

    setLoading(true)
    const payload = {
      title, description, methods, language, level,
      programmes, specialisations: showSpecialisations ? specialisations : [],
      maxStudents,
    }

    const url = mode === 'create' ? '/api/lecturer/topics' : `/api/lecturer/topics/${initialData!.id}`
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)

    if (res.ok) {
      router.push('/lecturer')
      router.refresh()
    } else {
      const { error: err } = await res.json()
      setError(err ?? 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>
      )}

      {/* Title */}
      <div>
        <label className="label">Topic Title <span className="text-bfh-red">*</span></label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} placeholder="e.g. Digital Transformation in Swiss SMEs" />
      </div>

      {/* Description */}
      <div>
        <label className="label">Description <span className="text-bfh-gray-mid font-normal">(optional)</span></label>
        <textarea
          className="input resize-none"
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Provide a short description of the research topic, scope, and expected output…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Level */}
        <div>
          <label className="label">Level <span className="text-bfh-red">*</span></label>
          <div className="flex gap-2">
            {(['BACHELOR', 'MASTER'] as Level[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => handleLevelChange(l)}
                className={`flex-1 py-2 rounded border text-sm font-medium transition-colors ${level === l ? 'bg-bfh-red text-white border-bfh-red' : 'bg-white border-bfh-gray-border text-bfh-gray-mid hover:bg-bfh-gray-light'}`}
              >
                {l.charAt(0) + l.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Max students */}
        <div>
          <label className="label">Max Students <span className="text-bfh-red">*</span></label>
          <select className="input" value={maxStudents} onChange={e => setMaxStudents(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="text-xs text-bfh-gray-mid mt-1">Your total capacity across all topics cannot exceed 8.</p>
        </div>

        {/* Language */}
        <div className="col-span-2">
          <label className="label">Language <span className="text-bfh-red">*</span></label>
          <select className="input" value={language} onChange={e => setLanguage(e.target.value as Language)} required>
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Research Methods — multi-select toggle buttons */}
      <div>
        <label className="label">Research Methods <span className="text-bfh-red">*</span></label>
        <div className="flex flex-wrap gap-2">
          {availableMethods.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMethod(m)}
              className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                methods.includes(m)
                  ? 'bg-bfh-red text-white border-bfh-red'
                  : 'bg-white border-bfh-gray-border text-bfh-gray-mid hover:bg-bfh-gray-light'
              }`}
            >
              {METHOD_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="text-xs text-bfh-gray-mid mt-1">
          Select all applicable research methods.{level === 'MASTER' ? ' Literature Review is not available for Master theses.' : ''}
        </p>
      </div>

      {/* Programmes */}
      <div>
        <label className="label">Applicable Programmes <span className="text-bfh-red">*</span></label>
        <div className="flex flex-wrap gap-2">
          {availableProgrammes.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProgramme(p)}
              className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                programmes.includes(p)
                  ? 'bg-bfh-red text-white border-bfh-red'
                  : 'bg-white border-bfh-gray-border text-bfh-gray-mid hover:bg-bfh-gray-light'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs text-bfh-gray-mid mt-1">Select all programmes this topic is suitable for.</p>
      </div>

      {/* Specialisations — bachelor only */}
      {showSpecialisations && (
        <div>
          <label className="label">
            Applicable Specialisations{' '}
            <span className="text-bfh-gray-mid font-normal">(leave empty for all)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SPECIALISATIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialisation(s)}
                className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                  specialisations.includes(s)
                    ? 'bg-bfh-red text-white border-bfh-red'
                    : 'bg-white border-bfh-gray-border text-bfh-gray-mid hover:bg-bfh-gray-light'
                }`}
              >
                {SPECIALISATION_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : mode === 'create' ? 'Create Topic' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}
