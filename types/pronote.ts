// Types pour les données Pronote

export interface Eleve {
  nom: string
  etablissement: string
  classe: string
  periode_actuelle: string
}

export interface Note {
  matiere: string
  note: string
  bareme: string
  coefficient: number
  moyenne_classe: string
  note_min: string
  note_max: string
  commentaire: string
  date: string
}

export interface Moyenne {
  matiere: string
  moyenne_eleve: string
  moyenne_classe: string
  moyenne_min: string
  moyenne_max: string
}

export interface Devoir {
  matiere: string
  description: string
  date_rendu: string
  fait: boolean
  fichiers: string[]
}

export interface Lesson {
  id: string
  matiere: string
  professeur: string
  salle: string
  debut: string
  fin: string
  annule: boolean
  modifie: boolean
  contenu?: string
}

export interface Menu {
  date: string
  repas: string
  entrees: string[]
  plats: string[]
  accompagnements: string[]
  desserts: string[]
}

export interface Discussion {
  id: string
  sujet: string
  auteur: string
  date: string
  lu: boolean
  messages_count: number
  dernier_message?: string
}

export interface Absence {
  date_debut: string
  date_fin: string
  justifie: boolean
  motif: string
  heures: number
}

export interface Retard {
  date: string
  justifie: boolean
  motif: string
  minutes: number
}

export interface PronoteData {
  export_date: string
  eleve: Eleve
  devoirs: Devoir[]
  notes: Note[]
  moyennes: Moyenne[]
  lessons?: Lesson[]
  menus?: Menu[]
  discussions?: Discussion[]
  absences?: Absence[]
  retards?: Retard[]
}

