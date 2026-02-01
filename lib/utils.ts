import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
