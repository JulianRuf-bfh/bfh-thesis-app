import { redirect } from 'next/navigation'

// Redirect legacy URL to the combined "My Thesis" page
export default function StudentOwnTopicRedirect() {
  redirect('/student/my-thesis')
}
