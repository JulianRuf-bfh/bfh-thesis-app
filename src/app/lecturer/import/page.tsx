'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LevelBadge, MethodBadge } from '@/components/Badge'
import { formatDate } from '@/lib/utils'

export default function ImportTopicsPage() {
  const [data, setData] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/lecturer/import')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    setError('')
    const res = await fetch('/api/lecturer/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicIds: Array.from(selected) }),
    })
    setImporting(false)
    if (res.ok) {
      router.push('/lecturer')
    } else {
      const { error: err } = await res.json()
      setError(err ?? 'Import failed')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1>Import Topics from Previous Semesters</h1>
          <p className="text-sm text-bfh-gray-mid mt-1">
            Select topics to copy into the current active semester. You can edit them after importing.
          </p>
        </div>
        <button onClick={() => router.back()} className="btn-secondary text-sm">Back</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-bfh-gray-mid">Loading previous topics…</div>
      ) : data.length === 0 ? (
        <div className="card p-12 text-center text-bfh-gray-mid">
          <div className="text-4xl mb-3">📂</div>
          <p className="font-medium">No previous topics found</p>
          <p className="text-sm mt-1">You have no topics from previous semesters to import.</p>
        </div>
      ) : (
        <>
          {data.map(({ semester, topics }) => (
            <div key={semester.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base">{semester.name}</h2>
                <span className="text-xs text-bfh-gray-mid">{formatDate(semester.createdAt)}</span>
                <button
                  onClick={() => {
                    const allSelected = topics.every((t: any) => selected.has(t.id))
                    topics.forEach((t: any) => {
                      setSelected(prev => {
                        const next = new Set(prev)
                        allSelected ? next.delete(t.id) : next.add(t.id)
                        return next
                      })
                    })
                  }}
                  className="text-xs text-bfh-red hover:underline ml-2"
                >
                  {topics.every((t: any) => selected.has(t.id)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {topics.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`card p-4 cursor-pointer flex items-start gap-3 transition-all ${selected.has(t.id) ? 'border-bfh-red ring-1 ring-bfh-red' : 'hover:border-bfh-gray-mid'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggle(t.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-1 accent-bfh-red"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <LevelBadge level={t.level} />
                        {(t.methods ?? []).map((m: string) => <MethodBadge key={m} method={m} />)}
                        {(t.programmes ?? []).map((p: string) => (
                          <span key={p} className="badge bg-gray-100 text-gray-700">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-bfh-gray-mid shrink-0">Max {t.maxStudents}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {selected.size > 0 && (
            <div className="sticky bottom-4 card p-4 flex items-center justify-between bg-white shadow-lg border-bfh-red">
              <span className="text-sm font-medium text-bfh-gray-dark">{selected.size} topic(s) selected</span>
              <button onClick={handleImport} disabled={importing} className="btn-primary">
                {importing ? 'Importing…' : `Import ${selected.size} Topic(s)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
