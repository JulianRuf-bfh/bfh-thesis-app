'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  GRADING_CRITERIA,
  WRITTEN_CRITERIA,
  ORAL_CRITERIA,
  SCORE_STEPS,
  AOL_DIMENSIONS,
  scoreColor,
  scoreHoverColor,
  computeGrade,
  computeAolLevel,
  type GradingCriterion,
  type AolDimension,
} from '@/lib/gradingData'

// ─── Types ────────────────────────────────────────────────────────────────────
type CriterionEntry = { score: number | null; comment: string }
type GradingMap     = Record<string, CriterionEntry>
type AolMap         = Record<string, (number | null)[]>

interface GradingSectionProps {
  matchId:      string
  studentLevel: string | null  // 'BACHELOR' | 'MASTER' | null
  isSupervisor?: boolean       // false for co-supervisors (hides AoL + Submit)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function emptyGradingMap(): GradingMap {
  return Object.fromEntries(GRADING_CRITERIA.map(c => [c.id, { score: null, comment: '' }]))
}
function emptyAolMap(): AolMap {
  return Object.fromEntries(AOL_DIMENSIONS.map(d => [d.id, Array(d.criteria.length).fill(null)]))
}

function parseGradingJson(raw: string): GradingMap {
  try {
    const parsed = JSON.parse(raw)
    const base   = emptyGradingMap()
    for (const id of Object.keys(base)) {
      if (parsed[id]) {
        base[id].score   = parsed[id].score   ?? null
        base[id].comment = parsed[id].comment ?? ''
      }
    }
    return base
  } catch {
    return emptyGradingMap()
  }
}
function parseAolJson(raw: string): AolMap {
  try {
    const parsed = JSON.parse(raw)
    const base   = emptyAolMap()
    for (const id of Object.keys(base)) {
      if (Array.isArray(parsed[id])) base[id] = parsed[id]
    }
    return base
  } catch {
    return emptyAolMap()
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreButtons({
  value,
  onChange,
}: {
  value: number | null
  onChange: (s: number | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {SCORE_STEPS.map(s => {
        const selected = value === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
              selected
                ? scoreColor(s)
                : `bg-white border-bfh-gray-border text-bfh-gray-mid ${scoreHoverColor(s)}`
            }`}
          >
            {s.toFixed(1)}
          </button>
        )
      })}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs px-2 py-1 rounded border border-bfh-gray-border text-bfh-gray-mid hover:bg-bfh-gray-light transition-colors"
          title="Clear score"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function CriterionRow({
  criterion,
  entry,
  level,
  open,
  onToggle,
  onChange,
}: {
  criterion:  GradingCriterion
  entry:      CriterionEntry
  level:      string | null
  open:       boolean
  onToggle:   () => void
  onChange:   (e: CriterionEntry) => void
}) {
  const indicators = level === 'MASTER' ? criterion.indicatorsMsc : criterion.indicatorsBsc

  const scoreLabel = (s: number) => {
    if (s <= 1.5) return 'sehr schwach'
    if (s <= 2.5) return 'schwach'
    if (s <= 3.5) return 'ungenügend'
    if (s <= 4.5) return 'genügend'
    if (s <= 5.5) return 'gut'
    return 'ausgezeichnet'
  }

  return (
    <div className="rounded-lg border border-bfh-gray-border bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-bfh-gray-dark">{criterion.name}</span>
            <span className="text-[10px] text-bfh-gray-mid bg-bfh-gray-light px-1.5 py-0.5 rounded">
              {criterion.weightPercent}%
            </span>
          </div>
          <ScoreButtons
            value={entry.score}
            onChange={(score: number | null) => onChange({ ...entry, score })}
          />
          {entry.score !== null && (
            <p className="text-[10px] text-bfh-gray-mid mt-1">
              {entry.score.toFixed(1)} – {scoreLabel(entry.score)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 mt-0.5 text-xs text-bfh-gray-mid hover:text-bfh-gray-dark transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <span className={`transition-transform inline-block ${open ? 'rotate-180' : ''}`}>▾</span>
          <span>{open ? 'Hide Criteria' : 'Show Criteria'}</span>
        </button>
      </div>

      {/* Expandable criteria */}
      {open && (
        <div className="border-t border-bfh-gray-border bg-bfh-gray-light px-3 pb-3 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid mb-1">
            Criteria ({level === 'MASTER' ? 'MSc' : 'BSc'})
          </p>
          <p className="text-xs text-bfh-gray-dark leading-relaxed">{indicators}</p>
        </div>
      )}

      {/* Comment — always visible */}
      <div className="border-t border-bfh-gray-border px-3 pb-3 pt-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-bfh-gray-mid">
          Comment
        </label>
        <textarea
          rows={2}
          className="input mt-1 text-xs resize-none"
          placeholder="Add a comment…"
          value={entry.comment}
          onChange={e => onChange({ ...entry, comment: e.target.value })}
        />
      </div>
    </div>
  )
}

function AolCriterionRow({
  criterion,
  score,
  onChange,
}: {
  criterion: { name: string; score0: string; score1: string; score2: string }
  score:     number | null
  onChange:  (s: number) => void
}) {
  const COLORS = [
    'bg-red-600 text-white border-red-600',
    'bg-yellow-500 text-white border-yellow-500',
    'bg-green-600 text-white border-green-600',
  ]
  const HOVER = [
    'hover:bg-red-50 hover:border-red-400 hover:text-red-700',
    'hover:bg-yellow-50 hover:border-yellow-400 hover:text-yellow-700',
    'hover:bg-green-50 hover:border-green-400 hover:text-green-700',
  ]
  const descs = [criterion.score0, criterion.score1, criterion.score2]

  return (
    <div className="rounded border border-bfh-gray-border bg-white p-3">
      <p className="text-xs font-semibold text-bfh-gray-dark mb-2">{criterion.name}</p>
      <div className="space-y-1.5">
        {[0, 1, 2].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-full flex items-start gap-2.5 text-left rounded border px-2.5 py-2 transition-colors ${
              score === v ? COLORS[v] : `bg-white border-bfh-gray-border ${HOVER[v]}`
            }`}
          >
            <span className={`shrink-0 text-xs font-bold w-4 text-center mt-0.5 ${
              score === v ? 'opacity-100' : 'text-bfh-gray-mid'
            }`}>{v}</span>
            <span className={`text-xs leading-snug ${
              score === v ? 'font-medium' : 'text-bfh-gray-dark'
            }`}>{descs[v]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AolDimensionCard({
  dim,
  scores,
  onChange,
}: {
  dim:      AolDimension
  scores:   (number | null)[]
  onChange: (idx: number, v: number) => void
}) {
  const level = computeAolLevel(dim, scores)
  const total = scores.every(s => s !== null) ? (scores as number[]).reduce((a, b) => a + b, 0) : null

  const levelBadge = level === null ? null : level === 'NOT_ACHIEVED'
    ? <span className="text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded px-2 py-0.5">Not Achieved</span>
    : level === 'WELL_ACHIEVED'
    ? <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded px-2 py-0.5">Well Achieved</span>
    : <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 border border-yellow-200 rounded px-2 py-0.5">Achieved</span>

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-semibold text-sm text-bfh-gray-dark">{dim.label}</h4>
        <div className="flex items-center gap-2">
          {total !== null && (
            <span className="text-xs text-bfh-gray-mid">{total}/{dim.maxScore}</span>
          )}
          {levelBadge}
        </div>
      </div>
      <div className="space-y-2">
        {dim.criteria.map((c, i) => (
          <AolCriterionRow
            key={i}
            criterion={c}
            score={scores[i]}
            onChange={v => onChange(i, v)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GradingSection({ matchId, studentLevel, isSupervisor = true }: GradingSectionProps) {
  const [tab,          setTab]        = useState<'main' | 'aol'>('main')
  const [grading,      setGrading]    = useState<GradingMap>(emptyGradingMap())
  const [aol,          setAol]        = useState<AolMap>(emptyAolMap())
  const [loading,      setLoading]    = useState(true)
  const [saving,       setSaving]     = useState(false)
  const [submitting,   setSubmitting] = useState(false)
  const [savedAt,      setSavedAt]    = useState<string | null>(null)
  const [submittedAt,  setSubmittedAt] = useState<string | null>(null)
  const [saveMsg,      setSaveMsg]    = useState<{ text: string; ok: boolean } | null>(null)
  const [openCriteria, setOpenCriteria] = useState<Record<string, boolean>>(
    Object.fromEntries(GRADING_CRITERIA.map(c => [c.id, false]))
  )

  const allOpen = GRADING_CRITERIA.every(c => openCriteria[c.id])

  const toggleAllCriteria = () => {
    const next = !allOpen
    setOpenCriteria(Object.fromEntries(GRADING_CRITERIA.map(c => [c.id, next])))
  }

  const toggleCriterion = (id: string) => {
    setOpenCriteria(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const fetchGrading = useCallback(async () => {
    const res = await fetch(`/api/progress/${matchId}/grading`)
    if (res.ok) {
      const data = await res.json()
      setGrading(parseGradingJson(data.gradingJson))
      setAol(parseAolJson(data.aolJson))
      setSavedAt(data.updatedAt ?? null)
      setSubmittedAt(data.submittedAt ?? null)
    }
    setLoading(false)
  }, [matchId])

  useEffect(() => { fetchGrading() }, [fetchGrading])

  const saveGrading = async () => {
    setSaving(true)
    const body: Record<string, string> = { gradingJson: JSON.stringify(grading) }
    // Co-supervisors must not overwrite the AoL section (they cannot see it)
    if (isSupervisor) body.aolJson = JSON.stringify(aol)
    const res = await fetch(`/api/progress/${matchId}/grading`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setSavedAt(data.updatedAt)
      setSaveMsg({ text: 'Grading saved', ok: true })
    } else {
      setSaveMsg({ text: 'Could not save grading', ok: false })
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const submitGrading = async () => {
    if (!confirm('Submit the final grading? This will mark the assessment as complete and notify the admin.')) return
    setSubmitting(true)
    const res = await fetch(`/api/progress/${matchId}/grading`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        gradingJson: JSON.stringify(grading),
        aolJson:     JSON.stringify(aol),
        submit:      true,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setSavedAt(data.updatedAt)
      setSubmittedAt(data.submittedAt)
      setSaveMsg({ text: 'Grading submitted successfully', ok: true })
    } else {
      setSaveMsg({ text: 'Could not submit grading', ok: false })
    }
    setSubmitting(false)
    setTimeout(() => setSaveMsg(null), 4000)
  }

  const updateCriterion = (id: string, entry: CriterionEntry) => {
    setGrading(prev => ({ ...prev, [id]: entry }))
  }

  const updateAol = (dimId: string, idx: number, v: number) => {
    setAol(prev => {
      const arr = [...(prev[dimId] ?? [])]
      arr[idx] = v
      return { ...prev, [dimId]: arr }
    })
  }

  const scoreMap = Object.fromEntries(
    Object.entries(grading).map(([id, e]) => [id, e.score]),
  )
  const grade = computeGrade(scoreMap)

  if (loading) return (
    <div className="card p-6 text-center text-bfh-gray-mid text-sm">Loading grading…</div>
  )

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-bfh-gray-dark">Thesis Grading</h2>
        <p className="text-xs text-bfh-gray-mid mt-0.5">
          Score each criterion (1.0–6.0, steps of 0.5). Expand a criterion to view indicators
          {studentLevel ? ` for ${studentLevel === 'MASTER' ? 'MSc' : 'BSc'}` : ''} and add comments.
          The final grade is calculated automatically.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bfh-gray-border">
        {(['main', 'aol'] as const).filter(t => t === 'main' || isSupervisor).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-bfh-red text-bfh-red'
                : 'border-transparent text-bfh-gray-mid hover:text-bfh-gray-dark'
            }`}
          >
            {t === 'main' ? 'Main Grading' : 'AoL Assessment'}
          </button>
        ))}
      </div>
      {!isSupervisor && (
        <p className="text-xs text-bfh-gray-mid bg-bfh-gray-light rounded px-3 py-2">
          You are a co-supervisor. You can edit scores and comments in Main Grading. The AoL Assessment is managed by the main supervisor only.
        </p>
      )}

      {/* ── Main Grading tab ───────────────────────────────────────────────── */}
      {tab === 'main' && (
        <div className="space-y-5">
          {/* Show / Hide all criteria */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={toggleAllCriteria}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <span className={`transition-transform inline-block ${allOpen ? 'rotate-180' : ''}`}>▾</span>
              {allOpen ? 'Hide All Criteria' : 'Show All Criteria'}
            </button>
          </div>

          {/* Written section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-bfh-gray-dark">Written Part</h3>
              <span className="text-[10px] bg-bfh-gray-light text-bfh-gray-mid rounded px-1.5 py-0.5">50%</span>
              {grade.writtenPassed !== undefined && grade.writtenSum > 0 && (
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                  grade.writtenPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {grade.writtenPassed ? 'Passed' : 'Failed'}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {WRITTEN_CRITERIA.map(c => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  entry={grading[c.id]}
                  level={studentLevel}
                  open={openCriteria[c.id]}
                  onToggle={() => toggleCriterion(c.id)}
                  onChange={e => updateCriterion(c.id, e)}
                />
              ))}
            </div>
          </div>

          {/* Oral section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-bfh-gray-dark">Oral Part</h3>
              <span className="text-[10px] bg-bfh-gray-light text-bfh-gray-mid rounded px-1.5 py-0.5">50%</span>
              {grade.oralPassed !== undefined && grade.oralSum > 0 && (
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                  grade.oralPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {grade.oralPassed ? 'Passed' : 'Failed'}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {ORAL_CRITERIA.map(c => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  entry={grading[c.id]}
                  level={studentLevel}
                  open={openCriteria[c.id]}
                  onToggle={() => toggleCriterion(c.id)}
                  onChange={e => updateCriterion(c.id, e)}
                />
              ))}
            </div>
          </div>

          {/* Grade summary */}
          <div className={`rounded-lg p-4 border ${
            !grade.allSet
              ? 'bg-bfh-gray-light border-bfh-gray-border'
              : grade.passed
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs text-bfh-gray-mid font-medium uppercase tracking-wider">Final Grade</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${
                    !grade.allSet ? 'text-bfh-gray-mid'
                    : grade.passed ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {grade.allSet ? grade.finalGrade.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-bfh-gray-mid">/  6.0</span>
                </div>
                {!grade.allSet && (
                  <p className="text-[11px] text-bfh-gray-mid italic">Score all criteria to see the final grade</p>
                )}
              </div>

              {grade.allSet && (
                <div className={`text-sm font-bold px-4 py-2 rounded-lg ${
                  grade.passed
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  {grade.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
                </div>
              )}
            </div>

            {grade.allSet && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className={`rounded p-2 ${grade.writtenPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-[10px] text-bfh-gray-mid uppercase tracking-wider mb-0.5">Written (50%)</p>
                  <p className={`font-semibold ${grade.writtenPassed ? 'text-green-800' : 'text-red-800'}`}>
                    {Math.round((1 + (grade.writtenSum / 0.5) * 5) * 10) / 10} — {grade.writtenPassed ? 'Passed' : 'Failed'}
                  </p>
                </div>
                <div className={`rounded p-2 ${grade.oralPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-[10px] text-bfh-gray-mid uppercase tracking-wider mb-0.5">Oral (50%)</p>
                  <p className={`font-semibold ${grade.oralPassed ? 'text-green-800' : 'text-red-800'}`}>
                    {Math.round((1 + (grade.oralSum / 0.5) * 5) * 10) / 10} — {grade.oralPassed ? 'Passed' : 'Failed'}
                  </p>
                </div>
              </div>
            )}

            {grade.allSet && !grade.passed && (
              <p className="mt-2 text-[11px] text-red-700">
                {!grade.writtenPassed && !grade.oralPassed
                  ? 'Both written and oral parts failed.'
                  : !grade.writtenPassed
                  ? 'Written part failed (average score below 4).'
                  : !grade.oralPassed
                  ? 'Oral part failed (average score below 4).'
                  : 'Final grade below 4.'}
                {grade.finalGrade >= 3.5 && grade.finalGrade < 4 && ' Revision (Nachbesserung) may be possible for individual criteria scored 1.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── AoL Assessment tab ────────────────────────────────────────────── */}
      {tab === 'aol' && (
        <div className="space-y-4">
          <p className="text-xs text-bfh-gray-mid bg-bfh-gray-light rounded p-2.5">
            AoL scores are reported separately and do <strong>not</strong> affect the thesis grade.
            Score each criterion 0 / 1 / 2. Expand a criterion to read the rubric.
          </p>

          {/* LG 5 aggregate note */}
          {(() => {
            const l51 = computeAolLevel(AOL_DIMENSIONS[2], aol['LO_5_1'] ?? [])
            const l52 = computeAolLevel(AOL_DIMENSIONS[3], aol['LO_5_2'] ?? [])
            const lvls = [l51, l52].filter(Boolean) as string[]
            if (lvls.length === 2) {
              const map: Record<string, number> = { NOT_ACHIEVED: 0, ACHIEVED: 1, WELL_ACHIEVED: 2 }
              const avg = (map[l51!] + map[l52!]) / 2
              const label = avg < 0.5 ? 'Not Achieved' : avg < 1.5 ? 'Achieved' : 'Well Achieved'
              return (
                <div className="text-xs text-bfh-gray-mid bg-blue-50 border border-blue-200 rounded p-2">
                  <span className="font-semibold">LG 5 overall (avg of 5.1 + 5.2):</span> {label}
                </div>
              )
            }
            return null
          })()}

          {AOL_DIMENSIONS.map(dim => (
            <AolDimensionCard
              key={dim.id}
              dim={dim}
              scores={aol[dim.id] ?? Array(dim.criteria.length).fill(null)}
              onChange={(idx, v) => updateAol(dim.id, idx, v)}
            />
          ))}
        </div>
      )}

      {/* Save / Submit row */}
      <div className="border-t border-bfh-gray-border pt-3 space-y-2">
        {submittedAt && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <span className="text-green-600 text-sm">✓</span>
            <span className="text-xs text-green-700 font-medium">
              Grading submitted on {new Date(submittedAt).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="text-xs text-bfh-gray-mid">
            {savedAt
              ? `Last saved: ${new Date(savedAt).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Not yet saved'}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && (
              <span className={`text-xs font-medium ${saveMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
                {saveMsg.text}
              </span>
            )}
            <button
              onClick={saveGrading}
              disabled={saving || submitting}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            {isSupervisor && (
              <button
                onClick={submitGrading}
                disabled={saving || submitting || !grade.allSet}
                title={!grade.allSet ? 'Score all criteria before submitting' : undefined}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : submittedAt ? '✓ Re-submit Grading' : 'Submit Grading'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
