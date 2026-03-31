'use client'
import { useEffect, useState } from 'react'
import { TopicForm } from '@/components/TopicForm'

export default function EditTopicPage({ params }: { params: { id: string } }) {
  const [topic, setTopic]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch(`/api/topics/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(t => {
        if (t) setTopic(t)
        else setError('Topic not found')
        setLoading(false)
      })
  }, [params.id])

  if (loading) return <div className="text-center py-12 text-bfh-gray-mid">Loading…</div>
  if (error)   return <div className="card p-8 text-center text-red-600">{error}</div>

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1>Edit Topic</h1>
        <p className="text-sm text-bfh-gray-mid mt-1 line-clamp-1">{topic?.title}</p>
      </div>
      <TopicForm mode="edit" initialData={topic} />
    </div>
  )
}
