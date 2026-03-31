import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// ── Name pools ────────────────────────────────────────────────────────────────
const FIRST_MALE = ['Andreas', 'Stefan', 'Markus', 'Thomas', 'Michael', 'Christian', 'Daniel', 'Martin', 'Peter', 'Wolfgang', 'Heinz', 'Klaus', 'Rolf', 'Ueli', 'Hans', 'Beat', 'Christoph', 'Jürg', 'Urs', 'Roland', 'Tobias', 'Oliver', 'Lukas', 'Matthias', 'Simon', 'Patrick', 'Philipp', 'Felix', 'Florian', 'Benedikt', 'Dominik', 'Marc', 'Tim', 'Jan', 'Nils', 'Sven', 'Lars', 'Reto', 'Ernst', 'Rudolf', 'Hanspeter', 'Bernhard', 'Konrad', 'Werner', 'Franz', 'Karl', 'Dieter', 'Helmut', 'Walter', 'Otto']
const FIRST_FEMALE = ['Anna', 'Maria', 'Sandra', 'Andrea', 'Nicole', 'Christine', 'Sabine', 'Monika', 'Katharina', 'Elisabeth', 'Franziska', 'Silvia', 'Claudia', 'Eva', 'Petra', 'Anja', 'Susanne', 'Barbara', 'Karin', 'Martina', 'Julia', 'Sarah', 'Lisa', 'Laura', 'Emma', 'Sophie', 'Lena', 'Nina', 'Sonja', 'Heidi', 'Vreni', 'Beatrice', 'Corinne', 'Regula', 'Ursula', 'Margrit', 'Therese', 'Doris', 'Irene', 'Hanna']
const LAST_NAMES = ['Müller', 'Meier', 'Keller', 'Weber', 'Zimmermann', 'Huber', 'Schneider', 'Fischer', 'Schmid', 'Meyer', 'Wolf', 'Brunner', 'Baumann', 'Lehmann', 'Frei', 'Moser', 'Bauer', 'Koch', 'Maurer', 'Steiner', 'Kaufmann', 'Roth', 'Hauser', 'Gysin', 'Vogel', 'Widmer', 'Küng', 'Wyss', 'Wäfler', 'Sutter', 'Lüscher', 'Imhof', 'Gerber', 'Egger', 'Berger', 'Aeschlimann', 'Tanner', 'Gasser', 'Hofmann', 'Leuenberger', 'Mathys', 'Nussbaumer', 'Odermatt', 'Pfister', 'Rhyner', 'Schär', 'Thöni', 'Ulrich', 'Vonlanthen', 'Zbinden', 'Aebischer', 'Blum', 'Däpp', 'Etter', 'Fuhrer', 'Graber', 'Häberli', 'Jost', 'Knecht', 'Loosli', 'Nyffeler', 'Oppliger', 'Probst', 'Schüpbach', 'Trachsel', 'Uhlmann', 'Vögeli', 'Wenger', 'Zürcher', 'Amstutz', 'Brönnimann', 'Christen', 'Dähler', 'Flükiger', 'Grossenbacher', 'Heim', 'Iseli', 'Jutzi']

let nameCounter = 0
function nextName(female = false): { first: string; last: string } {
  const firstPool = female ? FIRST_FEMALE : FIRST_MALE
  const first = firstPool[nameCounter % firstPool.length]
  const last = LAST_NAMES[nameCounter % LAST_NAMES.length]
  nameCounter++
  return { first, last }
}

function emailify(first: string, last: string, domain: string, n: number): string {
  const f = first.toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
  const l = last.toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
  return `${f}.${l}${n > 0 ? n : ''}@${domain}`
}

// ── Topic title pools by programme ────────────────────────────────────────────

