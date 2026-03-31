# BFH Thesis Distribution System

Bachelor & Master thesis topic distribution platform for Berner Fachhochschule.

## Quick Start

### 1. Install Node.js
Download and install Node.js (v20 LTS) from https://nodejs.org/en/download

### 2. Set up the project

Open a terminal in the `bfh-thesis-app` folder and run:

```bash
npm run setup
```

This runs: `npm install` → `prisma generate` → `prisma db push` → seed with fake data.

### 3. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

### 4. Test login credentials (all passwords: `test1234`)

| Role    | Email                           |
|---------|---------------------------------|
| Admin   | admin@bfh.ch                    |
| Lecturer| (printed in terminal after seed) |
| Student | (printed in terminal after seed) |

---

## Features

### Student View
- Browse all thesis topics for their level (Bachelor/Master)
- Filter by programme, specialisation, language, supervisor
- Select up to 4 preferences ranked 1–4
- Reorder preferences before deadline
- View matching result after admin releases it

### Lecturer View
- Add/edit/deactivate thesis topics
- Capacity cap: max 8 students total across all topics
- Import topics from previous semesters
- View student interest per topic

### Admin View
- Dashboard with live stats (topics, students, capacity, matches)
- Full topic browser with all filters
- Semester management (create, activate, set deadlines)
- Matching workflow:
  1. Review submitted data
  2. Approve for matching
  3. Run algorithm (first-come-first-served by day; lottery within same day)
  4. Review results (matched + unmatched)
  5. Send result emails to students and lecturers
- User management (change roles: STUDENT / LECTURER / ADMIN)

---

## Topic Availability Logic

During the preference submission phase, a topic becomes **unavailable** (hidden from new selections) once the number of students who have it in any preference position equals `topic.maxStudents`. If a student removes the topic, the slot reopens.

This is a **soft lock** — the actual matching runs independently after the deadline.

---

## Matching Algorithm

1. All students who submitted preferences are sorted by **priority date** (day granularity — when they first submitted, not last edited).
2. Within the same calendar day, order is **randomised** (lottery).
3. Each student, in that order, is assigned their **highest-ranked available topic**.
4. A topic is available if: `current matches < topic.maxStudents` AND `lecturer total matches < 8`.
5. Students who exhaust all 4 preferences without a match are flagged as **unmatched** for admin manual resolution.

---

## Microsoft Azure AD SSO

To enable BFH Microsoft SSO, add these to `.env.local`:

```
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>
AZURE_AD_TENANT_ID=<your-tenant-id>
```

Register the app in Azure AD:
- Redirect URI: `https://your-domain.com/api/auth/callback/azure-ad`
- For local dev: `http://localhost:3000/api/auth/callback/azure-ad`

Role assignment: New Azure AD users default to STUDENT. Promote to LECTURER or ADMIN via the admin panel.

---

## Email Notifications

Set SMTP credentials in `.env.local` to send real emails. If not configured, emails are **logged to the terminal** for testing.

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@bfh.ch
```

---

## Tech Stack

- **Next.js 14** (App Router, React Server Components)
- **Prisma + SQLite** (file-based database — `prisma/dev.db`)
- **NextAuth v4** (Azure AD SSO + credentials fallback)
- **Tailwind CSS** (BFH brand colours)
- **TypeScript**

---

## Semester Lifecycle

```
Create Semester → Set Deadlines → Activate
       ↓
Lecturers add topics (before lecturer deadline)
       ↓
Students submit preferences (before student deadline)
       ↓
Admin reviews data → Approves for matching
       ↓
Admin runs matching algorithm
       ↓
Admin reviews results (fix unmatched manually)
       ↓
Admin sends result emails
       ↓
Students see their assignment
```

---

## Deployment

For production deployment (e.g., Azure App Service, Vercel, or any Node.js host):

1. Change `DATABASE_URL` to a PostgreSQL connection string (update `schema.prisma` provider to `postgresql`)
2. Set `NEXTAUTH_SECRET` to a strong random value
3. Set `NEXTAUTH_URL` to your production URL
4. Configure Azure AD redirect URIs
5. Run `npm run build && npm start`
