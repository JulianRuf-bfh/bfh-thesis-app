// Co-supervisors are now managed per-student (match level), not per topic.
// See /api/lecturer/students/[matchId]/co-supervisors instead.
import { NextResponse } from 'next/server'

export async function GET()    { return NextResponse.json([]) }
export async function POST()   { return NextResponse.json({ error: 'Co-supervisors are now assigned per student, not per topic.' }, { status: 410 }) }
export async function DELETE() { return NextResponse.json({ error: 'Co-supervisors are now assigned per student, not per topic.' }, { status: 410 }) }
