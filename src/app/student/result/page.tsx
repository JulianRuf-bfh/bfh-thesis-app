'use client'
import { useEffect, useState } from 'react'
import { MethodBadge, LanguageBadge } from '@/components/Badge'
import { formatDateTime, rankLabel } from '@/lib/utils'

export default function StudentResultPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/student/result')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>

  const { semester, match, isOwnTopic } = data ?? {}

  if (!semester) {
    return (
      <div className="max-w-lg mx-auto mt-12 card p-8 text-center text-bfh-gray-mid">
        <h2 className="text-lg font-semibold mb-2">No active semester</h2>
        <p>There is no active semester at the moment. Please check back later.</p>
      </div>
    )
  }

  // Own-topic students skip the matchingRun gate — their match was accepted directly by the lecturer
  if (!semester.matchingRun && !isOwnTopic) {
    return (
      <div className="max-w-lg mx-auto mt-12 card p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Matching not yet run</h2>
        <p className="text-bfh-gray-mid text-sm">
          The matching algorithm has not been run for <strong>{semester.name}</strong> yet.
        </p>
        <a href="/student/my-thesis" className="btn-primary mt-4 inline-block text-sm">Review My Preferences</a>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-lg mx-auto mt-12 card p-8 text-center">
        <h2 className="text-lg font-semibold text-red-700 mb-2">No match found</h2>
        <p className="text-bfh-gray-mid text-sm">Please contact <span className="font-medium">thesis-office@bfh.ch</span>.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1>My Result</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">{semester.name}</p>
      </div>

      {/* Match card */}
      <div className="card p-6 border-l-4 border-l-bfh-red">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-semibold text-bfh-slate uppercase tracking-wider mb-1">
              {isOwnTopic ? 'Direct match — Own Topic' : `Matched – ${rankLabel(match.matchedRank)}`}
            </div>
            <h2 className="text-lg font-bold text-bfh-gray-dark leading-snug">{match.topicTitle}</h2>
          </div>
          <div className="ml-4 shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-bold">✓</div>
        </div>

        {match.topicDescription && (
          <p className="text-sm text-bfh-gray-mid mb-4">{match.topicDescription}</p>
        )}

        <div className="flex gap-2 flex-wrap mb-4">
          {(match.methods ?? []).map((m: string) => <MethodBadge key={m} method={m} />)}
          <LanguageBadge language={match.language} />
        </div>

        {/* Supervisor info */}
        <div className="bg-bfh-gray-light rounded-lg p-4 space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-medium text-bfh-gray-mid w-36 shrink-0">Supervisor</span>
            <span className="text-bfh-gray-dark">{match.lecturerName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-bfh-gray-mid w-36 shrink-0">Email</span>
            <a href={`mailto:${match.lecturerEmail}`} className="text-bfh-red hover:underline">{match.lecturerEmail}</a>
          </div>

          {/* Co-supervisors — always shown */}
          <div className="border-t border-bfh-gray-border pt-2 mt-1" />
          {match.coSupervisors?.length > 0 ? (
            match.coSupervisors.map((cs: any) => (
              <div key={cs.id} className="space-y-1">
                <div className="flex gap-2">
                  <span className="font-medium text-bfh-gray-mid w-36 shrink-0">Co-Supervisor</span>
                  <span className="text-bfh-gray-dark">{cs.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-bfh-gray-mid w-36 shrink-0">Email</span>
                  <a href={`mailto:${cs.email}`} className="text-bfh-red hover:underline">{cs.email}</a>
                </div>
              </div>
            ))
          ) : (
            <div className="flex gap-2">
              <span className="font-medium text-bfh-gray-mid w-36 shrink-0">Co-Supervisor</span>
              <span className="text-bfh-gray-mid italic">None assigned</span>
            </div>
          )}

          <div className="border-t border-bfh-gray-border pt-2 mt-1" />
          <div className="flex gap-2">
            <span className="font-medium text-bfh-gray-mid w-36 shrink-0">Matched at</span>
            <span className="text-bfh-gray-dark">{formatDateTime(match.matchedAt)}</span>
          </div>
        </div>

        {semester.emailsSent && (
          <div className="mt-4 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            A confirmation email has been sent to your BFH email address.
          </div>
        )}
      </div>

      <a href="/student/progress" className="btn-primary w-full text-center block text-sm">
        View Thesis Progress →
      </a>
    </div>
  )
}
