import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// ── Minimal valid PDF generator ────────────────────────────────────────────
function makePdf(title: string, lines: string[]): Buffer {
  // Build content stream
  const maxCharsPerLine = 80
  const textOps: string[] = [
    'BT',
    '/F1 18 Tf',
    `72 770 Td`,
    `(${esc(title)}) Tj`,
    '0 -28 Td',
    '/F1 10 Tf',
  ]
  for (const raw of lines) {
    // Word-wrap at maxCharsPerLine
    const words = raw.split(' ')
    let current = ''
    for (const w of words) {
      if ((current + ' ' + w).length > maxCharsPerLine) {
        textOps.push(`(${esc(current.trim())}) Tj`, '0 -15 Td')
        current = w
      } else {
        current += (current ? ' ' : '') + w
      }
    }
    if (current) textOps.push(`(${esc(current.trim())}) Tj`, '0 -15 Td')
    textOps.push('0 -5 Td') // paragraph gap
  }
  textOps.push('ET')
  const stream = textOps.join('\n')
  const streamBuf = Buffer.from(stream, 'latin1')

  // Objects
  const obj1 = Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  const obj2 = Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  const obj3 = Buffer.from(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n' +
    '   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  )
  const obj4Header = Buffer.from(`4 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`)
  const obj4Footer = Buffer.from('\nendstream\nendobj\n')
  const obj5 = Buffer.from(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica\n' +
    '   /Encoding /WinAnsiEncoding >>\nendobj\n'
  )

  const header = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n') // binary comment marks it as binary PDF

  // Calculate xref offsets
  let off = header.length
  const offsets: number[] = []

  offsets.push(off); off += obj1.length
  offsets.push(off); off += obj2.length
  offsets.push(off); off += obj3.length
  offsets.push(off); off += obj4Header.length + streamBuf.length + obj4Footer.length
  offsets.push(off); off += obj5.length

  const xrefOffset = off
  const xref = Buffer.from(
    'xref\n0 6\n' +
    '0000000000 65535 f \n' +
    offsets.map(o => o.toString().padStart(10, '0') + ' 00000 n \n').join('')
  )
  const trailer = Buffer.from(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  )

  return Buffer.concat([header, obj1, obj2, obj3, obj4Header, streamBuf, obj4Footer, obj5, xref, trailer])
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

// ── Document content ───────────────────────────────────────────────────────
const PROPOSAL_LINES = [
  'Student:   Anna Mueller  |  Student ID: BFH24001',
  'Programme: BBA – Bachelor of Business Administration',
  'Supervisor: Anna Mueller (anna.mueller@bfh.ch)',
  'Topic:     Family Firms and AI',
  'Submitted: ' + new Date().toLocaleDateString('de-CH'),
  '',
  '1. Research Question',
  'How do family-owned firms in Switzerland adopt and integrate Artificial Intelligence (AI)',
  'technologies into their business processes, and what are the key drivers and barriers',
  'influencing successful AI adoption in this specific firm type?',
  '',
  '2. Motivation and Relevance',
  'Family firms represent the dominant form of business organisation globally and are',
  'central to the Swiss economy. Despite their economic importance, research on how',
  'family firms navigate digital transformation – and AI adoption in particular – remains',
  'scarce. This thesis aims to close this gap by providing empirical insights.',
  '',
  '3. Methodology',
  'A qualitative research design is proposed. Data will be collected through semi-structured',
  'interviews with executives and digital transformation managers in Swiss family firms.',
  'The interviews will be analysed using thematic analysis following Braun and Clarke (2006).',
  'A sample of 8–12 firms across different industries and generations of ownership is targeted.',
  '',
  '4. Expected Contribution',
  'The thesis will contribute to the literature on family firm governance and digital',
  'transformation. Practically, it will offer recommendations for family businesses considering',
  'AI adoption strategies.',
  '',
  '5. Timeline',
  'Week 1–3:   Literature review and interview guide development',
  'Week 4–7:   Data collection (interviews)',
  'Week 8–10:  Transcription and qualitative analysis',
  'Week 11–13: Writing and revision',
  'Week 14:    Submission',
  '',
  '6. References (Selection)',
  'Gomez-Mejia, L. R. et al. (2007). Socioemotional Wealth and Business Risks in',
  'Family-controlled Firms. Administrative Science Quarterly, 52(1), 106–137.',
  'Bharadwaj, A. et al. (2013). Digital Business Strategy. MIS Quarterly, 37(2), 471–482.',
]

const MIDTERM_LINES = [
  'Student:   Anna Mueller  |  Student ID: BFH24001',
  'Programme: BBA – Bachelor of Business Administration',
  'Supervisor: Anna Mueller (anna.mueller@bfh.ch)',
  'Topic:     Family Firms and AI',
  'Midterm:   ' + new Date().toLocaleDateString('de-CH'),
  '',
  '1. Progress Summary',
  'The literature review has been completed. A total of 42 peer-reviewed articles were',
  'reviewed covering family firm theory, AI adoption frameworks, and digital transformation',
  'in SMEs. The interview guide (15 questions) was developed and pre-tested with two',
  'pilot interviews.',
  '',
  '2. Interviews Conducted',
  '8 out of 10 planned interviews have been completed. Respondents represent family firms',
  'from manufacturing (3), retail (2), financial services (2), and logistics (1).',
  'Average interview duration: 52 minutes. All interviews were recorded and transcribed.',
  '',
  '3. Preliminary Findings',
  'Theme A – AI Awareness: All firms are aware of AI but definitions vary widely.',
  'Theme B – Adoption Stage: 6 firms are in exploration phase; 2 have piloted AI tools.',
  'Theme C – Barriers: Most cited barriers are talent shortage, data quality, and cost.',
  'Theme D – Drivers: Customer pressure and competitor activity are key triggers.',
  'Theme E – Governance: Family involvement in digital decisions varies significantly.',
  '',
  '4. Deviations from Proposal',
  'The original target of 12 interviews was reduced to 10 due to limited availability',
  'during the holiday period. The methodology was adjusted accordingly. One additional',
  'documentary analysis (annual reports) was added as a secondary data source.',
  '',
  '5. Remaining Work',
  'Week 10:  Complete remaining 2 interviews',
  'Week 11–12: Full thematic analysis and theory building',
  'Week 13:  Write-up of findings and discussion chapter',
  'Week 14:  Final editing and submission',
  '',
  '6. Challenges and Support Needed',
  'No major issues. Would appreciate feedback on the preliminary coding scheme',
  'before proceeding with full analysis.',
]

// ── Seed ──────────────────────────────────────────────────────────────────
async function main() {
  const anna = await prisma.user.findFirst({
    where: { email: 'anna.mueller1@students.bfh.ch' },
  })
  if (!anna) throw new Error('Student anna.mueller1@students.bfh.ch not found')

  const match = await prisma.match.findUnique({ where: { studentId: anna.id } })
  if (!match) throw new Error('No match found for Anna – run matching first')

  console.log(`Match ID: ${match.id}`)

  // Create uploads directory
  const dir = path.join(process.cwd(), 'uploads', match.id)
  mkdirSync(dir, { recursive: true })

  // Generate PDFs
  const proposalPdf  = makePdf('Thesis Proposal – Family Firms and AI', PROPOSAL_LINES)
  const midtermPdf   = makePdf('Midterm Presentation – Family Firms and AI', MIDTERM_LINES)

  const proposalName = `${randomUUID()}.pdf`
  const midtermName  = `${randomUUID()}.pdf`

  writeFileSync(path.join(dir, proposalName), proposalPdf)
  writeFileSync(path.join(dir, midtermName),  midtermPdf)
  console.log(`Wrote ${proposalName} (${proposalPdf.length} bytes)`)
  console.log(`Wrote ${midtermName}  (${midtermPdf.length} bytes)`)

  // Remove any previous test files for this match to start clean
  await prisma.thesisFile.deleteMany({ where: { matchId: match.id } })

  // Insert file records
  await prisma.thesisFile.create({
    data: {
      matchId:      match.id,
      milestone:    'proposalSubmitted',
      originalName: 'Thesis_Proposal_Anna_Mueller.pdf',
      storedName:   proposalName,
      mimeType:     'application/pdf',
      size:         proposalPdf.length,
      seenByLecturer: false,
    },
  })
  await prisma.thesisFile.create({
    data: {
      matchId:      match.id,
      milestone:    'midtermSubmitted',
      originalName: 'Midterm_Presentation_Anna_Mueller.pdf',
      storedName:   midtermName,
      mimeType:     'application/pdf',
      size:         midtermPdf.length,
      seenByLecturer: false,
    },
  })

  // Upsert progress – both milestones submitted, not yet approved
  await prisma.thesisProgress.upsert({
    where:  { matchId: match.id },
    create: {
      matchId:              match.id,
      proposalSubmitted:    true,
      proposalSubmittedAt:  new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      proposalUploadCount:  1,
      midtermSubmitted:     true,
      midtermSubmittedAt:   new Date(Date.now() - 1000 * 60 * 60 * 2),      // 2 hours ago
      midtermUploadCount:   1,
    },
    update: {
      proposalSubmitted:    true,
      proposalSubmittedAt:  new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      proposalUploadCount:  1,
      midtermSubmitted:     true,
      midtermSubmittedAt:   new Date(Date.now() - 1000 * 60 * 60 * 2),
      midtermUploadCount:   1,
      // Reset any previous approvals/rejections so we can test the full flow
      proposalApproved:     false,
      proposalApprovedAt:   null,
      midtermApproved:      false,
      midtermApprovedAt:    null,
      proposalRejected:     false,
      proposalRejectedAt:   null,
      midtermRejected:      false,
      midtermRejectedAt:    null,
    },
  })

  console.log('\n✓ Done! Test documents created for Anna Mueller.')
  console.log('  Login as the lecturer (anna.mueller@bfh.ch / test1234)')
  console.log('  → My Students → Anna Mueller → download the PDFs')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
