import { TopicForm } from '@/components/TopicForm'

export default function NewTopicPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Add New Thesis Topic</h1>
        <p className="text-sm text-bfh-gray-mid mt-1">
          Create a new topic for the active semester. Your total student capacity across all topics cannot exceed 8.
        </p>
      </div>
      <TopicForm mode="create" />
    </div>
  )
}
