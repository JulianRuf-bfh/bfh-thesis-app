# BFH Thesis Distribution App — Project Memory

This file is auto-loaded by Claude Code at the start of every session. Keep it
focused: conventions, invariants, deployment details, and outstanding TODOs
that aren't obvious from the code itself.

## What this app is

A thesis-distribution web app for Berner Fachhochschule (Wirtschaft). Students
submit ranked topic preferences or propose their own topic; a matching
algorithm assigns students to supervisors; then a milestone-tracked thesis
workflow runs (kick-off → proposal → midterm → final thesis + presentation)
with file uploads, grading, and email notifications.

## Stack

- Next.js 14 (App Router) with `'use client'` components where needed
- NextAuth (JWT sessions) — Credentials + Azure AD providers
- Prisma ORM + SQLite (`prisma/dev.db` locally, Railway volume in prod)
- Deployed on Railway with a persistent Volume for SQLite + uploads
- TailwindCSS
- `tsx` used in regular deps (not devDeps) so `db:seed` works in Railway
  production where `NODE_ENV=production` skips devDependencies.

## Dev setup

```powershell
npm install
npm run db:push       # apply schema
npm run db:seed       # seed users/semesters/topics
npm run dev           # http://localhost:3000
```

Or the one-shot: `npm run setup`.

## Deployment (Railway)

**Required env vars** (app throws at boot in prod if missing):
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — full public URL e.g. `https://<app>.up.railway.app`
- `DATABASE_URL` — e.g. `file:/app/data/dev.db` (on the mounted volume)
- `UPLOAD_DIR` — e.g. `/app/data/uploads` (also on the volume)
- Optional: `AZURE_AD_*`, `SMTP_*`

**Start command must run `prisma db push` and the seed on first boot:**

```
npx prisma db push && npm run db:seed && npm start
```

After first boot, the `db:seed` is idempotent (upserts) so it's safe to leave
in the start command. If DB ever needs a reset, SSH into Railway and `rm`
the DB file — next boot rebuilds it.

Security scan gate: Railway blocks deploys with CVE-flagged deps. We pin
`next@^14.2.35` (fixes CVE-2025-55184, CVE-2025-67779). Don't downgrade.

## Core domain concepts

### Matching lifecycle

1. Admin approves matching on the semester (`matchingApproved: true`)
2. `POST /api/admin/matching` runs the Gale–Shapley variant (`src/lib/matching.ts`)
3. `GET` admin reviews results
4. `PATCH` publishes results (`resultsPublished: true` → visible to students/lecturers)
5. `DELETE` resets: deletes ALL matches, deletes auto-created own-topic topics,
   rewinds own-topic request statuses MATCHED → SUBMITTED and
   accepted supervisor requests ACCEPTED → PENDING. (Manual own-topic unwinding
   was a recent fix — preserve this behavior.)

### Own-topic workflow

Parallel to the preference/matching path. Student proposes their own topic,
solicits a supervisor. On accept, a Topic is **auto-created** and a Match is
written with `matchedRank = 0`.

### `matchedRank` convention — DO NOT CHANGE

- `matchedRank` 1–4: filled from student preferences via algorithm
- `matchedRank = 0`: manual match (own-topic, or admin-created)

Several places in the code branch on `matchedRank === 0`. Never use `-1` or
`null` for "manual" — always `0`.

### Capacity invariants

- `MAX_LECTURER_CAPACITY = 8` — total students per lecturer across active
  topics. Enforced in `src/app/api/lecturer/topics/route.ts` (POST) and
  `src/app/api/lecturer/topics/[id]/route.ts` (PUT).
- `maxStudents` on a Topic: 1–8 per topic.
- `MAX_UPLOADS = 2` per milestone — bypassed when lecturer requests rework.
- `User.supervisorCapacity` (default 5) — separate per-user cap used by
  own-topic supervisor requests.

### Milestones

- `proposalSubmitted`, `finalThesisSubmitted`, `finalPresentationSubmitted`
  → simple flag + timestamp + upload count on `ThesisProgress`
- `midtermPresentation` + `midtermPaper` → midterm is "submitted" only when
  **both** files are present.
- `midtermReflection` → separate milestone, uploaded after supervisor gives
  oral feedback.

### Uploads

