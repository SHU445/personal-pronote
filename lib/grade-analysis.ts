/**
 * Grade Analysis - Analyse et simulation des notes
 * 
 * Ce module fournit les outils pour analyser les notes,
 * calculer les tendances, et simuler l'impact de futures notes.
 */

import type {
  Note,
  Moyenne,
  SubjectAnalysis,
  GradeSimulation,
} from '@/types/pronote'

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Parse une note (gère les formats "12,5" et "12.5")
 */
export function parseNote(note: string): number | null {
  if (!note || note === 'Absent' || note === 'Dispensé' || note === 'NonNoté' || note === 'N.Not') {
    return null
  }
  const parsed = parseFloat(note.replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

/**
 * Normalise le nom d'une matière
 */
export function normalizeSubject(matiere: string): string {
  return matiere.split(' > ')[0].trim().toUpperCase()
}

/**
 * Calcule la moyenne pondérée d'un ensemble de notes
 */
export function calculateWeightedAverage(
  notes: { note: number; coefficient: number; bareme: number }[]
): number | null {
  if (notes.length === 0) return null
  
  let totalWeighted = 0
  let totalCoef = 0
  
  for (const n of notes) {
    // Ramener la note sur 20
    const noteOn20 = (n.note / n.bareme) * 20
    totalWeighted += noteOn20 * n.coefficient
    totalCoef += n.coefficient
  }
  
  if (totalCoef === 0) return null
  return totalWeighted / totalCoef
}

/**
 * Calcule la moyenne générale à partir des moyennes par matière
 */
export function calculateGeneralAverage(moyennes: Moyenne[]): number | null {
  const validMoyennes = moyennes
    .map(m => parseNote(m.moyenne_eleve))
    .filter((n): n is number => n !== null)
  
  if (validMoyennes.length === 0) return null
  return validMoyennes.reduce((a, b) => a + b, 0) / validMoyennes.length
}

// ==========================================
// ANALYSE DES TENDANCES (v2 - pondération par récence)
// ==========================================

/**
 * Calcule la tendance d'une série de notes
 * Utilise une régression linéaire PONDÉRÉE où les notes récentes ont plus de poids
 * 
 * Formule de pondération : poids[i] = 1 + 0.3 * i (ordre chronologique)
 * - Note la plus ancienne (i=0) : poids 1.0
 * - Note la plus récente (i=n-1) : poids 1 + 0.3*(n-1)
 * 
 * Cela permet de mieux détecter les changements de trajectoire récents.
 */
export function calculateTrend(
  notes: { note: number; date: string; bareme: number }[]
): 'up' | 'down' | 'stable' | 'unknown' {
  if (notes.length < 2) return 'unknown'
  
  // Trier par date croissante (ancienne → récente)
  const sorted = [...notes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // Normaliser toutes les notes sur 20
  const normalizedNotes = sorted.map(n => (n.note / n.bareme) * 20)
  const n = normalizedNotes.length
  
  // Calculer les poids croissants (récence)
  // poids[i] = 1 + 0.3 * i
  const weights = normalizedNotes.map((_, i) => 1 + 0.3 * i)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  
  // Moyennes pondérées de x et y
  let xWeightedSum = 0
  let yWeightedSum = 0
  for (let i = 0; i < n; i++) {
    xWeightedSum += weights[i] * i
    yWeightedSum += weights[i] * normalizedNotes[i]
  }
  const xWeightedMean = xWeightedSum / totalWeight
  const yWeightedMean = yWeightedSum / totalWeight
  
  // Régression linéaire pondérée
  // slope = Σ(w_i * (x_i - x̄) * (y_i - ȳ)) / Σ(w_i * (x_i - x̄)²)
  let numerator = 0
  let denominator = 0
  
  for (let i = 0; i < n; i++) {
    const w = weights[i]
    const xDiff = i - xWeightedMean
    const yDiff = normalizedNotes[i] - yWeightedMean
    numerator += w * xDiff * yDiff
    denominator += w * xDiff * xDiff
  }
  
  if (denominator === 0) return 'stable'
  
  const slope = numerator / denominator
  
  // Seuils ajustés pour la pondération (légèrement plus sensibles)
  // slope > 0.4 → hausse, slope < -0.4 → baisse
  if (slope > 0.4) return 'up'
  if (slope < -0.4) return 'down'
  return 'stable'
}

// ==========================================
// ANALYSE PAR MATIÈRE
// ==========================================

/**
 * Analyse complète d'une matière
 */
export function analyzeSubject(
  matiere: string,
  allNotes: Note[],
  moyennes: Moyenne[],
  targetAverage: number = 16
): SubjectAnalysis | null {
  const normalizedMatiere = normalizeSubject(matiere)
  
  // Trouver la moyenne de cette matière
  const moyenneData = moyennes.find(
    m => normalizeSubject(m.matiere) === normalizedMatiere
  )
  
  // Trouver toutes les notes de cette matière
  const subjectNotes = allNotes.filter(
    n => normalizeSubject(n.matiere) === normalizedMatiere
  )
  
  // Parser les notes
  const parsedNotes: { note: number; date: string; bareme: number; coefficient: number }[] = []
  for (const n of subjectNotes) {
    const noteVal = parseNote(n.note)
    const baremeVal = parseNote(n.bareme) || 20
    if (noteVal !== null) {
      parsedNotes.push({
        note: noteVal,
        date: n.date,
        bareme: baremeVal,
        coefficient: n.coefficient || 1,
      })
    }
  }
  
  // Calculer la moyenne élève
  const moyenneEleve = moyenneData 
    ? parseNote(moyenneData.moyenne_eleve)
    : calculateWeightedAverage(parsedNotes)
  
  const moyenneClasse = moyenneData ? parseNote(moyenneData.moyenne_classe) : null
  
  // Calculer les écarts
  const ecartCible = moyenneEleve !== null ? moyenneEleve - targetAverage : null
  const ecartClasse = moyenneEleve !== null && moyenneClasse !== null 
    ? moyenneEleve - moyenneClasse 
    : null
  
  // Calculer la tendance
  const trend = calculateTrend(parsedNotes.map(n => ({
    note: n.note,
    date: n.date,
    bareme: n.bareme,
  })))
  
  // Déterminer si la matière nécessite de l'attention
  const needsAttention = (
    (ecartCible !== null && ecartCible < -2) ||
    trend === 'down' ||
    (moyenneEleve !== null && moyenneEleve < 10)
  )
  
  // Déterminer la priorité
  let priority: 'high' | 'medium' | 'low' = 'low'
  if (moyenneEleve !== null) {
    if (moyenneEleve < 10 || (ecartCible !== null && ecartCible < -4)) {
      priority = 'high'
    } else if (moyenneEleve < 14 || trend === 'down') {
      priority = 'medium'
    }
  }
  
  // Coefficient estimé (basé sur le type de matière)
  const coefficient = estimateSubjectCoefficient(normalizedMatiere)
  
  return {
    matiere: normalizedMatiere,
    moyenneEleve,
    moyenneClasse,
    ecartCible,
    ecartClasse,
    trend,
    coefficient,
    lastNotes: parsedNotes.slice(-5).map(n => ({
      note: n.note,
      date: n.date,
      bareme: n.bareme,
    })),
    needsAttention,
    priority,
  }
}

/**
 * Estime le coefficient d'une matière (pour le bac)
 */
function estimateSubjectCoefficient(matiere: string): number {
  const coefficients: Record<string, number> = {
    'MATHEMATIQUES': 16,
    'PHYSIQUE-CHIMIE': 16,
    'PHYS-CHIMIE TECHNO': 16,
    'MATHS TECHNO': 16,
    'INGEN.INNOV.DEV.DUR.': 16,
    'PHILOSOPHIE': 4,
    'HISTOIRE-GEOGRAPHIE': 6,
    'ANGLAIS LV1': 6,
    'ESPAGNOL LV2': 6,
    'ED.PHYSIQUE & SPORT.': 6,
    'ENS. MORAL & CIVIQUE': 2,
    'ENS. TECH. LV': 4,
  }
  
  return coefficients[matiere] || 4
}

/**
 * Analyse toutes les matières et retourne une Map
 */
export function analyzeAllSubjects(
  notes: Note[],
  moyennes: Moyenne[],
  targetAverage: number = 16
): Map<string, SubjectAnalysis> {
  const analyses = new Map<string, SubjectAnalysis>()
  
  // Collecter toutes les matières uniques
  const subjects = new Set<string>()
  moyennes.forEach(m => subjects.add(normalizeSubject(m.matiere)))
  notes.forEach(n => subjects.add(normalizeSubject(n.matiere)))
  
  // Analyser chaque matière
  subjects.forEach(subject => {
    const analysis = analyzeSubject(subject, notes, moyennes, targetAverage)
    if (analysis) {
      analyses.set(subject, analysis)
    }
  })
  
  return analyses
}

// ==========================================
// SIMULATION DE NOTES
// ==========================================

/**
 * Simule l'impact d'une nouvelle note sur les moyennes
 */
export function simulateNewGrade(
  matiere: string,
  newNote: number,
  bareme: number,
  coefficient: number,
  allNotes: Note[],
  moyennes: Moyenne[],
  targetAverage: number = 16
): GradeSimulation | null {
  const normalizedMatiere = normalizeSubject(matiere)
  
  // Trouver l'analyse actuelle
  const currentAnalysis = analyzeSubject(matiere, allNotes, moyennes, targetAverage)
  if (!currentAnalysis || currentAnalysis.moyenneEleve === null) {
    return null
  }
  
  // Collecter toutes les notes existantes de cette matière
  const subjectNotes = allNotes.filter(
    n => normalizeSubject(n.matiere) === normalizedMatiere
  )
  
  const existingNotes: { note: number; coefficient: number; bareme: number }[] = []
  for (const n of subjectNotes) {
    const noteVal = parseNote(n.note)
    const baremeVal = parseNote(n.bareme) || 20
    if (noteVal !== null) {
      existingNotes.push({
        note: noteVal,
        coefficient: n.coefficient || 1,
        bareme: baremeVal,
      })
    }
  }
  
  // Ajouter la nouvelle note
  const allNotesWithNew = [
    ...existingNotes,
    { note: newNote, coefficient, bareme }
  ]
  
  // Calculer la nouvelle moyenne de la matière
  const newSubjectAverage = calculateWeightedAverage(allNotesWithNew)
  if (newSubjectAverage === null) return null
  
  // Calculer l'impact sur la moyenne de la matière
  const subjectImpact = newSubjectAverage - currentAnalysis.moyenneEleve
  
  // Calculer la nouvelle moyenne générale
  const currentGeneralAvg = calculateGeneralAverage(moyennes)
  if (currentGeneralAvg === null) return null
  
  // Simuler la nouvelle moyenne générale
  // (approximation: on remplace l'ancienne moyenne de la matière par la nouvelle)
  const updatedMoyennes = moyennes.map(m => {
    if (normalizeSubject(m.matiere) === normalizedMatiere) {
      return { ...m, moyenne_eleve: newSubjectAverage.toFixed(2) }
    }
    return m
  })
  
  const newGeneralAvg = calculateGeneralAverage(updatedMoyennes)
  if (newGeneralAvg === null) return null
  
  return {
    matiere: normalizedMatiere,
    currentAverage: currentAnalysis.moyenneEleve,
    simulatedNote: newNote,
    bareme,
    coefficient,
    newAverage: newSubjectAverage,
    impact: subjectImpact,
    newGeneralAverage: newGeneralAvg,
    generalImpact: newGeneralAvg - currentGeneralAvg,
  }
}

/**
 * Calcule la note nécessaire pour atteindre une moyenne cible
 */
export function calculateRequiredGrade(
  matiere: string,
  targetSubjectAverage: number,
  coefficient: number,
  bareme: number,
  allNotes: Note[],
  moyennes: Moyenne[]
): number | null {
  const normalizedMatiere = normalizeSubject(matiere)
  
  // Collecter les notes existantes
  const subjectNotes = allNotes.filter(
    n => normalizeSubject(n.matiere) === normalizedMatiere
  )
  
  let totalWeighted = 0
  let totalCoef = 0
  
  for (const n of subjectNotes) {
    const noteVal = parseNote(n.note)
    const baremeVal = parseNote(n.bareme) || 20
    if (noteVal !== null) {
      const noteOn20 = (noteVal / baremeVal) * 20
      totalWeighted += noteOn20 * (n.coefficient || 1)
      totalCoef += n.coefficient || 1
    }
  }
  
  // Calculer la note requise
  // Nouvelle moyenne = (total existant + nouvelle note * coef) / (total coef + coef)
  // target = (totalWeighted + noteOn20 * coefficient) / (totalCoef + coefficient)
  // target * (totalCoef + coefficient) = totalWeighted + noteOn20 * coefficient
  // noteOn20 * coefficient = target * (totalCoef + coefficient) - totalWeighted
  // noteOn20 = (target * (totalCoef + coefficient) - totalWeighted) / coefficient
  
  const requiredOn20 = (targetSubjectAverage * (totalCoef + coefficient) - totalWeighted) / coefficient
  
  // Convertir sur le barème demandé
  const requiredNote = (requiredOn20 / 20) * bareme
  
  // Vérifier que c'est réaliste (entre 0 et le barème)
  if (requiredNote < 0 || requiredNote > bareme) {
    return null // Impossible à atteindre
  }
  
  return Math.round(requiredNote * 100) / 100
}

/**
 * Retourne les matières prioritaires (celles qui nécessitent le plus d'attention)
 */
export function getPrioritySubjects(
  notes: Note[],
  moyennes: Moyenne[],
  targetAverage: number = 16,
  limit: number = 3
): SubjectAnalysis[] {
  const analyses = analyzeAllSubjects(notes, moyennes, targetAverage)
  
  return Array.from(analyses.values())
    .filter(a => a.needsAttention)
    .sort((a, b) => {
      // Trier par priorité puis par écart à la cible
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      const aEcart = a.ecartCible !== null ? Math.abs(a.ecartCible) : 0
      const bEcart = b.ecartCible !== null ? Math.abs(b.ecartCible) : 0
      return bEcart - aEcart
    })
    .slice(0, limit)
}

/**
 * Génère un résumé des performances globales
 */
export function generatePerformanceSummary(
  notes: Note[],
  moyennes: Moyenne[],
  targetAverage: number = 16
): {
  generalAverage: number | null
  targetGap: number | null
  trend: 'up' | 'down' | 'stable' | 'unknown'
  subjectsAboveTarget: number
  subjectsBelowTarget: number
  criticalSubjects: string[]
  excellentSubjects: string[]
} {
  const generalAverage = calculateGeneralAverage(moyennes)
  const targetGap = generalAverage !== null ? generalAverage - targetAverage : null
  
  const analyses = analyzeAllSubjects(notes, moyennes, targetAverage)
  
  let subjectsAboveTarget = 0
  let subjectsBelowTarget = 0
  const criticalSubjects: string[] = []
  const excellentSubjects: string[] = []
  
  analyses.forEach(a => {
    if (a.moyenneEleve !== null) {
      if (a.moyenneEleve >= targetAverage) {
        subjectsAboveTarget++
        if (a.moyenneEleve >= 16) {
          excellentSubjects.push(a.matiere)
        }
      } else {
        subjectsBelowTarget++
        if (a.moyenneEleve < 10) {
          criticalSubjects.push(a.matiere)
        }
      }
    }
  })
  
  // Calculer la tendance globale à partir de toutes les notes récentes
  const allNotesWithDates = notes
    .map(n => {
      const noteVal = parseNote(n.note)
      const baremeVal = parseNote(n.bareme) || 20
      if (noteVal === null) return null
      return { note: noteVal, date: n.date, bareme: baremeVal }
    })
    .filter((n): n is { note: number; date: string; bareme: number } => n !== null)
  
  const trend = calculateTrend(allNotesWithDates)
  
  return {
    generalAverage,
    targetGap,
    trend,
    subjectsAboveTarget,
    subjectsBelowTarget,
    criticalSubjects,
    excellentSubjects,
  }
}
