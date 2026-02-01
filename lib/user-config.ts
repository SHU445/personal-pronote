/**
 * User Configuration - Gestion de la configuration utilisateur
 * 
 * Persistance via localStorage pour les préférences Focus Tonight
 */

import type { FocusConfig, Controle } from '@/types/pronote'
import { DEFAULT_CONFIG } from './focus-engine'

// Clés de stockage localStorage
const STORAGE_KEYS = {
  config: 'focus-tonight-config',
  controles: 'focus-tonight-controles',
  completedTasks: 'focus-tonight-completed',
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Charge la configuration depuis localStorage
 */
export function loadConfig(): FocusConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.config)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Fusionner avec les valeurs par défaut pour gérer les nouvelles propriétés
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch (error) {
    console.error('Erreur chargement config:', error)
  }
  
  return DEFAULT_CONFIG
}

/**
 * Sauvegarde la configuration dans localStorage
 */
export function saveConfig(config: FocusConfig): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config))
  } catch (error) {
    console.error('Erreur sauvegarde config:', error)
  }
}

/**
 * Réinitialise la configuration aux valeurs par défaut
 */
export function resetConfig(): FocusConfig {
  saveConfig(DEFAULT_CONFIG)
  return DEFAULT_CONFIG
}

/**
 * Met à jour une propriété de la configuration
 */
export function updateConfig<K extends keyof FocusConfig>(
  key: K,
  value: FocusConfig[K]
): FocusConfig {
  const config = loadConfig()
  config[key] = value
  saveConfig(config)
  return config
}

// ==========================================
// CONTRÔLES (saisie manuelle)
// ==========================================

/**
 * Charge les contrôles saisis manuellement
 */
export function loadControles(): Controle[] {
  if (typeof window === 'undefined') {
    return []
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.controles)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Erreur chargement contrôles:', error)
  }
  
  return []
}

/**
 * Sauvegarde les contrôles
 */
export function saveControles(controles: Controle[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEYS.controles, JSON.stringify(controles))
  } catch (error) {
    console.error('Erreur sauvegarde contrôles:', error)
  }
}

/**
 * Ajoute un nouveau contrôle
 */
export function addControle(controle: Omit<Controle, 'id'>): Controle {
  const controles = loadControles()
  const newControle: Controle = {
    ...controle,
    id: `controle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
  controles.push(newControle)
  saveControles(controles)
  return newControle
}

/**
 * Met à jour un contrôle existant
 */
export function updateControle(id: string, updates: Partial<Controle>): Controle | null {
  const controles = loadControles()
  const index = controles.findIndex(c => c.id === id)
  
  if (index === -1) return null
  
  controles[index] = { ...controles[index], ...updates }
  saveControles(controles)
  return controles[index]
}

/**
 * Supprime un contrôle
 */
export function deleteControle(id: string): boolean {
  const controles = loadControles()
  const filtered = controles.filter(c => c.id !== id)
  
  if (filtered.length === controles.length) return false
  
  saveControles(filtered)
  return true
}

/**
 * Récupère les contrôles à venir (non passés)
 */
export function getUpcomingControles(): Controle[] {
  const controles = loadControles()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return controles.filter(c => {
    const date = new Date(c.date)
    date.setHours(0, 0, 0, 0)
    return date >= today
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ==========================================
// TÂCHES COMPLÉTÉES (tracking quotidien)
// ==========================================

interface CompletedTask {
  id: string
  date: string
  taskId: string
  matiere: string
  completedAt: string
}

/**
 * Charge les tâches complétées
 */
export function loadCompletedTasks(): CompletedTask[] {
  if (typeof window === 'undefined') {
    return []
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.completedTasks)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Erreur chargement tâches complétées:', error)
  }
  
  return []
}

/**
 * Sauvegarde les tâches complétées
 */
function saveCompletedTasks(tasks: CompletedTask[]): void {
  if (typeof window === 'undefined') return
  
  try {
    // Nettoyer les tâches de plus de 30 jours
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const filtered = tasks.filter(t => 
      new Date(t.completedAt) > thirtyDaysAgo
    )
    
    localStorage.setItem(STORAGE_KEYS.completedTasks, JSON.stringify(filtered))
  } catch (error) {
    console.error('Erreur sauvegarde tâches complétées:', error)
  }
}

/**
 * Marque une tâche comme complétée
 */
export function markTaskCompleted(taskId: string, matiere: string): void {
  const tasks = loadCompletedTasks()
  const today = new Date().toISOString().split('T')[0]
  
  // Vérifier si déjà complétée aujourd'hui
  const existing = tasks.find(t => t.taskId === taskId && t.date === today)
  if (existing) return
  
  tasks.push({
    id: `completed-${Date.now()}`,
    date: today,
    taskId,
    matiere,
    completedAt: new Date().toISOString(),
  })
  
  saveCompletedTasks(tasks)
}

/**
 * Vérifie si une tâche est complétée aujourd'hui
 */
export function isTaskCompletedToday(taskId: string): boolean {
  const tasks = loadCompletedTasks()
  const today = new Date().toISOString().split('T')[0]
  return tasks.some(t => t.taskId === taskId && t.date === today)
}

/**
 * Récupère les statistiques de complétion
 */
export function getCompletionStats(days: number = 7): {
  totalCompleted: number
  averagePerDay: number
  bySubject: Record<string, number>
} {
  const tasks = loadCompletedTasks()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  
  const recentTasks = tasks.filter(t => new Date(t.completedAt) > cutoff)
  
  const bySubject: Record<string, number> = {}
  for (const task of recentTasks) {
    bySubject[task.matiere] = (bySubject[task.matiere] || 0) + 1
  }
  
  return {
    totalCompleted: recentTasks.length,
    averagePerDay: recentTasks.length / days,
    bySubject,
  }
}

// ==========================================
// HOOK REACT POUR LA CONFIGURATION
// ==========================================

/**
 * Hook personnalisé pour gérer la configuration
 * Utilisation: const [config, setConfig] = useFocusConfig()
 */
export function createConfigManager() {
  let config = loadConfig()
  const listeners: Set<(config: FocusConfig) => void> = new Set()
  
  return {
    getConfig: () => config,
    setConfig: (newConfig: FocusConfig) => {
      config = newConfig
      saveConfig(config)
      listeners.forEach(l => l(config))
    },
    updateConfig: <K extends keyof FocusConfig>(key: K, value: FocusConfig[K]) => {
      config = { ...config, [key]: value }
      saveConfig(config)
      listeners.forEach(l => l(config))
      return config
    },
    subscribe: (listener: (config: FocusConfig) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset: () => {
      config = resetConfig()
      listeners.forEach(l => l(config))
      return config
    },
  }
}
