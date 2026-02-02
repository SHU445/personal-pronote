import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Lesson } from "@/types/pronote"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convertit du HTML (ex. description Pronote) en texte brut pour affichage sûr.
 * Évite d'afficher les balises brutes et tout risque XSS.
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== "string") return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function formatDate(dateString: string): string {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

export function formatTime(dateString: string): string {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export function parseNote(note: string): number | null {
  if (!note || note === "Absent" || note === "Dispensé" || note === "NonNoté") {
    return null
  }
  const parsed = parseFloat(note.replace(",", "."))
  return isNaN(parsed) ? null : parsed
}

export function getNoteColor(note: number, bareme: number = 20): string {
  const ratio = note / bareme
  if (ratio >= 0.7) return "text-green-500"
  if (ratio >= 0.5) return "text-yellow-500"
  return "text-red-500"
}

export function getMoyenneColor(moyenne: number): string {
  if (moyenne >= 14) return "text-green-500"
  if (moyenne >= 10) return "text-yellow-500"
  return "text-red-500"
}

// ==========================================
// EMPLOI DU TEMPS - Utilitaires
// ==========================================

// Formater une date en YYYY-MM-DD en respectant le fuseau horaire local
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Extraire la date YYYY-MM-DD d'une chaîne datetime
export function extractDateFromDatetime(datetime: string): string {
  if (!datetime || typeof datetime !== "string") return ""
  return datetime.split("T")[0]
}

// Extraire l'heure (en minutes depuis minuit) d'une chaîne datetime
export function extractTimeMinutes(datetime: string): number {
  const timePart = datetime.split("T")[1]
  if (!timePart) return 0
  const [hours, minutes] = timePart.split(":").map(Number)
  return hours * 60 + minutes
}

// Palette de couleurs pour les matières (couleurs cohérentes et contrastées)
const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "MATHEMATIQUES": { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-700 dark:text-blue-300" },
  "MATHS TECHNO": { bg: "bg-blue-400/15", border: "border-blue-400/30", text: "text-blue-600 dark:text-blue-400" },
  "FRANCAIS": { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-300" },
  "ANGLAIS LV1": { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-700 dark:text-red-300" },
  "ESPAGNOL LV2": { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-700 dark:text-orange-300" },
  "HISTOIRE-GEOGRAPHIE": { bg: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-700 dark:text-yellow-300" },
  "PHILOSOPHIE": { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-700 dark:text-purple-300" },
  "ED.PHYSIQUE & SPORT.": { bg: "bg-green-500/15", border: "border-green-500/30", text: "text-green-700 dark:text-green-300" },
  "PHYS-CHIMIE TECHNO": { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-700 dark:text-cyan-300" },
  "INGEN.INNOV.DEV.DUR.": { bg: "bg-indigo-500/15", border: "border-indigo-500/30", text: "text-indigo-700 dark:text-indigo-300" },
  "ENS. TECH. LV": { bg: "bg-teal-500/15", border: "border-teal-500/30", text: "text-teal-700 dark:text-teal-300" },
  "ENS. MORAL & CIVIQUE": { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-700 dark:text-pink-300" },
}

// Couleurs par défaut basées sur un hash de la matière
const DEFAULT_COLORS = [
  { bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-700 dark:text-slate-300" },
  { bg: "bg-zinc-500/15", border: "border-zinc-500/30", text: "text-zinc-700 dark:text-zinc-300" },
  { bg: "bg-stone-500/15", border: "border-stone-500/30", text: "text-stone-700 dark:text-stone-300" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/30", text: "text-fuchsia-700 dark:text-fuchsia-300" },
  { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-sky-500/15", border: "border-sky-500/30", text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-lime-500/15", border: "border-lime-500/30", text: "text-lime-700 dark:text-lime-300" },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getSubjectColor(matiere: string): { bg: string; border: string; text: string } {
  // Extraire le nom principal de la matière (avant le " > ")
  const mainSubject = matiere.split(" > ")[0].trim()
  
  // Chercher dans les couleurs prédéfinies
  if (SUBJECT_COLORS[mainSubject]) {
    return SUBJECT_COLORS[mainSubject]
  }
  
  // Sinon, attribuer une couleur basée sur le hash
  const index = hashString(mainSubject) % DEFAULT_COLORS.length
  return DEFAULT_COLORS[index]
}

// Interface pour un cours positionné dans la grille
export interface PositionedLesson extends Lesson {
  top: number      // Position en % depuis le haut de la grille
  height: number   // Hauteur en % de la grille
  left: number     // Position en % depuis la gauche (pour chevauchements)
  width: number    // Largeur en % (pour chevauchements)
  column: number   // Index de colonne pour chevauchements
  totalColumns: number // Nombre total de colonnes pour ce groupe
}

// Calculer les positions des cours avec gestion des chevauchements
export function calculateLessonPositions(
  lessons: Lesson[],
  startHour: number, // Heure de début de la grille (ex: 7)
  endHour: number    // Heure de fin de la grille (ex: 18)
): PositionedLesson[] {
  const totalMinutes = (endHour - startHour) * 60
  
  // Trier par heure de début
  const sorted = [...lessons].sort((a, b) => 
    extractTimeMinutes(a.debut) - extractTimeMinutes(b.debut)
  )
  
  // Détecter les groupes de cours qui se chevauchent
  const groups: Lesson[][] = []
  let currentGroup: Lesson[] = []
  let groupEnd = 0
  
  for (const lesson of sorted) {
    const start = extractTimeMinutes(lesson.debut)
    const end = extractTimeMinutes(lesson.fin)
    
    if (currentGroup.length === 0 || start < groupEnd) {
      // Ajouter au groupe actuel
      currentGroup.push(lesson)
      groupEnd = Math.max(groupEnd, end)
    } else {
      // Nouveau groupe
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [lesson]
      groupEnd = end
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }
  
  // Positionner chaque cours
  const positioned: PositionedLesson[] = []
  
  for (const group of groups) {
    const columns: Lesson[][] = []
    
    // Assigner chaque cours à une colonne
    for (const lesson of group) {
      const lessonStart = extractTimeMinutes(lesson.debut)
      const lessonEnd = extractTimeMinutes(lesson.fin)
      
      // Trouver une colonne où le cours ne chevauche pas
      let columnIndex = columns.findIndex(col => {
        const lastInCol = col[col.length - 1]
        return extractTimeMinutes(lastInCol.fin) <= lessonStart
      })
      
      if (columnIndex === -1) {
        // Créer une nouvelle colonne
        columnIndex = columns.length
        columns.push([])
      }
      
      columns[columnIndex].push(lesson)
    }
    
    // Calculer les positions pour ce groupe
    const totalColumns = columns.length
    const columnWidth = 100 / totalColumns
    
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      for (const lesson of columns[colIndex]) {
        const startMinutes = extractTimeMinutes(lesson.debut) - startHour * 60
        const endMinutes = extractTimeMinutes(lesson.fin) - startHour * 60
        
        positioned.push({
          ...lesson,
          top: (startMinutes / totalMinutes) * 100,
          height: ((endMinutes - startMinutes) / totalMinutes) * 100,
          left: colIndex * columnWidth,
          width: columnWidth,
          column: colIndex,
          totalColumns,
        })
      }
    }
  }
  
  return positioned
}
