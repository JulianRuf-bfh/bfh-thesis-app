export type GradingCriterion = {
  id: string
  part: 'written' | 'oral'
  name: string
  weightPercent: number
  killerCriterion: boolean
  indicatorsBsc: string
  indicatorsMsc: string
}

export type AolDimension = {
  id: string
  label: string
  criteria: { name: string; score0: string; score1: string; score2: string }[]
  maxScore: number
  thresholdNA: number   // < this = Not Achieved
  thresholdWA: number   // >= this (and no zeros) = Well Achieved
}

export const GRADING_CRITERIA: GradingCriterion[] = [
  {
    id: 'S1',
    part: 'written',
    name: 'Fragestellung / Problemstellung / Thesen',
    weightPercent: 4,
    killerCriterion: false,
    indicatorsBsc:
      'Klare, operationalisierbare und beantwortbare Forschungsfrage formuliert; praktische Relevanz der Fragestellung ausgewiesen.',
    indicatorsMsc:
      'Klare, operationalisierbare und beantwortbare Forschungsfrage formuliert; praktische Relevanz ausgewiesen; theoretische Relevanz/Forschungslücke explizit dargelegt.',
  },
  {
    id: 'S2',
    part: 'written',
    name: 'Literaturteil / Theoretical Background',
    weightPercent: 10,
    killerCriterion: false,
    indicatorsBsc:
      'Relevante Theorien, Konzepte und Begriffe definiert und Auswahl begründet (qualitativ hochwertige Fachliteratur, inkl. peer-reviewte Studien); Konzepte bei Bedarf kontextualisiert; verwandte/vergleichbare Arbeiten recherchiert und strukturiert zusammengefasst; (optional) Forschungslücke ausgewiesen; bei quantitativen Arbeiten Hypothesen aus Literatur abgeleitet.',
    indicatorsMsc:
      'Relevante Theorien, Konzepte und Begriffe definiert und Auswahl forschungsfragerelevant begründet (alle später empirisch geprüften Konzepte eingeführt); systematische Literatursuche dokumentiert; Qualitätskriterien beachtet; integrative Synthese erstellt; bei quantitativen Arbeiten Hypothesen theoriegeleitet abgeleitet.',
  },
  {
    id: 'S3',
    part: 'written',
    name: 'Forschungsdesign / Methodisches Vorgehen',
    weightPercent: 4,
    killerCriterion: false,
    indicatorsBsc:
      'Forschungsansatz (qualitativ/quantitativ/design science/mixed) begründet; angemessenes Forschungsdesign (inkl. Erhebungs- und Auswertungsmethoden) strukturiert beschrieben; Eignung zur Beantwortung der Forschungsfrage plausibilisiert.',
    indicatorsMsc:
      'Forschungsansatz (qualitativ/quantitativ/mixed) begründet; angemessenes Forschungsdesign (inkl. Erhebungs- und Auswertungsmethoden) begründet; Eignung zur Beantwortung der Forschungsfrage plausibilisiert.',
  },
  {
    id: 'S4',
    part: 'written',
    name: 'Datenerhebung',
    weightPercent: 7,
    killerCriterion: false,
    indicatorsBsc:
      'Erhebungsinstrumente vollständig dokumentiert (z. B. Leitfaden, Fragebogen, Beobachtungsbogen); Ethikstandards eingehalten (informierte Einwilligung, Datenschutz/Anonymisierung); potenzielle Bias reflektiert (z. B. Sample-Bias, Non-Response, Interviewereffekte); Stichprobe transparent beschrieben; Instrumente im Anhang abgelegt. → Detaillierte methodenspezifische Indikatoren gemäss Methodendetails-Tabelle.',
    indicatorsMsc:
      'Erhebungsinstrumente vollständig dokumentiert (z. B. Leitfaden, Fragebogen, Beobachtungsbogen); Ethikstandards eingehalten (informierte Einwilligung, Datenschutz/Anonymisierung); potenzielle Bias reflektiert (z. B. Sample-Bias, Non-Response, Interviewereffekte); Stichprobe transparent beschrieben; Instrumente im Anhang abgelegt. → Detaillierte methodenspezifische Indikatoren gemäss Methodendetails-Tabelle.',
  },
  {
    id: 'S5',
    part: 'written',
    name: 'Datenauswertung',
    weightPercent: 7,
    killerCriterion: false,
    indicatorsBsc:
      'Analysevorgehen klar beschrieben; Konsistenz zwischen Forschungsfrage, Daten und Verfahren gegeben; Aufbereitung/Bereinigung dokumentiert; Ergebnisse angemessen visualisiert/berichtet; Interpretation nachvollziehbar. → Detaillierte methodenspezifische Indikatoren gemäss Methodendetails-Tabelle.',
    indicatorsMsc:
      'Analysevorgehen klar beschrieben; Konsistenz zwischen Forschungsfrage, Daten und Verfahren gegeben; Aufbereitung/Bereinigung dokumentiert; Ergebnisse angemessen visualisiert/berichtet; Interpretation nachvollziehbar. → Detaillierte methodenspezifische Indikatoren gemäss Methodendetails-Tabelle.',
  },
  {
    id: 'S6',
    part: 'written',
    name: 'Ergebnisse & Diskussion',
    weightPercent: 14,
    killerCriterion: false,
    indicatorsBsc:
      'Zentrale Ergebnisse prägnant dargestellt; Theoriebeitrag/Implikationen erläutert (Rückbezug auf Literatur); praktische Implikationen zielgruppengerecht abgeleitet; Limitationen benannt, die helfen zu verstehen, die Relevanz und Gültigkeit der Ergebnisse abzuschätzen; Hinweise für weitere Forschung gegeben.',
    indicatorsMsc:
      'Zentrale Ergebnisse prägnant dargestellt; Theoriebeitrag/Implikationen erläutert (Rückbezug auf Literatur); praktische Implikationen zielgruppengerecht abgeleitet; Limitationen benannt, die helfen zu verstehen, die Relevanz und Gültigkeit der Ergebnisse abzuschätzen; Hinweise für weitere Forschung gegeben.',
  },
  {
    id: 'S7',
    part: 'written',
    name: 'Formale Anforderungen inkl. KI',
    weightPercent: 4,
    killerCriterion: true,
    indicatorsBsc:
      'Formale Vorgaben gemäss Merkblatt eingehalten (bspw. Seitenrichtwerte); Einen Zitierstil (bspw. APA, Harvard) gewählt und konsequent verwendet; Quellen vollständig und überprüfbar (verpflichtend DOI, falls vorhanden); sprachliche Qualität (verständlich, zusammenhängend, präzise, wissenschaftlich); Ethik gemäss Richtlinien zur wissenschaftlichen Integrität eingehalten; KI-Einsatz gemäss Richtlinien transparent.',
    indicatorsMsc:
      'Formale Vorgaben gemäss Merkblatt eingehalten (bspw. Seitenrichtwerte); Einen Zitierstil (bspw. APA, Harvard) gewählt und konsequent verwendet; Quellen vollständig und überprüfbar (verpflichtend DOI, falls vorhanden); sprachliche Qualität (verständlich, zusammenhängend, präzise, wissenschaftlich); Ethik gemäss Richtlinien zur wissenschaftlichen Integrität eingehalten; KI-Einsatz gemäss Richtlinien transparent.',
  },
  {
    id: 'M1',
    part: 'oral',
    name: 'Präsentation der Thesis',
    weightPercent: 10,
    killerCriterion: false,
    indicatorsBsc:
      'Zentrale Botschaften klar präsentiert; logische Struktur; stringente Argumentation; entscheidungsrelevante Schritte im Forschungs-/Arbeitsprozess nachvollziehbar begründet; angemessene Präsentationstechniken (Haltung, Gestik, Stimme, technische Hilfsmittel); Zielgruppenorientierung.',
    indicatorsMsc:
      'Zentrale Botschaften klar präsentiert; logische Struktur; stringente Argumentation; entscheidungsrelevante Schritte im Forschungs-/Arbeitsprozess nachvollziehbar begründet; angemessene Präsentationstechniken (Haltung, Gestik, Stimme, technische Hilfsmittel); Zielgruppenorientierung.',
  },
  {
    id: 'M2',
    part: 'oral',
    name: 'Verteidigung der Thesis',
    weightPercent: 40,
    killerCriterion: false,
    indicatorsBsc:
      'Fachliche, methodische und theoretische Fragen präzise beantwortet; Grenzen/Limitierungen und Stärken reflektiert; konstruktiver Umgang mit Rückfragen; Beitrag im thematischen Kontext klar positioniert; Arbeitsprozess und Umgang mit Herausforderungen kritisch reflektiert.',
    indicatorsMsc:
      'Fachliche, methodische und theoretische Fragen präzise beantwortet; Grenzen/Limitierungen und Stärken reflektiert; konstruktiver Umgang mit Rückfragen; Beitrag im thematischen Kontext klar positioniert; Arbeitsprozess und Umgang mit Herausforderungen kritisch reflektiert.',
  },
]