- Files stored on disk at `<UPLOAD_DIR | cwd/uploads>/<matchId>/<uuid>.<ext>`
- `src/lib/uploadsDir.ts` is the single source of truth — always use
  `getMatchUploadsDir(matchId)`, never rebuild the path inline.
- Download endpoint validates `storedName` against UUID regex
  (`SAFE_STORED_NAME`) to block path traversal.
- 50 MB file size limit; allowed extensions: pdf, doc, docx, pptx, ppt,
  zip, txt.

### Rate limiting

In-memory (`src/lib/rateLimit.ts`). Single-instance only — OK for Railway
today. If we ever scale horizontally, swap for Redis-backed.

Buckets: `auth` (10/min), `api` (120/min), `upload` (10/min).

Applied to: auth `authorize()`, POST /api/preferences, POST
/api/student/own-topic, POST /api/student/own-topic/requests, POST
/api/lecturer/topics, upload + download endpoints.

## Outstanding QA TODOs

From the senior-dev risk assessment. Items 1–3 (persistent uploads dir,
startup assertions, DB indexes + rate-limit + JSON logging) are done.
Remaining items, rough priority:

### 4. Extract shared constants
`MAX_LECTURER_CAPACITY = 8`, `MAX_UPLOADS = 2`, `MIDTERM_MATERIAL_KEYS` etc.
are duplicated across several route files. Move to `src/lib/constants.ts`
so changes are single-source.

### 5. Cache the active semester lookup
`prisma.semester.findFirst({ where: { isActive: true } })` is called on
almost every student/lecturer request. Cache in a request-scoped helper or
Next.js cache. Measurable latency win.

### 6. Audit `as any` in `src/lib/auth.ts`
`authorize()` returns `as any` and `jwt()` reads `(user as any).id`. Type
the NextAuth user properly — small job, meaningful safety win.

### 7. Preferences PUT two-phase rank update is clever but fragile
`src/app/api/preferences/route.ts` sets ranks to 100+i then 1+i to avoid
unique-constraint violations. Works but a DB expert would raise eyebrows.
Consider wrapping in a proper transaction with deferred constraints (not
supported in SQLite — would need Postgres) or documenting loudly.

### 8. File reads buffer entire upload into memory
`Buffer.from(await file.arrayBuffer())` loads the whole file before
writing to disk. Fine for 50 MB cap on small instance, but stream-based
write would be safer if we raise the limit.

### 9. Email sends block the HTTP response
`sendUploadNotification` is awaited inline on upload. If SMTP is slow, the
student waits. Move to a fire-and-forget or queue.

### 10. No audit log
Admin actions (run matching, publish results, reset, delete topic) have
no trail. Consider a simple `AuditLog` table.

### 11. JSON-as-string columns
`programmes`, `specialisations`, `method` are stored as JSON strings. Fine
for SQLite but loses `WHERE ... contains` ability. If we move to Postgres,
convert to proper arrays.

### 12. `ThesisProgress` is ~40 flat columns
Each milestone has submitted/approved/rejected/timestamp columns. Works
but a `ThesisMilestone` child table keyed by (matchId, milestone) would be
cleaner. Bigger refactor — only do if we add more milestones.

### Tests (separate track)
Currently no automated tests. When adding, prioritize:
1. Matching algorithm (`src/lib/matching.ts`) — pure logic, high-value
2. The DELETE matching reset cascade (real correctness risk)
3. Upload path-traversal defense

## File landmarks

- `src/lib/matching.ts` — Gale–Shapley variant with priority-date tie-break
- `src/lib/auth.ts` — NextAuth config, startup env assertions, JWT/session callbacks
- `src/app/api/admin/matching/route.ts` — run/reset/publish lifecycle
- `src/app/api/progress/[matchId]/upload/route.ts` — milestone upload with
  all the fiddly upload-count / rework / both-midterm-files logic
- `prisma/seed.ts` — idempotent seed, safe to re-run
- `src/lib/uploadsDir.ts` — uploads path abstraction (respect UPLOAD_DIR)

## Style notes

- Comments explain **why**, not what. Keep this style.
- All API responses use `NextResponse.json({ error: '...' }, { status: ... })`.
- Prefer `prisma.$transaction(async tx => ...)` for multi-write operations.
- `getAuth()` returns `Session | null` — never assume truthy without checking.