const BBA_TOPICS = [
  'Impact of Social Media Marketing on Brand Loyalty in Swiss Retail',
  'Corporate Governance and Firm Performance: Evidence from Swiss SMEs',
  'Digital Transformation in Traditional Swiss Manufacturing Firms',
  'ESG Reporting Practices Among SPI-Listed Companies',
  'The Role of Employer Branding in Talent Retention',
  'Customer Lifetime Value Models in Subscription-Based Businesses',
  'Agile Management in Non-Tech Swiss Organisations',
  'Pricing Strategies for Market Entry in the DACH Region',
  'Employee Wellbeing and Productivity in Hybrid Work Models',
  'Brand Perception Analysis: Migros vs. Coop',
  'Blockchain Applications in Swiss Supply Chain Management',
  'Customer Satisfaction Drivers in Swiss Online Banking',
  'Impact of Influencer Marketing on Swiss Gen Z Consumers',
  'Corporate Social Responsibility and Consumer Trust',
  'Lean Management Implementation in Service Organisations',
  'Data Analytics in Retail: Personalisation and Customer Behaviour',
  'Strategic Alliances in the Swiss Tourism Industry',
  'Managing Organisational Change in Family-Owned Businesses',
  'Financial Performance of B-Corp Certified Swiss Companies',
  'Circular Economy Business Models in Swiss Industry',
  'Platform Business Models and Value Creation',
  'Remote Work Policies and Employee Engagement',
  'Cross-Cultural Management Challenges in Swiss Multinationals',
  'Sustainability Marketing: Greenwashing vs. Genuine Practice',
  'Customer Retention in Swiss Telecom: A Comparative Study',
  'The Sharing Economy: Regulation and Market Dynamics in Switzerland',
  'Innovation Culture in Swiss Pharmaceutical Companies',
  'Impact of Automation on Workforce in Logistics Sector',
  'Net Promoter Score as a Predictor of Financial Performance',
  'Venture Capital in Switzerland: Investment Patterns and Startup Success',
  'Smart City Initiatives and Local Business Ecosystems',
  'Swiss SME Internationalisation: Barriers and Enablers',
  'Supply Chain Resilience Post-Pandemic: Swiss Case Studies',
  'The Role of Corporate Culture in Merger Success',
  'Gender Diversity on Swiss Boards: Trends and Effects',
  'Customer Experience Design in Swiss Insurance',
  'Omnichannel Strategy in Swiss Fashion Retail',
  'The Effect of Packaging on Consumer Purchase Decisions',
  'Business Ethics and Decision-Making in Financial Services',
  'Digital Payments Adoption in Switzerland',
  'Talent Acquisition via Social Media: LinkedIn Effectiveness',
  'The Impact of Minimum Wage Policy on Swiss SME Employment',
  'Startup Ecosystem in Bern: Challenges and Opportunities',
  'Performance Management Systems in Swiss Public Organisations',
  'Sustainable Fashion: Consumer Behaviour in Switzerland',
  'Swiss Banking Secrecy Erosion and Offshore Wealth',
  'Key Account Management in B2B Technology Firms',
  'Emotional Intelligence and Leadership Effectiveness',
  'Market Entry Strategies for Swiss Fintech Startups',
  'Service Robots in Hospitality: Customer Acceptance',
]