export const WRITTEN_CRITERIA = GRADING_CRITERIA.filter(c => c.part === 'written')
export const ORAL_CRITERIA    = GRADING_CRITERIA.filter(c => c.part === 'oral')

export const SCORE_STEPS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]

/** Color class for a score button (selected state) */
export function scoreColor(score: number): string {
  if (score <= 3.5) return 'bg-red-600 text-white border-red-600'
  if (score <= 3.9) return 'bg-amber-500 text-white border-amber-500'
  if (score <= 4.5) return 'bg-yellow-500 text-white border-yellow-500'
  return 'bg-green-600 text-white border-green-600'
}

/** Color class for unselected score button hover */
export function scoreHoverColor(score: number): string {
  if (score <= 3.5) return 'hover:bg-red-50 hover:border-red-400 hover:text-red-700'
  if (score <= 3.9) return 'hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700'
  if (score <= 4.5) return 'hover:bg-yellow-50 hover:border-yellow-400 hover:text-yellow-700'
  return 'hover:bg-green-50 hover:border-green-400 hover:text-green-700'
}

/**
 * Compute the final grade summary from a grading map.
 * scores: { criterionId: score (1.0–6.0 or null) }
 */
export function computeGrade(scores: Record<string, number | null>) {
  let writtenSum = 0
  let oralSum    = 0
  let writtenAllSet = true
  let oralAllSet    = true

  for (const c of GRADING_CRITERIA) {
    const s = scores[c.id] ?? null
    if (s === null) {
      if (c.part === 'written') writtenAllSet = false
      else oralAllSet = false
      continue
    }
    const wp = (s / 6) * (c.weightPercent / 100)
    if (c.part === 'written') writtenSum += wp
    else oralSum += wp
  }

  const totalFulfillment = writtenSum + oralSum
  const finalGrade = Math.round((1 + totalFulfillment * 5) * 10) / 10

  // Pass thresholds: each part's weighted sum must be > 1/3 * 0.5 ≈ 0.1667*2 = 0.3333
  // Written part: sum of (score/6 * weight/100) > 0.3333  (equivalent to avg score >= 4/6 across the 50%)
  const writtenPassed = writtenSum > 0.3333
  const oralPassed    = oralSum > 0.3333
  const gradePassed   = finalGrade >= 4.0
  const passed        = gradePassed && writtenPassed && oralPassed

  return {
    writtenSum,
    oralSum,
    totalFulfillment,
    finalGrade,
    writtenPassed,
    oralPassed,
    gradePassed,
    passed,
    allSet: writtenAllSet && oralAllSet,
  }
}

