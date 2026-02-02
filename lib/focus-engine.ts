/**
 * Focus Tonight - Moteur de décision intelligent
 * 
 * Ce module calcule les priorités et génère le plan de travail quotidien.
 * Il prend en compte : urgence, importance, charge, et capacités de l'utilisateur.
 */

import type {
  Devoir,
  Note,
  Moyenne,
  Controle,
  Lesson,
  FocusConfig,
  FocusTask,
  FocusPlan,
  TomorrowPreview,
  PriorityReason,
  TaskType,
  TaskCategory,
  PriorityLevel,
  ScoreComponents,
  SubjectAnalysis,
} from '@/types/pronote'
import { analyzeSubject, calculateGeneralAverage } from './grade-analysis'

// ==========================================
// CONFIGURATION PAR DÉFAUT
// ==========================================

export const DEFAULT_CONFIG: FocusConfig = {
  maxWorkTimePerNight: 90, // 1h30 max par soir
  maxSubjectsPerNight: 3,
  anticipationDays: 7,
  allowWeekendWork: true,
  allowOverloadNights: false,
  targetAverage: 16,
  estimatedTimePerTask: {
    homework: 30,
    exercise: 20,
    revision: 15,
    testPrep: 45,
  },
  testPrepDays: 3,
  subjectPriorities: {},
  disabledRevisionSubjects: [],
}

// ==========================================
// COEFFICIENTS DE MATIÈRES (par importance pour le bac STI2D)
// ==========================================