const IBA_TOPICS = [
  'Brexit Impact on Swiss-UK Trade Relations',
  'Emerging Market Entry Strategies: Sub-Saharan Africa',
  'Cross-Cultural Negotiation: Switzerland and China',
  'Global Value Chains and Reshoring After COVID-19',
  'Geopolitical Risk Assessment in Foreign Direct Investment',
  'International Mergers: Cultural Integration Challenges',
  'Trade Finance and SME Export Barriers in Switzerland',
  'Comparative Analysis of Corporate Governance Codes',
  'Sustainable Development Goals and Multinational Strategy',
  'Political Risk in Latin American Markets',
  'Transfer Pricing Regulation and Tax Optimisation',
  'Global Talent Mobility and Swiss Immigration Policy',
  'Exporting Swiss Luxury Brands to Asia-Pacific',
  'International Joint Ventures: Success Factors',
  'Currency Hedging Strategies for Swiss Exporters',
  'Global Supply Chain Ethics: Conflict Minerals',
  'E-Commerce Cross-Border Trade: Swiss SMEs in the EU',
  'Impact of US-China Trade War on Swiss Exporters',
  'International Franchising in the Food Industry',
  'Regional Trade Agreements and Swiss Foreign Policy',
  'Sustainability Reporting Harmonisation: GRI vs SASB',
  'International Crisis Management in Multinational Firms',
  'Digital Diplomacy and International Business',
  'Swiss Development Aid and Private Sector Engagement',
  'International Licensing Strategies in Biotech',
  'Comparative Labour Law: Switzerland, Germany, France',
  'UN Guiding Principles on Business and Human Rights: Implementation',
  'Swiss Re and Global Catastrophe Risk Modelling',
  'International Retail Expansion: ALDI/LIDL vs. Local Chains',
  'Foreign Language Proficiency and Export Performance',
  'Digitalisation of International Trade Documentation',
  'Swiss Commodity Trading Hub: Regulatory Challenges',
  'Intercultural Leadership in Multinational Project Teams',
  'Global Brand Standardisation vs. Adaptation',
  'International Patent Protection for Swiss Innovators',
  'Impact of Climate Agreements on Swiss Export Industries',
  'Diaspora Networks and Swiss International Trade',
  'Digital Currencies and International Payment Systems',
  'Swiss Foreign Investment in Central and Eastern Europe',
  'Agro-Food Export Strategy for Developing Nations',
]

const DIGI_TOPICS = [
  'AI-Driven Customer Segmentation in Swiss E-Commerce',
  'Cybersecurity Risk Management in Swiss Banks',
  'Machine Learning for Credit Risk Scoring',
  'Blockchain-Based Identity Verification Systems',
  'Digital Twin Technology in Swiss Manufacturing',
  'Natural Language Processing for Customer Support Automation',
  'Robotic Process Automation in Financial Services',
  'Cloud Migration Strategy for Swiss SMEs',
  'Platform Strategy and Data Network Effects',
  'User Experience Design for Mobile Banking Apps',
  'Predictive Analytics in Healthcare Resource Planning',
  'IoT Implementation in Smart Building Management',
  'API Economy and Open Banking in Switzerland',
  'Data Governance Frameworks under Swiss Data Protection Law',
  'Agile vs. Waterfall in Swiss Public Sector IT Projects',
  'Digital Marketing Attribution Models',
  'Augmented Reality in Swiss Retail: POC and ROI',
  'Conversational AI and Chatbot Effectiveness',
  'Big Data Analytics in Swiss Insurance Claims',
  'Edge Computing for Industrial IoT Applications',
  'DevOps Transformation in Legacy System Environments',
  'Social Commerce: TikTok Shop and Gen Z Behaviour',
  'Algorithmic Pricing in E-Commerce Platforms',
  'Digital Health Platforms and Patient Engagement',
  'Recommender Systems: Accuracy vs. Diversity Trade-off',
  'Ethical AI: Bias in Hiring Algorithms',
  'Metaverse Opportunities for Swiss Brands',
  'SaaS vs. On-Premise: TCO Analysis for Swiss Mid-Market',
  'Digital Onboarding in Swiss Banking: Frictionless KYC',
  'Voice Search Optimisation for Swiss E-Retailers',
  'Real-Time Fraud Detection Using Neural Networks',
  'No-Code/Low-Code Platforms for Business Process Automation',
  'Digital Transformation Maturity Assessment Framework',
  'Quantum Computing Applications in Financial Risk',
  'Carbon Accounting Software for Swiss Corporations',
  'Autonomous Vehicles: Insurance and Liability Implications',
  'Digital Accessibility in Swiss Government Portals',
  'AI-Powered Personalisation in Media Streaming',
  'Data Quality Management in Enterprise Analytics',
  'Zero-Trust Security Architecture in Swiss Enterprises',
  'Smart Contract Audit Frameworks for DeFi Protocols',
  'Influencer Analytics: Measuring ROI Beyond Reach',
  'Digital Nomadism and Its Effect on Urban Coworking Markets',
  'Subscription Economy Metrics: Churn Prediction Models',
  'Open Source Software Strategy in Corporate IT',
  'Business Intelligence for NGO Impact Measurement',
  'Gamification in Corporate Learning Management',
  'Web3 Business Models: Tokenisation of Real Assets',
  'Dark Patterns in UX: Detection and Regulatory Response',
  'Digital Product Management: OKR Implementation',
]