export const AOL_DIMENSIONS: AolDimension[] = [
  {
    id: 'LG_1_1',
    label: 'LG 1.1 – General Skills',
    maxScore: 8,
    thresholdNA: 4,
    thresholdWA: 7,
    criteria: [
      {
        name: 'Appropriate Concepts & Methods',
        score0: 'It\'s not discernible which concepts/methods students use in their thesis.',
        score1: 'Concepts/methods used in the thesis are mainly discernible.',
        score2: 'The use of concepts/methods is evident and state of the art.',
      },
      {
        name: 'Justification for Selection',
        score0: 'There is no justification for the selection of a given concept/method.',
        score1: 'Justification for the selection of a given concept/method is for the most part available.',
        score2: 'Justification for the selection of concepts and methods is clear, concise, and comprehensible.',
      },
      {
        name: 'Application',
        score0: 'Concepts/methods are not applied appropriately.',
        score1: 'Concepts and methods are applied appropriately with minor issues in adaptation.',
        score2: 'Concepts and methods are applied perfectly and adaptations are suitable.',
      },
      {
        name: 'Conclusions',
        score0: 'Conclusions are not drawn correctly or do not relate to the business challenge.',
        score1: 'Conclusions are drawn correctly but could relate more closely to the business challenge.',
        score2: 'Conclusions are drawn correctly and relate directly and meaningfully to the business challenge.',
      },
    ],
  },
  {
    id: 'LG_4_1',
    label: 'LG 4.1 – Data Literacy',
    maxScore: 10,
    thresholdNA: 6,
    thresholdWA: 8,
    criteria: [
      {
        name: 'Scientific Ethics',
        score0: 'Scientific ethical standards were not sufficiently met (data protection, digital safety, declaration of consent, accuracy of data, etc.).',
        score1: 'Scientific ethical standards were mostly met.',
        score2: 'Scientific ethical standards were fully met.',
      },
      {
        name: 'Data Communication',
        score0: 'Data are hardly communicated using appropriate presentation or visualization.',
        score1: 'Data are partially communicated using appropriate presentation or visualization.',
        score2: 'Data are well communicated using appropriate presentation or visualization.',
      },
      {
        name: 'Data Analysis',
        score0: 'The analysis of data is barely noticeable, with little to no use of suitable methods and techniques.',
        score1: 'Data are analyzed to some extent, with mostly appropriate methods and techniques.',
        score2: 'Data are effectively analyzed using fully appropriate methods and techniques.',
      },
      {
        name: 'Quality of Data',
        score0: 'The quality of the data is not or hardly evaluated.',
        score1: 'The quality of the data is partially evaluated.',
        score2: 'The quality of the data is comprehensively evaluated.',
      },
      {
        name: 'Interpretation of Data',
        score0: 'The data interpretation lacks the necessary objectivity and grounding.',
        score1: 'The interpretation is objective and generally founded, but with minor errors or omissions.',
        score2: 'The interpretation is highly objective, well-founded, and thorough, demonstrating deep understanding.',
      },
    ],
  },
  {
    id: 'LO_5_1',
    label: 'LO 5.1 – Oral Communication',
    maxScore: 10,
    thresholdNA: 6,
    thresholdWA: 8,
    criteria: [
      {
        name: 'Central Messages',
        score0: 'The central messages are hardly presented.',
        score1: 'The central messages are mostly presented.',
        score2: 'The central messages are presented with supporting evidence and examples.',
      },
      {
        name: 'Structure',
        score0: 'The structure is unclear and difficult to follow.',
        score1: 'The structure is mostly clear and comprehensible.',
        score2: 'The structure is clear and effectively guides the audience.',
      },
      {
        name: 'Argumentation',
        score0: 'The argumentation is hardly recognizable.',
        score1: 'The argumentation is only in parts recognizable.',
        score2: 'The argumentation is fully comprehensive.',
      },
      {
        name: 'Delivery Techniques',
        score0: 'Delivery techniques do not support the understandability of the messages.',
        score1: 'Delivery techniques mostly support the understandability of the messages.',
        score2: 'Delivery techniques effectively support the understandability of the messages.',
      },
      {
        name: 'Audience',
        score0: 'The presentation is not adapted to the needs and expectations of the audience.',
        score1: 'The presentation is partially adapted to the needs and expectations of the audience.',
        score2: 'The presentation is expertly adapted to the needs and expectations of the audience.',
      },
    ],
  },
  {
    id: 'LO_5_2',
    label: 'LO 5.2 – Written Communication',
    maxScore: 10,
    thresholdNA: 6,
    thresholdWA: 8,
    criteria: [
      {
        name: 'Focuses',
        score0: 'Focuses are not or hardly set and formulated.',
        score1: 'Focuses are partially set and formulated.',
        score2: 'Focuses are set and formulated clearly and precisely.',
      },
      {
        name: 'Use of Language',
        score0: 'The language used is not or hardly technically correct, comprehensible and appropriate to the context.',
        score1: 'The language used is partially technically correct and comprehensible.',
        score2: 'The language used is technically correct, comprehensible and appropriate to the context.',
      },
      {
        name: 'AI Tools',
        score0: 'The use of AI tools is not or hardly described and documented.',
        score1: 'The use of AI tools is partially described and documented.',
        score2: 'The use of AI tools is described and documented.',
      },
      {
        name: 'Citation',
        score0: 'Sources are not appropriately and accurately documented.',
        score1: 'Sources are mostly appropriately and accurately documented.',
        score2: 'Sources are documented appropriately and accurately, as expected of a scientific professional.',
      },
      {
        name: 'Arrangement',
        score0: 'The work is not or hardly arranged in a clear and coherent manner.',
        score1: 'The work is arranged in most parts in a clear and coherent manner.',
        score2: 'The work is arranged in a clear and coherent manner.',
      },
    ],
  },
]

export function computeAolLevel(
  dim: AolDimension,
  scores: (number | null)[],
): 'NOT_ACHIEVED' | 'ACHIEVED' | 'WELL_ACHIEVED' | null {
  const filled = scores.filter(s => s !== null) as number[]
  if (filled.length < dim.criteria.length) return null
  const total  = filled.reduce((a, b) => a + b, 0)
  const hasZero = filled.some(s => s === 0)
  if (total < dim.thresholdNA)  return 'NOT_ACHIEVED'
  if (total >= dim.thresholdWA && !hasZero) return 'WELL_ACHIEVED'
  return 'ACHIEVED'
}