export interface AuthStatus {
  connected: boolean
  eleve?: Eleve
  error?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ==========================================
// FOCUS TONIGHT - Types pour le moteur de décision
// ==========================================

/**
 * Configuration utilisateur pour Focus Tonight
 */
export interface FocusConfig {
  // Temps maximum de travail par soir (en minutes)
  maxWorkTimePerNight: number
  // Nombre maximum de matières différentes par soir
  maxSubjectsPerNight: number
  // Jours d'anticipation maximum (combien de jours à l'avance travailler)
  anticipationDays: number
  // Autoriser le travail le weekend
  allowWeekendWork: boolean
  // Autoriser des soirées exceptionnellement chargées
  allowOverloadNights: boolean
  // Moyenne générale cible
  targetAverage: number
  // Temps estimé par type de devoir (en minutes)
  estimatedTimePerTask: {
    homework: number      // Devoir classique
    exercise: number      // Exercice
    revision: number      // Révision de cours
    testPrep: number      // Préparation contrôle
  }
  // Jours de préparation avant un contrôle
  testPrepDays: number
  // Priorité des matières pour les révisions (1-5, 5 = priorité max). Clé = nom normalisé de la matière.
  subjectPriorities?: Record<string, number>
  // Matières désactivées pour les révisions (révisions ignorées). Les devoirs ne sont jamais ignorés.
  disabledRevisionSubjects?: string[]
}

/**
 * Contrôle/évaluation (saisie manuelle)
 */
export interface Controle {
  id: string
  matiere: string
  date: string
  type: 'ds' | 'interro' | 'oral' | 'tp'
  description?: string
  coefficient?: number
  dureeRevision?: number // temps de révision estimé en minutes
  prepCompleted?: boolean // préparation terminée
}

/**
 * Type de tâche dans le planning
 */
export type TaskType = 
  | 'homework'    // Devoir à rendre
  | 'revision'    // Révision de cours (recommandée)
  | 'testPrep'    // Préparation à un contrôle
  | 'exercise'    // Exercice supplémentaire

/**
 * Catégorie de priorité d'une tâche (v2)
 * - obligatoire : rendu contractuel, contrôle imminent (J/J+1), en retard
 * - strategique : matière en difficulté, révision ciblée, devoir J+2-3
 * - optionnel : tout le reste (exercices bonus, lectures)
 */
export type TaskCategory = 'obligatoire' | 'strategique' | 'optionnel'

/**
 * Niveau de priorité pour l'affichage (v2)
 * Mapping interne du score continu vers des niveaux discrets
 */
export type PriorityLevel = 'critical' | 'high' | 'normal' | 'optional'

/**
 * Composants du score de priorité (v2)
 * Formule: urgency(30%) + importance(25%) + needsWork(25%) + complexity(10%) + loadAdjustment(±10)
 */
export interface ScoreComponents {
  urgency: number      // 0-30 pts (30%) - basé sur daysUntil
  importance: number   // 0-25 pts (25%) - coefficient matière + écart cible
  needsWork: number    // 0-25 pts (25%) - moyenne critique + tendance
  complexity: number   // 0-10 pts (10%) - bonus tâche longue à anticiper
  loadAdjustment: number // -10 à +10 pts - malus surcharge / bonus anticipation
}

/**
 * Raison de priorité d'une tâche
 */
export interface PriorityReason {
  type: 'deadline' | 'test' | 'lowGrade' | 'trend' | 'overload' | 'coefficient' | 'anticipation'
  label: string
  urgency: 'high' | 'medium' | 'low'
}

/**
 * Tâche prioritaire calculée par le moteur (v2)
 */
export interface FocusTask {
  id: string
  type: TaskType
  matiere: string
  title: string
  description: string
  dueDate?: string
  estimatedTime: number // en minutes
  score: number // score de priorité (0-100) - interne, non affiché
  scoreComponents?: ScoreComponents // détail du scoring pour debug
  category: TaskCategory // catégorie pour le groupement UI
  priorityLevel: PriorityLevel // niveau pour l'affichage
  primaryReason: string // raison principale (1 phrase)
  secondaryReason?: string // raison secondaire optionnelle
  reasons: PriorityReason[] // conservé pour compatibilité
  source: 'devoir' | 'controle' | 'recommendation'
  originalData?: Devoir | Controle
  completed?: boolean
}

/**
 * Plan de travail pour une soirée (v2)
 */
export interface FocusPlan {
  date: string
  tasks: FocusTask[]
  // Tâches groupées par catégorie pour l'UI
  tasksByCategory: {
    obligatoire: FocusTask[]
    strategique: FocusTask[]
    optionnel: FocusTask[]
  }
  totalTime: number
  isOverloaded: boolean
  warnings: string[]
  recommendations: string[]
}

/**
 * Analyse d'une matière
 */
export interface SubjectAnalysis {
  matiere: string
  moyenneEleve: number | null
  moyenneClasse: number | null
  ecartCible: number | null // écart à la moyenne cible
  ecartClasse: number | null // écart à la moyenne de classe
  trend: 'up' | 'down' | 'stable' | 'unknown'
  coefficient: number
  lastNotes: { note: number; date: string; bareme: number }[]
  needsAttention: boolean
  priority: 'high' | 'medium' | 'low'
}

/**
 * Résultat de simulation d'une note
 */
export interface GradeSimulation {
  matiere: string
  currentAverage: number | null
  simulatedNote: number
  bareme: number
  coefficient: number
  newAverage: number
  impact: number // différence avec la moyenne actuelle
  newGeneralAverage: number
  generalImpact: number
}

/**
 * Statistiques globales Focus Tonight
 */
export interface FocusStats {
  devoirsEnAttente: number
  controlesAVenir: number
  tempsEstimeTotalSemaine: number
  matieresPrioritaires: string[]
  moyenneGenerale: number | null
  ecartCible: number | null
  tendanceGenerale: 'up' | 'down' | 'stable' | 'unknown'
}

/**
 * Aperçu de la journée du lendemain (cours EDT + devoirs/contrôles)
 */
export interface TomorrowPreview {
  date: string
  lessons: Lesson[]
  devoirs: Devoir[]
  controles: Controle[]
}