const MBA_TOPICS = [
  'Strategic Leadership in Volatile Environments: VUCA Framework',
  'Corporate Venture Building: Best Practices in Swiss Corporates',
  'ESG Integration in Investment Portfolio Management',
  'Executive Compensation and Long-Term Value Creation',
  'Digital Strategy Execution in Traditional Industries',
  'Mergers & Acquisitions Post-Deal Value Capture',
  'Strategic Innovation Ecosystems: Switzerland as Global Hub',
  'Business Model Innovation in the Platform Economy',
  'Private Equity Value Creation: Operating Partners Approach',
  'Corporate Resilience and Strategic Risk Management',
  'Leadership Succession Planning in Family Enterprises',
  'Stakeholder Capitalism: Balancing Shareholder and Social Value',
  'Internationalisation via Digital Channels: Born Global Firms',
  'Dynamic Capabilities and Competitive Advantage',
  'Corporate Turnaround Management: Swiss Case Studies',
  'ESG Debt Instruments: Green Bonds and Sustainability-Linked Loans',
  'Innovation Culture vs. Efficiency: Managing the Paradox',
  'Disruptive Innovation in the Swiss Insurance Industry',
  'Strategic Alliances in the Medtech Sector',
  'Corporate Real Estate Strategy Post-COVID',
  'Shareholder Activism in Swiss Listed Companies',
  'Long-Term Capital Allocation in Family Offices',
  'Purpose-Driven Strategy and Financial Performance',
  'Platformisation of Professional Services',
  'CEO Succession and Shareholder Value',
]

const MDBA_TOPICS = [
  'Generative AI in Marketing: Productivity vs. Authenticity',
  'Data-Driven Product Development in SaaS Companies',
  'Advanced Analytics for Supply Chain Optimisation',
  'Digital Business Ecosystems: Orchestration Strategies',
  'Predictive Customer Analytics in Telecoms Churn Management',
  'AI Ethics Frameworks for Corporate Implementation',
  'Digital Disruption in Swiss Retail Banking',
  'Machine Learning in HR Analytics: Talent Prediction',
  'Platform Governance and Antitrust in Digital Markets',
  'Digital Transformation KPIs: Measuring What Matters',
  'Data Monetisation Strategies for Non-Tech Firms',
  'Deep Learning Applications in Medical Imaging',
  'Privacy-Preserving Machine Learning in Finance',
  'Customer Data Platforms: Architecture and ROI',
  'Digital Product Analytics: Growth Frameworks',
  'Algorithmic Decision-Making and Explainability Requirements',
  'API-First Business Models in Fintech',
  'Advanced CRM: Predictive Lead Scoring',
  'Digital Twin in Smart City Infrastructure',
  'Responsible AI Adoption in Public Administration',
  'Multi-Cloud Strategy in Large Swiss Enterprises',
  'Automated Financial Reporting Using NLP',
]