const SUBJECT_COEFFICIENTS: Record<string, number> = {
  'MATHEMATIQUES': 16,
  'PHYSIQUE-CHIMIE': 16,
  'PHYS-CHIMIE TECHNO': 16,
  'MATHS TECHNO': 16,
  'INGEN.INNOV.DEV.DUR.': 16, // 2I2D
  'PHILOSOPHIE': 4,
  'HISTOIRE-GEOGRAPHIE': 6,
  'ANGLAIS LV1': 6,
  'ESPAGNOL LV2': 6,
  'ED.PHYSIQUE & SPORT.': 6,
  'ENS. MORAL & CIVIQUE': 2,
  'ENS. TECH. LV': 4,
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Normalise le nom d'une matière pour la comparaison
 */
export function normalizeSubject(matiere: string): string {
  return matiere.split(' > ')[0].trim().toUpperCase()
}

/**
 * Récupère le coefficient d'une matière
 */
export function getSubjectCoefficient(matiere: string): number {
  const normalized = normalizeSubject(matiere)
  return SUBJECT_COEFFICIENTS[normalized] || 4
}

/**
 * Calcule le nombre de jours avant une date
 */
export function getDaysUntil(dateString: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateString)
  target.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Vérifie si une date est passée
 */
export function isPastDue(dateString: string): boolean {
  return getDaysUntil(dateString) < 0
}

/**
 * Génère un ID unique
 */
function generateId(): string {
  return `focus-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Estime le temps pour un devoir en fonction de sa description
 */
export function estimateTaskTime(devoir: Devoir, config: FocusConfig): number {
  const description = devoir.description.toLowerCase()
  
  // Détection du type de tâche
  if (description.includes('dm') || description.includes('devoir maison')) {
    return config.estimatedTimePerTask.homework * 1.5
  }
  if (description.includes('révision') || description.includes('réviser') || description.includes('revoir')) {
    return config.estimatedTimePerTask.revision
  }
  if (description.includes('exercice') || description.includes('ex.') || description.includes('ex ')) {
    // Compter le nombre d'exercices mentionnés
    const exerciseCount = (description.match(/ex\.?\s*\d+|exercice\s*n?°?\s*\d+/gi) || []).length
    return Math.max(exerciseCount, 1) * config.estimatedTimePerTask.exercise
  }
  if (description.includes('contrôle') || description.includes('test') || description.includes('ds')) {
    return config.estimatedTimePerTask.testPrep
  }
  if (description.includes('apprendre') || description.includes('leçon')) {
    return config.estimatedTimePerTask.revision
  }
  
  // Par défaut
  return config.estimatedTimePerTask.homework
}

// ==========================================
// SCORING DES TÂCHES (v2 - rééquilibré)
// ==========================================
// 
// Formule v2:
//   SCORE = urgency(30%) + importance(25%) + needsWork(25%) + complexity(10%) + loadAdjustment(±10)
//
// Changements par rapport à v1:
//   - Urgence réduite de 40% à 30% (moins de domination)
//   - Ajout de complexity pour encourager l'anticipation des tâches longues
//   - loadAdjustment peut être négatif (malus surcharge) ou positif (bonus anticipation)
// ==========================================

/**
 * Calcule le score d'urgence (0-30 pts, 30%)
 * Courbe adoucie pour réduire la domination de l'urgence
 */
function calculateUrgencyScore(daysUntil: number): number {
  if (daysUntil < 0)  return 30  // En retard = priorité max
  if (daysUntil === 0) return 28  // Aujourd'hui
  if (daysUntil === 1) return 25  // Demain
  if (daysUntil === 2) return 20
  if (daysUntil === 3) return 15
  if (daysUntil <= 5)  return 10
  if (daysUntil <= 7)  return 6
  return Math.max(0, 4 - Math.floor(daysUntil / 3))
}

/**
 * Calcule le score d'importance/impact matière (0-25 pts, 25%)
 * Prend en compte: coefficient matière, écart à la cible, tendance
 */
function calculateImportanceScore(
  matiere: string,
  analysis: SubjectAnalysis | undefined,
  config: FocusConfig
): number {
  let score = 0
  const coef = getSubjectCoefficient(matiere)
  
  // Coefficient matière normalisé (0-10 pts)
  // coef 16 → 10pts, coef 6 → 4pts, coef 2 → 1pt
  score += Math.min(10, Math.round(coef * 0.625))
  
  if (analysis) {
    // Écart à la cible (0-10 pts)
    // Plus l'écart est grand (négatif), plus le bonus est élevé
    if (analysis.ecartCible !== null && analysis.ecartCible < 0) {
      // -6 pts d'écart → 10 pts de bonus
      score += Math.min(10, Math.abs(analysis.ecartCible) * 1.67)
    }
    
    // Tendance baissière (0-5 pts)
    if (analysis.trend === 'down') {
      score += 5
    }
  }
  
  return Math.min(25, score)
}

/**
 * Calcule le score "besoin de travail" (0-25 pts, 25%)
 * Basé sur les performances dans la matière
 */
function calculateNeedsWorkScore(
  analysis: SubjectAnalysis | undefined
): number {
  if (!analysis) return 0
  let score = 0
  
  // Moyenne critique < 10 (0-15 pts)
  if (analysis.moyenneEleve !== null) {
    if (analysis.moyenneEleve < 10) {
      score += 15
    } else if (analysis.needsAttention) {
      score += 10
    } else if (analysis.moyenneEleve < 14) {
      score += 5
    }
  }
  
  // Tendance baissière (0-10 pts)
  if (analysis.trend === 'down') {
    score += 10
  } else if (analysis.trend === 'stable' && analysis.ecartCible !== null && analysis.ecartCible < -2) {
    score += 5
  }
  
  return Math.min(25, score)
}

/**
 * Calcule le score de complexité/anticipation (0-10 pts, 10%)
 * Bonus pour les tâches longues planifiées à l'avance
 */
function calculateComplexityScore(
  estimatedTime: number,
  daysUntil: number
): number {
  // Pas de bonus pour les tâches courtes
  if (estimatedTime <= 20) return 0
  
  // Tâche longue (>=45min) avec J+3 ou plus → bonus maximal
  if (estimatedTime >= 45 && daysUntil >= 3) return 10
  if (estimatedTime >= 30 && daysUntil >= 3) return 8
  if (estimatedTime >= 45 && daysUntil >= 2) return 7
  if (estimatedTime >= 30 && daysUntil >= 2) return 5
  if (estimatedTime >= 30 && daysUntil >= 1) return 3
  
  return 0
}

/**
 * Calcule l'ajustement de charge (-10 à +10 pts)
 * - Malus si la soirée est déjà chargée
 * - Bonus si on anticipe une tâche non urgente
 */
function calculateLoadAdjustment(
  estimatedTime: number,
  daysUntil: number,
  currentPlanTime: number,
  currentPlanCount: number,
  config: FocusConfig
): number {
  let adjustment = 0
  
  // MALUS : si ajouter cette tâche dépasse la capacité
  const projectedTime = currentPlanTime + estimatedTime
  if (projectedTime > config.maxWorkTimePerNight) {
    adjustment -= 10 // Malus fort - dépasse la limite
  } else if (projectedTime > config.maxWorkTimePerNight * 0.85) {
    adjustment -= 5  // Malus modéré - proche de la limite
  }
  
  // MALUS : trop de tâches déjà prévues
  if (currentPlanCount >= 5) {
    adjustment -= 5
  } else if (currentPlanCount >= 4) {
    adjustment -= 3
  }
  
  // BONUS : anticipation d'une tâche non urgente et longue
  if (daysUntil >= 3 && estimatedTime >= 30) {
    adjustment += 8  // Fort bonus d'anticipation
  } else if (daysUntil >= 2 && estimatedTime >= 25) {
    adjustment += 5
  } else if (daysUntil >= 2 && estimatedTime >= 20) {
    adjustment += 3
  }
  
  return Math.max(-10, Math.min(10, adjustment))
}

/**
 * Détermine la catégorie d'une tâche
 */
function determineTaskCategory(
  daysUntil: number,
  source: 'devoir' | 'controle' | 'recommendation',
  analysis: SubjectAnalysis | undefined
): TaskCategory {
  // OBLIGATOIRE : rendu contractuel imminent ou en retard
  if (daysUntil < 0) {
    return 'obligatoire' // En retard
  }
  if (source === 'controle' && daysUntil <= 1) {
    return 'obligatoire' // Contrôle demain ou aujourd'hui
  }
  if (source === 'devoir' && daysUntil <= 1) {
    return 'obligatoire' // Devoir à rendre demain ou aujourd'hui
  }
  
  // STRATEGIQUE : matière en difficulté ou préparation ciblée
  if (source === 'controle' && daysUntil <= 3) {
    return 'strategique' // Contrôle dans 2-3 jours
  }
  if (analysis?.needsAttention || analysis?.trend === 'down') {
    return 'strategique' // Matière en difficulté
  }
  if (source === 'devoir' && daysUntil <= 3) {
    return 'strategique' // Devoir dans 2-3 jours
  }
  if (analysis != null && analysis.moyenneEleve !== null && analysis.moyenneEleve < 12) {
    return 'strategique' // Moyenne faible
  }
  
  // OPTIONNEL : tout le reste
  return 'optionnel'
}

/**
 * Mappe le score vers un niveau de priorité pour l'affichage
 */
function mapScoreToLevel(score: number, category: TaskCategory): PriorityLevel {
  // La catégorie influence le niveau affiché
  if (category === 'obligatoire') {
    return score >= 60 ? 'critical' : 'high'
  }
  if (category === 'strategique') {
    return score >= 50 ? 'high' : 'normal'
  }
  // optionnel
  return score >= 40 ? 'normal' : 'optional'
}

/**
 * Génère les justifications simplifiées (1 principale + 1 secondaire max)
 */
function generateJustifications(
  daysUntil: number,
  source: 'devoir' | 'controle' | 'recommendation',
  analysis: SubjectAnalysis | undefined,
  estimatedTime: number
): { primary: string; secondary?: string } {
  const reasons: string[] = []
  
  // 1. Deadline (priorité maximale)
  if (daysUntil < 0) {
    reasons.push("⚠️ En retard")
  } else if (daysUntil === 0) {
    reasons.push("À rendre aujourd'hui")
  } else if (daysUntil === 1) {
    reasons.push("À rendre demain")
  } else if (source === 'controle' && daysUntil <= 3) {
    reasons.push(`Contrôle dans ${daysUntil}j`)
  } else if (daysUntil <= 3) {
    reasons.push(`Dans ${daysUntil} jours`)
  }
  
  // 2. Matière en difficulté
  if (analysis != null && analysis.moyenneEleve !== null && analysis.moyenneEleve < 10) {
    reasons.push(`Moyenne critique (${analysis.moyenneEleve.toFixed(1)}/20)`)
  } else if (analysis?.needsAttention) {
    reasons.push("Matière à améliorer")
  }
  
  // 3. Tendance
  if (analysis?.trend === 'down') {
    reasons.push("Tendance en baisse")
  }
  
  // 4. Temps estimé (pour les tâches longues)
  if (estimatedTime >= 40) {
    reasons.push(`${estimatedTime}min de travail`)
  }
  
  // 5. Recommandation de révision
  if (source === 'recommendation') {
    if (reasons.length === 0) {
      reasons.push("Révision recommandée")
    }
  }
  
  return {
    primary: reasons[0] || "Tâche programmée",
    secondary: reasons[1]
  }
}

/**
 * Génère les raisons de priorité (format legacy + nouveau format)
 */
function generatePriorityReasons(
  daysUntil: number,
  source: 'devoir' | 'controle' | 'recommendation',
  analysis: SubjectAnalysis | undefined,
  matiere: string
): PriorityReason[] {
  const reasons: PriorityReason[] = []
  
  // Raisons d'urgence
  if (daysUntil < 0) {
    reasons.push({ type: 'deadline', label: 'En retard !', urgency: 'high' })
  } else if (daysUntil === 0) {
    reasons.push({ type: 'deadline', label: 'Pour aujourd\'hui', urgency: 'high' })
  } else if (daysUntil === 1) {
    reasons.push({ type: 'deadline', label: 'Pour demain', urgency: 'high' })
  } else if (daysUntil <= 3) {
    reasons.push({ type: 'deadline', label: `Dans ${daysUntil} jours`, urgency: 'medium' })
  }
  
  // Contrôle
  if (source === 'controle') {
    reasons.push({ 
      type: 'test', 
      label: `Contrôle dans ${daysUntil}j`, 
      urgency: daysUntil <= 2 ? 'high' : 'medium' 
    })
  }
  
  // Raisons liées aux notes
  if (analysis) {
    if (analysis.moyenneEleve !== null && analysis.moyenneEleve < 10) {
      reasons.push({ 
        type: 'lowGrade', 
        label: `Moyenne critique (${analysis.moyenneEleve.toFixed(1)}/20)`,
        urgency: 'high'
      })
    } else if (analysis.needsAttention) {
      reasons.push({ 
        type: 'lowGrade', 
        label: `Moyenne à améliorer`,
        urgency: 'medium'
      })
    }
    if (analysis.trend === 'down') {
      reasons.push({ type: 'trend', label: 'Tendance baissière', urgency: 'medium' })
    }
  }
  
  // Fort coefficient (jamais seul)
  if (reasons.length > 0 && getSubjectCoefficient(matiere) >= 10) {
    reasons.push({ type: 'coefficient', label: 'Matière à fort coefficient', urgency: 'low' })
  }
  
  return reasons
}

/**
 * Calcule le score complet d'une tâche (v2)
 */
export function calculateTaskScore(
  devoir: Devoir,
  subjectAnalyses: Map<string, SubjectAnalysis>,
  config: FocusConfig,
  allDevoirs: Devoir[],
  currentPlanTime: number = 0,
  currentPlanCount: number = 0
): { 
  score: number
  components: ScoreComponents
  reasons: PriorityReason[]
  category: TaskCategory
  priorityLevel: PriorityLevel
  primaryReason: string
  secondaryReason?: string
} {
  const daysUntil = getDaysUntil(devoir.date_rendu)
  const normalizedSubject = normalizeSubject(devoir.matiere)
  const analysis = subjectAnalyses.get(normalizedSubject)
  const estimatedTime = estimateTaskTime(devoir, config)
  
  // Calculer chaque composant
  const components: ScoreComponents = {
    urgency: calculateUrgencyScore(daysUntil),
    importance: calculateImportanceScore(devoir.matiere, analysis, config),
    needsWork: calculateNeedsWorkScore(analysis),
    complexity: calculateComplexityScore(estimatedTime, daysUntil),
    loadAdjustment: calculateLoadAdjustment(
      estimatedTime, daysUntil, currentPlanTime, currentPlanCount, config
    ),
  }
  
  // Score total
  const rawScore = 
    components.urgency + 
    components.importance + 
    components.needsWork + 
    components.complexity + 
    components.loadAdjustment
  
  const score = Math.max(0, Math.min(100, rawScore))
  
  // Déterminer catégorie et niveau
  const category = determineTaskCategory(daysUntil, 'devoir', analysis)
  const priorityLevel = mapScoreToLevel(score, category)
  
  // Générer justifications
  const justifications = generateJustifications(daysUntil, 'devoir', analysis, estimatedTime)
  const reasons = generatePriorityReasons(daysUntil, 'devoir', analysis, devoir.matiere)
  
  return { 
    score, 
    components, 
    reasons,
    category,
    priorityLevel,
    primaryReason: justifications.primary,
    secondaryReason: justifications.secondary
  }
}

// ==========================================
// GÉNÉRATION DU PLAN DE TRAVAIL
// ==========================================

/**
 * Convertit un devoir en tâche Focus (v2)
 */
function devoirToFocusTask(
  devoir: Devoir,
  scoreResult: {
    score: number
    components: ScoreComponents
    reasons: PriorityReason[]
    category: TaskCategory
    priorityLevel: PriorityLevel
    primaryReason: string
    secondaryReason?: string
  },
  config: FocusConfig
): FocusTask {
  const estimatedTime = estimateTaskTime(devoir, config)
  
  // Déterminer le type de tâche
  let taskType: TaskType = 'homework'
  const desc = devoir.description.toLowerCase()
  if (desc.includes('exercice') || desc.includes('ex.')) {
    taskType = 'exercise'
  } else if (desc.includes('révision') || desc.includes('réviser')) {
    taskType = 'revision'
  } else if (desc.includes('contrôle') || desc.includes('test')) {
    taskType = 'testPrep'
  }
  
  return {
    id: generateId(),
    type: taskType,
    matiere: normalizeSubject(devoir.matiere),
    title: getTaskTitle(devoir),
    description: devoir.description,
    dueDate: devoir.date_rendu,
    estimatedTime,
    score: scoreResult.score,
    scoreComponents: scoreResult.components,
    category: scoreResult.category,
    priorityLevel: scoreResult.priorityLevel,
    primaryReason: scoreResult.primaryReason,
    secondaryReason: scoreResult.secondaryReason,
    reasons: scoreResult.reasons,
    source: 'devoir',
    originalData: devoir,
    completed: devoir.fait,
  }
}

/**
 * Génère un titre court pour une tâche
 */
function getTaskTitle(devoir: Devoir): string {
  const desc = devoir.description.toLowerCase()
  
  if (desc.includes('dm')) return 'Devoir maison'
  if (desc.includes('exercice') || desc.includes('ex.')) return 'Exercices'
  if (desc.includes('révision') || desc.includes('réviser')) return 'Révisions'
  if (desc.includes('apprendre')) return 'Leçon à apprendre'
  if (desc.includes('lire')) return 'Lecture'
  
  // Prendre les 30 premiers caractères
  const short = devoir.description.slice(0, 30)
  return short + (devoir.description.length > 30 ? '...' : '')
}

/**
 * Crée une tâche de préparation à un contrôle (v2)
 */
function createTestPrepTask(
  controle: Controle,
  config: FocusConfig,
  subjectAnalysis: SubjectAnalysis | undefined,
  currentPlanTime: number = 0,
  currentPlanCount: number = 0
): FocusTask {
  const daysUntil = getDaysUntil(controle.date)
  const estimatedTime = controle.dureeRevision || config.estimatedTimePerTask.testPrep
  
  // Calculer les composants du score
  const components: ScoreComponents = {
    urgency: calculateUrgencyScore(daysUntil),
    importance: calculateImportanceScore(controle.matiere, subjectAnalysis, config),
    needsWork: calculateNeedsWorkScore(subjectAnalysis),
    complexity: calculateComplexityScore(estimatedTime, daysUntil),
    loadAdjustment: calculateLoadAdjustment(
      estimatedTime, daysUntil, currentPlanTime, currentPlanCount, config
    ),
  }
  
  // Score total avec bonus contrôle (+15)
  const rawScore = 
    components.urgency + 
    components.importance + 
    components.needsWork + 
    components.complexity + 
    components.loadAdjustment + 
    15 // Bonus contrôle
  
  const score = Math.max(0, Math.min(100, rawScore))
  
  // Catégorie et niveau
  const category = determineTaskCategory(daysUntil, 'controle', subjectAnalysis)
  const priorityLevel = mapScoreToLevel(score, category)
  
  // Justifications
  const justifications = generateJustifications(daysUntil, 'controle', subjectAnalysis, estimatedTime)
  const reasons = generatePriorityReasons(daysUntil, 'controle', subjectAnalysis, controle.matiere)
  
  return {
    id: generateId(),
    type: 'testPrep',
    matiere: normalizeSubject(controle.matiere),
    title: `Préparer ${controle.type.toUpperCase()}`,
    description: controle.description || `Révisions pour le contrôle de ${controle.matiere}`,
    dueDate: controle.date,
    estimatedTime,
    score,
    scoreComponents: components,
    category,
    priorityLevel,
    primaryReason: justifications.primary,
    secondaryReason: justifications.secondary,
    reasons,
    source: 'controle',
    originalData: controle,
    completed: controle.prepCompleted,
  }
}

/**
 * Crée une recommandation de révision pour une matière en difficulté (v2)
 */
function createRevisionRecommendation(
  analysis: SubjectAnalysis,
  config: FocusConfig
): FocusTask | null {
  if (!analysis.needsAttention || analysis.moyenneEleve === null) {
    return null
  }
  
  const estimatedTime = config.estimatedTimePerTask.revision
  
  // Score pour les recommandations (plafonné à 50)
  const components: ScoreComponents = {
    urgency: 0, // Pas de deadline
    importance: calculateImportanceScore(analysis.matiere, analysis, config),
    needsWork: calculateNeedsWorkScore(analysis),
    complexity: 0, // Révision courte
    loadAdjustment: 0,
  }
  
  const rawScore = components.importance + components.needsWork
  const score = Math.min(50, rawScore) // Max 50 pour les recommandations
  
  // Toujours stratégique ou optionnel
  const category: TaskCategory = analysis.moyenneEleve < 10 ? 'strategique' : 'optionnel'
  const priorityLevel = mapScoreToLevel(score, category)
  
  // Justifications
  const justifications = generateJustifications(-1, 'recommendation', analysis, estimatedTime)
  
  const reasons: PriorityReason[] = [
    { 
      type: 'lowGrade', 
      label: `Moyenne: ${analysis.moyenneEleve.toFixed(1)}/20 (cible: ${config.targetAverage})`,
      urgency: analysis.moyenneEleve < 10 ? 'high' : 'medium'
    }
  ]
  
  if (analysis.trend === 'down') {
    reasons.push({ type: 'trend', label: 'Tendance baissière', urgency: 'medium' })
  }
  
  return {
    id: generateId(),
    type: 'revision',
    matiere: analysis.matiere,
    title: 'Révision recommandée',
    description: `Revoir le cours pour améliorer votre moyenne (actuellement ${analysis.moyenneEleve.toFixed(1)}/20)`,
    estimatedTime,
    score,
    scoreComponents: components,
    category,
    priorityLevel,
    primaryReason: justifications.primary,
    secondaryReason: justifications.secondary,
    reasons,
    source: 'recommendation',
    completed: false,
  }
}

/**
 * Extrait les matières uniques de l'emploi du temps (cours du jour ou de la semaine)
 */
export function getSubjectsFromLessons(lessons: Lesson[]): string[] {
  const set = new Set<string>()
  lessons.forEach(l => {
    const norm = normalizeSubject(l.matiere)
    if (norm) set.add(norm)
  })
  return Array.from(set)
}

/**
 * Crée une tâche de révision de cours pour une matière de l'EDT (sans devoir à rendre ce soir)
 */
function createEdtRevisionTask(
  matiere: string,
  config: FocusConfig,
  subjectAnalysis: SubjectAnalysis | undefined,
  currentPlanTime: number,
  currentPlanCount: number
): FocusTask {
  const priority = config.subjectPriorities?.[matiere] ?? 3 // 1-5, défaut 3
  const estimatedTime = config.estimatedTimePerTask.revision
  
  const components: ScoreComponents = {
    urgency: 0,
    importance: calculateImportanceScore(matiere, subjectAnalysis, config),
    needsWork: calculateNeedsWorkScore(subjectAnalysis),
    complexity: 0,
    loadAdjustment: calculateLoadAdjustment(
      estimatedTime, 7, currentPlanTime, currentPlanCount, config
    ),
  }
  
  // Bonus priorité utilisateur (1-5 → +0 à +20 pts) pour les faire remonter dans la sélection
  const priorityBonus = (priority - 1) * 5
  const rawScore = Math.min(65,
    components.importance + components.needsWork + components.loadAdjustment + priorityBonus
  )
  const score = Math.max(0, rawScore)
  // Stratégique pour que les révisions de cours soient sélectionnées (optionnel = souvent ignoré à cause de la limite de matières)
  const category: TaskCategory = 'strategique'
  const priorityLevel = mapScoreToLevel(score, category)
  
  return {
    id: generateId(),
    type: 'revision',
    matiere,
    title: 'Révision de cours',
    description: `Revoir le cours de ${matiere} (pas de travail à rendre)`,
    estimatedTime,
    score,
    scoreComponents: components,
    category,
    priorityLevel,
    primaryReason: `Cours au programme • priorité ${priority}/5`,
    secondaryReason: subjectAnalysis?.needsAttention ? 'Matière à consolider' : undefined,
    reasons: [
      { type: 'anticipation', label: 'Révision de cours', urgency: 'low' },
    ],
    source: 'recommendation',
    completed: false,
  }
}

/**
 * Génère le plan de travail pour ce soir (v2)
 * 
 * Algorithme de sélection v2:
 * 1. Scorer tous les devoirs/contrôles avec la nouvelle formule (les devoirs ne sont jamais ignorés, même si matière désactivée)
 * 2. Ajouter les révisions de cours pour les matières de l'EDT sans travail à faire (sauf matières désactivées)
 * 3. Sélectionner les OBLIGATOIRES en premier (toujours inclus)
 * 4. Ajouter les STRATEGIQUES puis OPTIONNELS selon contraintes
 */
export function generateFocusPlan(
  devoirs: Devoir[],
  notes: Note[],
  moyennes: Moyenne[],
  controles: Controle[],
  config: FocusConfig = DEFAULT_CONFIG,
  lessons: Lesson[] = []
): FocusPlan {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const disabledRevisions = new Set(config.disabledRevisionSubjects ?? [])
  
  // Analyser toutes les matières
  const subjectAnalyses = new Map<string, SubjectAnalysis>()
  const uniqueSubjects = new Set<string>()
  
  moyennes.forEach(m => uniqueSubjects.add(normalizeSubject(m.matiere)))
  devoirs.forEach(d => uniqueSubjects.add(normalizeSubject(d.matiere)))
  getSubjectsFromLessons(lessons).forEach(s => uniqueSubjects.add(s))
  
  uniqueSubjects.forEach(subject => {
    const analysis = analyzeSubject(subject, notes, moyennes, config.targetAverage)
    if (analysis) {
      subjectAnalyses.set(subject, analysis)
    }
  })
  
  // Filtrer les devoirs non faits et dans la fenêtre d'anticipation (jamais filtrés par matière désactivée)
  const relevantDevoirs = devoirs.filter(d => {
    if (d.fait) return false
    const daysUntil = getDaysUntil(d.date_rendu)
    return daysUntil <= config.anticipationDays
  })
  
  // Scorer tous les devoirs
  const allTasks: FocusTask[] = []
  
  // 1. Scorer et convertir les devoirs
  relevantDevoirs.forEach(d => {
    const scoreResult = calculateTaskScore(d, subjectAnalyses, config, devoirs, 0, 0)
    const task = devoirToFocusTask(d, scoreResult, config)
    allTasks.push(task)
  })
  
  // 2. Ajouter les préparations aux contrôles
  const upcomingControles = controles.filter(c => {
    const daysUntil = getDaysUntil(c.date)
    return daysUntil >= 0 && daysUntil <= config.testPrepDays && !c.prepCompleted
  })
  
  upcomingControles.forEach(c => {
    const analysis = subjectAnalyses.get(normalizeSubject(c.matiere))
    const task = createTestPrepTask(c, config, analysis, 0, 0)
    allTasks.push(task)
  })
  
  // 3. Révisions de cours : matières de l'EDT (ou à défaut devoirs/moyennes) sans travail à faire ce soir, non désactivées
  const subjectsWithTask = new Set(allTasks.map(t => t.matiere))
  let revisionSubjects = getSubjectsFromLessons(lessons)
  if (revisionSubjects.length === 0) {
    // Fallback : matières des devoirs et moyennes (pour proposer des révisions même sans EDT)
    const fallback = new Set<string>()
    devoirs.forEach(d => fallback.add(normalizeSubject(d.matiere)))
    moyennes.forEach(m => fallback.add(normalizeSubject(m.matiere)))
    revisionSubjects = Array.from(fallback)
  }
  revisionSubjects.forEach(subject => {
    if (subjectsWithTask.has(subject) || disabledRevisions.has(subject)) return
    const analysis = subjectAnalyses.get(subject)
    const task = createEdtRevisionTask(subject, config, analysis, 0, allTasks.length)
    allTasks.push(task)
  })
  
  // 4. Recommandations de révision (matières en difficulté) si peu d'obligatoires
  const obligatoireCount = allTasks.filter(t => t.category === 'obligatoire').length
  if (obligatoireCount < 2) {
    const needsAttention = Array.from(subjectAnalyses.values())
      .filter(a => a.needsAttention && a.priority === 'high' && !disabledRevisions.has(a.matiere))
      .slice(0, 3 - obligatoireCount)
    
    needsAttention.forEach(analysis => {
      const recommendation = createRevisionRecommendation(analysis, config)
      if (recommendation) {
        allTasks.push(recommendation)
      }
    })
  }
  
  // 4. Sélection par catégorie puis par score
  // OBLIGATOIRE d'abord, puis STRATEGIQUE, puis OPTIONNEL
  const tasksByCategory = {
    obligatoire: allTasks.filter(t => t.category === 'obligatoire').sort((a, b) => b.score - a.score),
    strategique: allTasks.filter(t => t.category === 'strategique').sort((a, b) => b.score - a.score),
    optionnel: allTasks.filter(t => t.category === 'optionnel').sort((a, b) => b.score - a.score),
  }
  
  const selectedTasks: FocusTask[] = []
  let totalTime = 0
  const usedSubjects = new Set<string>()
  const warnings: string[] = []
  const recommendations: string[] = []
  
  // Fonction helper pour ajouter une tâche si les contraintes le permettent
  const tryAddTask = (task: FocusTask, forceAdd: boolean = false): boolean => {
    // Contrainte de temps (sauf si forceAdd pour les obligatoires)
    if (!forceAdd && totalTime + task.estimatedTime > config.maxWorkTimePerNight) {
      if (!config.allowOverloadNights) return false
    }
    
    // Contrainte de matières (sauf si forceAdd)
    if (!forceAdd && usedSubjects.size >= config.maxSubjectsPerNight && !usedSubjects.has(task.matiere)) {
      return false
    }
    
    // Recalculer le score avec le contexte actuel (loadAdjustment)
    const analysis = subjectAnalyses.get(task.matiere)
    const daysUntil = task.dueDate ? getDaysUntil(task.dueDate) : 7
    const newLoadAdjustment = calculateLoadAdjustment(
      task.estimatedTime, daysUntil, totalTime, selectedTasks.length, config
    )
    
    // Mettre à jour le score et les composants
    if (task.scoreComponents) {
      task.scoreComponents.loadAdjustment = newLoadAdjustment
      task.score = Math.max(0, Math.min(100,
        task.scoreComponents.urgency +
        task.scoreComponents.importance +
        task.scoreComponents.needsWork +
        task.scoreComponents.complexity +
        newLoadAdjustment
      ))
      task.priorityLevel = mapScoreToLevel(task.score, task.category)
    }
    
    selectedTasks.push(task)
    totalTime += task.estimatedTime
    usedSubjects.add(task.matiere)
    return true
  }
  
  // Ajouter les OBLIGATOIRES (toujours inclus, même si ça dépasse)
  for (const task of tasksByCategory.obligatoire) {
    tryAddTask(task, true) // forceAdd = true
    if (selectedTasks.length >= 6) break
  }
  
  // Ajouter les STRATEGIQUES (respecte les contraintes)
  for (const task of tasksByCategory.strategique) {
    if (selectedTasks.length >= 6) break
    tryAddTask(task, false)
  }
  
  // Ajouter les OPTIONNELS si du temps reste
  for (const task of tasksByCategory.optionnel) {
    if (selectedTasks.length >= 6) break
    if (totalTime >= config.maxWorkTimePerNight * 0.9) break // Laisser une marge
    tryAddTask(task, false)
  }
  
  // Grouper les tâches sélectionnées par catégorie pour l'UI
  const selectedByCategory = {
    obligatoire: selectedTasks.filter(t => t.category === 'obligatoire'),
    strategique: selectedTasks.filter(t => t.category === 'strategique'),
    optionnel: selectedTasks.filter(t => t.category === 'optionnel'),
  }
  
  // Générer les avertissements
  const isOverloaded = totalTime > config.maxWorkTimePerNight
  if (isOverloaded) {
    const hours = Math.floor(totalTime / 60)
    const mins = totalTime % 60
    warnings.push(`Charge élevée ce soir (${hours}h${mins.toString().padStart(2, '0')})`)
  }
  
  const lateDevoirs = devoirs.filter(d => !d.fait && isPastDue(d.date_rendu))
  if (lateDevoirs.length > 0) {
    warnings.push(`${lateDevoirs.length} devoir(s) en retard`)
  }
  
  // Avertir si des tâches obligatoires n'ont pas pu être ajoutées
  const missedObligatoire = tasksByCategory.obligatoire.length - selectedByCategory.obligatoire.length
  if (missedObligatoire > 0) {
    warnings.push(`${missedObligatoire} tâche(s) obligatoire(s) reportée(s)`)
  }
  
  // Générer les recommandations
  const avgGeneral = calculateGeneralAverage(moyennes)
  if (avgGeneral !== null && avgGeneral < config.targetAverage) {
    const gap = (config.targetAverage - avgGeneral).toFixed(1)
    recommendations.push(
      `Objectif: gagner ${gap} pts pour atteindre ${config.targetAverage}/20`
    )
  }
  
  const criticalSubjects = Array.from(subjectAnalyses.values())
    .filter(a => a.priority === 'high' && a.moyenneEleve !== null && a.moyenneEleve < 10)
  if (criticalSubjects.length > 0) {
    recommendations.push(
      `Matières critiques: ${criticalSubjects.map(s => s.matiere).join(', ')}`
    )
  }
  
  return {
    date: todayStr,
    tasks: selectedTasks,
    tasksByCategory: selectedByCategory,
    totalTime,
    isOverloaded,
    warnings,
    recommendations,
  }
}

/**
 * Retourne ce qui est prévu pour la journée du lendemain (cours EDT + devoirs + contrôles)
 */
export function getTomorrowPreview(
  devoirs: Devoir[],
  controles: Controle[],
  lessons: Lesson[] = []
): TomorrowPreview {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const y = tomorrow.getFullYear()
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const d = String(tomorrow.getDate()).padStart(2, '0')
  const tomorrowStr = `${y}-${m}-${d}`
  
  const tomorrowLessons = lessons.filter(l => {
    const lessonDate = l.debut?.split('T')[0] || l.debut?.slice(0, 10)
    return lessonDate === tomorrowStr
  }).sort((a, b) => (a.debut || '').localeCompare(b.debut || ''))
  
  const tomorrowDevoirs = devoirs.filter(d => !d.fait && d.date_rendu === tomorrowStr)
  const tomorrowControles = controles.filter(c => c.date === tomorrowStr)
  
  return {
    date: tomorrowStr,
    lessons: tomorrowLessons,
    devoirs: tomorrowDevoirs,
    controles: tomorrowControles,
  }
}

/**
 * Génère le plan de travail pour les N prochains jours
 */
export function generateWeeklyPlan(
  devoirs: Devoir[],
  notes: Note[],
  moyennes: Moyenne[],
  controles: Controle[],
  config: FocusConfig = DEFAULT_CONFIG,
  days: number = 7
): FocusPlan[] {
  // Pour une planification sur plusieurs jours, on distribue les tâches
  // Cette fonction est plus complexe et pourrait être développée ultérieurement
  
  const plans: FocusPlan[] = []
  const today = new Date()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    
    // Pour l'instant, générer le même plan (à améliorer)
    const plan = generateFocusPlan(devoirs, notes, moyennes, controles, config)
    plan.date = date.toISOString().split('T')[0]
    plans.push(plan)
  }
  
  return plans
}