const MEBI_TOPICS = [
  'Design Thinking in Product-Led Growth Companies',
  'Innovation Ambidexterity: Exploitation vs. Exploration',
  'Intrapreneurship in Swiss Corporates: Structures and Outcomes',
  'Agile at Scale: SAFe Implementation in Financial Services',
  'Technology Scouting and Open Innovation in Pharma',
  'Lean Startup Methodology in Corporate R&D',
  'Human-Centred Design for Digital Health Services',
  'Innovation Accounting: Metrics for Corporate Ventures',
  'IP Strategy for Deep-Tech Startups',
  'Circular Economy Design: Business Model Implications',
  'Service Design in Swiss Public Transport',
  'Rapid Prototyping and Validation in B2B Software',
  'Sustainable Product Innovation in FMCG',
  'Innovation Ecosystems: University-Industry Collaboration',
  'Venture Client Model in Swiss Industry',
  'Tech-Enabled Business Model Transformation in Insurance',
  'Human-Robot Collaboration in Manufacturing',
  'Corporate Accelerators: ROI and Strategic Value',
  'Digital Service Innovation in Wealth Management',
  'Systems Thinking in Sustainable Business Design',
  'Entrepreneurial Finance: SAFE Notes and Venture Debt',
  'Impact Investing: Measurement and Reporting Frameworks',
  'Platform Businesses in Healthcare: Regulatory Challenges',
]

const DGOV_TOPICS = [
  'Digital Identity Management in Swiss Government Services',
  'E-Government Adoption: Citizen Acceptance Factors',
  'Algorithmic Governance and Accountability in Public Administration',
  'Open Government Data: Economic Value and Privacy Trade-offs',
  'Blockchain for Transparent Public Procurement',
  'Cybersecurity Policy Frameworks for Critical Infrastructure',
  'AI in Public Service Delivery: Chatbots and Automation',
  'Digital Democracy: E-Participation and Direct Democracy',
  'Smart City Governance: Zurich and Bern Case Studies',
  'GovTech Startups: Procurement and Partnership Models',
  'Public-Private Data Sharing in Pandemic Response',
  'Federated AI for Inter-Cantonal Health Data',
  'Regulatory Technology (RegTech) in Financial Supervision',
  'Digital Transformation of Swiss Federal Administration',
  'Privacy by Design in Government Information Systems',
  'Municipal Open Data Portals: Usage and Impact',
  'Platform Government: Lessons from Estonia for Switzerland',
  'Digital Skills and Public Sector Workforce Development',
  'AI Procurement Guidelines for Government Agencies',
  'Cross-Border Digital Government Services in the EU',
]

// ── Methods ───────────────────────────────────────────────────────────────────
const BACHELOR_METHODS = ['QUANTITATIVE', 'QUALITATIVE', 'DESIGN_SCIENCE_RESEARCH', 'LITERATURE_REVIEW']
const MASTER_METHODS   = ['QUANTITATIVE', 'QUALITATIVE', 'DESIGN_SCIENCE_RESEARCH']
const LANGUAGES        = ['GERMAN', 'ENGLISH', 'BOTH']

// ── Student distributions ─────────────────────────────────────────────────────
const STUDENT_DIST = [
  { level: 'BACHELOR', programme: 'BBA',  specialisation: 'MARKETING',           count: 20 },
  { level: 'BACHELOR', programme: 'BBA',  specialisation: 'FINANCE',             count: 18 },
  { level: 'BACHELOR', programme: 'BBA',  specialisation: 'GLOBAL_MANAGEMENT',   count: 15 },
  { level: 'BACHELOR', programme: 'BBA',  specialisation: 'SUSTAINABLE_BUSINESS',count: 12 },
  { level: 'BACHELOR', programme: 'IBA',  specialisation: 'MARKETING',           count: 12 },
  { level: 'BACHELOR', programme: 'IBA',  specialisation: 'GLOBAL_MANAGEMENT',   count: 12 },
  { level: 'BACHELOR', programme: 'IBA',  specialisation: 'FINANCE',             count: 11 },
  { level: 'BACHELOR', programme: 'DIGI', specialisation: null,                  count: 20 },
  { level: 'MASTER',   programme: 'MBA',  specialisation: null,                  count: 22 },
  { level: 'MASTER',   programme: 'MDBA', specialisation: null,                  count: 20 },
  { level: 'MASTER',   programme: 'MEBI', specialisation: null,                  count: 20 },
  { level: 'MASTER',   programme: 'DGOV', specialisation: null,                  count: 18 },
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

async function main() {
  console.log('🌱 Starting seed…')

  // Clear existing data
  await prisma.match.deleteMany()
  await prisma.preference.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.semester.deleteMany()
  await prisma.user.deleteMany()

  console.log('🗑  Cleared existing data')

  const defaultPassword = await hash('test1234', 10)

  // ── Create admin ────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: 'Admin BFH',
      email: 'admin@bfh.ch',
      password: defaultPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin created: admin@bfh.ch / test1234')

  // ── Create 80 lecturers ─────────────────────────────────────────────────────
  const lecturers: any[] = []
  const emailCounts: Record<string, number> = {}
  nameCounter = 0

  for (let i = 0; i < 80; i++) {
    const female = i % 3 === 0
    const { first, last } = nextName(female)
    const baseEmail = emailify(first, last, 'bfh.ch', 0)
    const key = `${first}.${last}`.toLowerCase()
    emailCounts[key] = (emailCounts[key] ?? 0) + 1
    const email = emailCounts[key] > 1 ? emailify(first, last, 'bfh.ch', emailCounts[key] - 1) : baseEmail

    const lec = await prisma.user.create({
      data: {
        name: `${first} ${last}`,
        email,
        password: defaultPassword,
        role: 'LECTURER',
      },
    })
    lecturers.push(lec)
  }
  console.log(`✅ Created ${lecturers.length} lecturers`)

  // ── Create 200 students ─────────────────────────────────────────────────────
  const students: any[] = []
  let studentIdCounter = 24001
  nameCounter = 0

  for (const dist of STUDENT_DIST) {
    for (let i = 0; i < dist.count; i++) {
      const female = i % 2 === 0
      const { first, last } = nextName(female)
      const baseEmail = emailify(first, last, 'students.bfh.ch', 0)
      const key = `${first}.${last}`.toLowerCase()
      emailCounts[key] = (emailCounts[key] ?? 0) + 1
      const email = emailCounts[key] > 1 ? emailify(first, last, 'students.bfh.ch', emailCounts[key] - 1) : baseEmail

      const student = await prisma.user.create({
        data: {
          name: `${first} ${last}`,
          email,
          password: defaultPassword,
          role: 'STUDENT',
          level: dist.level,
          programme: dist.programme,
          specialisation: dist.specialisation,
          studentId: `BFH${studentIdCounter++}`,
        },
      })
      students.push(student)
    }
  }
  console.log(`✅ Created ${students.length} students`)

  // ── Create active semester ──────────────────────────────────────────────────
  const now = new Date()
  const lecturerDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)  // +14 days
  const studentDeadline  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)  // +30 days

  const semester = await prisma.semester.create({
    data: {
      name: 'HS 2025/26',
      lecturerDeadline,
      studentDeadline,
      isActive: true,
    },
  })
  console.log(`✅ Created active semester: ${semester.name}`)

  // ── Create topics ───────────────────────────────────────────────────────────
  const topicDefs: { titles: string[]; level: string; programmes: string[]; specs: string[] | null }[] = [
    { titles: BBA_TOPICS,  level: 'BACHELOR', programmes: ['BBA'],        specs: ['MARKETING','FINANCE','GLOBAL_MANAGEMENT','SUSTAINABLE_BUSINESS'] },
    { titles: IBA_TOPICS,  level: 'BACHELOR', programmes: ['IBA'],        specs: ['MARKETING','GLOBAL_MANAGEMENT','FINANCE'] },
    { titles: DIGI_TOPICS, level: 'BACHELOR', programmes: ['DIGI'],       specs: null },
    { titles: MBA_TOPICS,  level: 'MASTER',   programmes: ['MBA'],        specs: null },
    { titles: MDBA_TOPICS, level: 'MASTER',   programmes: ['MDBA'],      specs: null },
    { titles: MEBI_TOPICS, level: 'MASTER',   programmes: ['MEBI'],      specs: null },
    { titles: DGOV_TOPICS, level: 'MASTER',   programmes: ['DGOV'],      specs: null },
  ]

  // Distribute 230 topics among 80 lecturers
  // Each lecturer gets roughly 2-3 topics; max student capacity per lecturer = 8
  let topicCount = 0
  const lecturerCapacity: Record<string, number> = {}
  lecturers.forEach(l => { lecturerCapacity[l.id] = 0 })

  const allTopics: any[] = []

  for (const def of topicDefs) {
    for (let ti = 0; ti < def.titles.length; ti++) {
      const title = def.titles[ti]

      // Pick a lecturer with capacity remaining
      const available = lecturers.filter(l => lecturerCapacity[l.id] < 8)
      if (available.length === 0) break

      const lecturer = pick(available)
      const remainingCap = 8 - lecturerCapacity[lecturer.id]
      const maxStudents = Math.min(remainingCap, pick([1, 1, 2, 2, 2, 3]))

      const methods = def.level === 'BACHELOR' ? BACHELOR_METHODS : MASTER_METHODS
      const method = pick(methods)
      const language = pick(LANGUAGES)

      // Assign specialisations (bachelor only, subset)
      let specialisations: string[] = []
      if (def.specs) {
        // Some topics apply to all specs, some to a subset
        specialisations = Math.random() > 0.4 ? [] : pickN(def.specs, Math.ceil(Math.random() * def.specs.length))
      }

      // Some bachelor topics span multiple programmes
      let programmes = [...def.programmes]
      if (def.level === 'BACHELOR' && Math.random() > 0.7) {
        const others = ['BBA','IBA','DIGI'].filter(p => !programmes.includes(p))
        if (others.length > 0) programmes.push(pick(others))
      }

      const topic = await prisma.topic.create({
        data: {
          title,
          description: `Research thesis examining ${title.toLowerCase()}. Expected scope: one semester, primary research methodology: ${method.replace(/_/g,' ').toLowerCase()}.`,
          method,
          language,
          level: def.level,
          programmes: JSON.stringify(programmes),
          specialisations: JSON.stringify(specialisations),
          maxStudents,
          lecturerId: lecturer.id,
          semesterId: semester.id,
        },
      })
      allTopics.push(topic)
      lecturerCapacity[lecturer.id] += maxStudents
      topicCount++
      if (topicCount >= 230) break
    }
    if (topicCount >= 230) break
  }

  // Fill remaining topics if < 230 by mixing programmes
  const crossProgramme = [
    { title: 'Sustainability Reporting Under New EU CSRD Directive', level: 'BACHELOR', programmes: ['BBA','IBA'], specs: ['SUSTAINABLE_BUSINESS','FINANCE'], method: 'QUALITATIVE' },
    { title: 'AI Governance Frameworks in Swiss Financial Services', level: 'MASTER', programmes: ['MBA','MDBA','DGOV'], specs: null, method: 'DESIGN_SCIENCE_RESEARCH' },
    { title: 'Net Zero Transition Plans: Corporate Strategy', level: 'MASTER', programmes: ['MBA','MEBI'], specs: null, method: 'QUANTITATIVE' },
    { title: 'Digital Platforms and Market Concentration: Regulatory Perspective', level: 'MASTER', programmes: ['MDBA','DGOV'], specs: null, method: 'QUALITATIVE' },
    { title: 'Impact Measurement in Social Enterprises', level: 'BACHELOR', programmes: ['BBA','IBA'], specs: ['SUSTAINABLE_BUSINESS'], method: 'MIXED' },
    { title: 'Customer Experience Transformation Using AI', level: 'BACHELOR', programmes: ['BBA','DIGI'], specs: ['MARKETING'], method: 'DESIGN_SCIENCE_RESEARCH' },
    { title: 'Swiss Labour Market Digitalisation: Displacement or Augmentation?', level: 'BACHELOR', programmes: ['BBA','IBA','DIGI'], specs: null, method: 'QUANTITATIVE' },
    { title: 'Fintech Regulation: Proportionality and Innovation', level: 'MASTER', programmes: ['MBA','MDBA'], specs: null, method: 'QUALITATIVE' },
  ]

  for (const cross of crossProgramme) {
    if (topicCount >= 230) break
    const available = lecturers.filter(l => lecturerCapacity[l.id] < 8)
    if (available.length === 0) break
    const lecturer = pick(available)
    const remainingCap = 8 - lecturerCapacity[lecturer.id]
    const maxStudents = Math.min(remainingCap, 2)
    const method = cross.method === 'MIXED' ? 'QUALITATIVE' : cross.method

    const topic = await prisma.topic.create({
      data: {
        title: cross.title,
        description: `Cross-disciplinary research topic: ${cross.title}.`,
        method,
        language: pick(LANGUAGES),
        level: cross.level,
        programmes: JSON.stringify(cross.programmes),
        specialisations: JSON.stringify(cross.specs ?? []),
        maxStudents,
        lecturerId: lecturer.id,
        semesterId: semester.id,
      },
    })
    allTopics.push(topic)
    lecturerCapacity[lecturer.id] += maxStudents
    topicCount++
  }

  console.log(`✅ Created ${topicCount} topics`)

  // ── Create preferences for ~160 students ───────────────────────────────────
  // Simulate real data: most students have submitted, some haven't
  let prefStudentCount = 0
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

  for (const student of students) {
    // 80% of students have submitted preferences
    if (Math.random() > 0.8) continue

    const level = student.level
    const programme = student.programme

    // Filter compatible topics
    const compatibleTopics = allTopics.filter(t => {
      if (t.level !== level) return false
      const progs: string[] = JSON.parse(t.programmes)
      if (!progs.includes(programme)) return false
      if (student.specialisation) {
        const specs: string[] = JSON.parse(t.specialisations)
        if (specs.length > 0 && !specs.includes(student.specialisation)) return false
      }
      return true
    })

    if (compatibleTopics.length < 2) continue

    // Pick 2-4 topics
    const numPrefs = 2 + Math.floor(Math.random() * 3) // 2, 3, or 4
    const chosen = pickN(compatibleTopics, numPrefs)

    // Priority date: 1-20 days ago
    const priorityDate = daysAgo(Math.floor(Math.random() * 20) + 1)

    for (let rank = 0; rank < chosen.length; rank++) {
      await prisma.preference.create({
        data: {
          studentId: student.id,
          topicId: chosen[rank].id,
          semesterId: semester.id,
          rank: rank + 1,
          priorityDate,
        },
      })
    }
    prefStudentCount++
  }

  console.log(`✅ Created preferences for ${prefStudentCount} students`)

  // ── Summary ─────────────────────────────────────────────────────────────────
  const [userCount, lecturerCount, studentCount, topicFinal, prefCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'LECTURER' } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.topic.count(),
    prisma.preference.count(),
  ])

  console.log('\n📊 Seed Summary:')
  console.log(`   Users: ${userCount} (${lecturerCount} lecturers, ${studentCount} students, 1 admin)`)
  console.log(`   Topics: ${topicFinal}`)
  console.log(`   Preferences: ${prefCount}`)
  console.log(`   Active semester: ${semester.name}`)
  console.log('\n🔑 Test login credentials (all passwords: test1234)')
  console.log('   Admin:    admin@bfh.ch')
  console.log('   Lecturer: ' + lecturers[0].email)
  console.log('   Student:  ' + students[0].email)
  console.log('\n✅ Seed complete!')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
