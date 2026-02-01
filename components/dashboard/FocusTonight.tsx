"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  BookOpen,
  FileText,
  PenTool,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { Devoir, Note, Moyenne, FocusTask, FocusPlan, PriorityReason, TaskCategory } from "@/types/pronote"
import { generateFocusPlan, DEFAULT_CONFIG } from "@/lib/focus-engine"
import { loadConfig, loadControles, markTaskCompleted, isTaskCompletedToday } from "@/lib/user-config"
import { calculateGeneralAverage } from "@/lib/grade-analysis"

interface FocusTonightProps {
  devoirs: Devoir[]
  notes: Note[]
  moyennes: Moyenne[]
  compact?: boolean // Mode compact pour le dashboard principal
}

// Icônes par type de tâche
const taskTypeIcons = {
  homework: FileText,
  exercise: PenTool,
  revision: BookOpen,
  testPrep: Target,
}

// Couleurs par type de tâche
const taskTypeColors = {
  homework: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  exercise: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  revision: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  testPrep: "bg-red-500/10 text-red-500 border-red-500/20",
}

// Labels par type de tâche
const taskTypeLabels = {
  homework: "Devoir",
  exercise: "Exercice",
  revision: "Révision",
  testPrep: "Contrôle",
}

// Configuration des catégories (v2)
const categoryConfig: Record<TaskCategory, {
  title: string
  icon: typeof Target
  colorClass: string
  bgClass: string
  borderClass: string
}> = {
  obligatoire: {
    title: "OBLIGATOIRE CE SOIR",
    icon: AlertTriangle,
    colorClass: "text-red-500",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/20",
  },
  strategique: {
    title: "RECOMMANDÉ",
    icon: Target,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
  optionnel: {
    title: "SI TU AS LE TEMPS",
    icon: Sparkles,
    colorClass: "text-green-500",
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500/20",
  },
}

/**
 * Carte d'une tâche prioritaire (v2 - justifications simplifiées)
 */
function FocusTaskCard({ 
  task, 
  onComplete,
  showCategory = false
}: { 
  task: FocusTask
  onComplete: (taskId: string) => void
  showCategory?: boolean
}) {
  const [isCompleted, setIsCompleted] = useState(false)
  const Icon = taskTypeIcons[task.type]
  const catConfig = categoryConfig[task.category]
  
  useEffect(() => {
    setIsCompleted(isTaskCompletedToday(task.id))
  }, [task.id])

  const handleComplete = () => {
    markTaskCompleted(task.id, task.matiere)
    setIsCompleted(true)
    onComplete(task.id)
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-300",
        isCompleted 
          ? "bg-muted/30 opacity-60 border-muted" 
          : "bg-card hover:bg-accent/50 border-border hover:border-primary/30"
      )}
    >
      {/* Bouton de complétion */}
      <button
        onClick={handleComplete}
        disabled={isCompleted}
        className={cn(
          "mt-1 shrink-0 transition-all duration-300",
          isCompleted ? "cursor-default" : "hover:scale-110"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
        )}
      </button>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {/* Header: Type + Matière */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
            taskTypeColors[task.type]
          )}>
            <Icon className="h-3 w-3" />
            <span>{taskTypeLabels[task.type]}</span>
          </div>
          <span className="font-semibold text-sm">{task.matiere}</span>
          {/* Indicateur critical (seulement si pas déjà dans section obligatoire) */}
          {!showCategory && task.priorityLevel === 'critical' && (
            <Badge variant="destructive" className="text-[10px] px-1.5">
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              Urgent
            </Badge>
          )}
        </div>

        {/* Titre */}
        <p className={cn(
          "font-medium text-sm mb-1",
          isCompleted && "line-through"
        )}>
          {task.title}
        </p>

        {/* Description (tronquée) */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>

        {/* Footer: Justification simplifiée + Temps */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className={cn("font-medium", catConfig.colorClass)}>
              → {task.primaryReason}
            </span>
            {task.secondaryReason && (
              <span className="text-muted-foreground">
                • {task.secondaryReason}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>{task.estimatedTime}min</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Section de tâches par catégorie
 */
function CategorySection({
  category,
  tasks,
  onComplete
}: {
  category: TaskCategory
  tasks: FocusTask[]
  onComplete: (taskId: string) => void
}) {
  if (tasks.length === 0) return null
  
  const config = categoryConfig[category]
  const CategoryIcon = config.icon
  
  return (
    <div className="space-y-3">
      {/* Header de catégorie */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        config.bgClass,
        config.borderClass,
        "border"
      )}>
        <CategoryIcon className={cn("h-4 w-4", config.colorClass)} />
        <span className={cn("text-sm font-semibold", config.colorClass)}>
          {config.title}
        </span>
        <Badge variant="outline" className={cn("ml-auto text-[10px]", config.borderClass)}>
          {tasks.length}
        </Badge>
      </div>
      
      {/* Liste des tâches */}
      <div className="space-y-2 pl-2">
        {tasks.map((task, index) => (
          <div 
            key={task.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <FocusTaskCard 
              task={task} 
              onComplete={onComplete}
              showCategory={true}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Résumé du plan de travail
 */
function PlanSummary({ 
  plan, 
  targetAverage,
  currentAverage 
}: { 
  plan: FocusPlan
  targetAverage: number
  currentAverage: number | null
}) {
  const completedTasks = plan.tasks.filter(t => t.completed || isTaskCompletedToday(t.id)).length
  const progress = plan.tasks.length > 0 ? (completedTasks / plan.tasks.length) * 100 : 0

  return (
    <div className="grid gap-3 sm:grid-cols-3 mb-4">
      {/* Temps total */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ce soir</p>
          <p className="font-bold text-lg">
            {Math.floor(plan.totalTime / 60)}h{String(plan.totalTime % 60).padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* Progression */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Avancement</p>
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg">{completedTasks}/{plan.tasks.length}</p>
            <Progress value={progress} className="h-1.5 flex-1" />
          </div>
        </div>
      </div>

      {/* Moyenne cible */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Target className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Objectif</p>
          <div className="flex items-center gap-1">
            <p className="font-bold text-lg">{targetAverage}/20</p>
            {currentAverage !== null && (
              <span className={cn(
                "text-xs",
                currentAverage >= targetAverage ? "text-green-500" : "text-amber-500"
              )}>
                ({currentAverage >= targetAverage ? "+" : ""}{(currentAverage - targetAverage).toFixed(1)})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Composant principal Focus Tonight
 */
export function FocusTonight({ devoirs, notes, moyennes, compact = false }: FocusTonightProps) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [controles, setControles] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Charger la configuration au montage
  useEffect(() => {
    setConfig(loadConfig())
    setControles(loadControles())
  }, [])

  // Générer le plan de travail
  const plan = useMemo(() => {
    return generateFocusPlan(devoirs, notes, moyennes, controles, config)
  }, [devoirs, notes, moyennes, controles, config, refreshKey])

  // Calculer la moyenne générale
  const currentAverage = useMemo(() => {
    return calculateGeneralAverage(moyennes)
  }, [moyennes])

  // Handler pour marquer une tâche comme complétée
  const handleComplete = (taskId: string) => {
    setRefreshKey(k => k + 1)
  }

  // Mode compact pour le dashboard
  if (compact) {
    // En mode compact, afficher les 3 premières tâches prioritaires
    // avec préférence pour les obligatoires
    const compactTasks = [
      ...plan.tasksByCategory.obligatoire,
      ...plan.tasksByCategory.strategique,
      ...plan.tasksByCategory.optionnel,
    ].slice(0, 3)
    
    const obligatoireCount = plan.tasksByCategory.obligatoire.length
    
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Focus Tonight</CardTitle>
                <CardDescription>
                  {obligatoireCount > 0 
                    ? `${obligatoireCount} obligatoire${obligatoireCount > 1 ? 's' : ''}, ${plan.tasks.length - obligatoireCount} autre${plan.tasks.length - obligatoireCount > 1 ? 's' : ''}`
                    : `${plan.tasks.length} tâche${plan.tasks.length > 1 ? 's' : ''} recommandée${plan.tasks.length > 1 ? 's' : ''}`
                  }
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <a href="/dashboard/focus">
                Voir tout
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Afficher max 3 tâches en mode compact */}
          <div className="space-y-2">
            {compactTasks.map(task => (
              <FocusTaskCard 
                key={task.id} 
                task={task} 
                onComplete={handleComplete}
              />
            ))}
          </div>

          {/* Warnings */}
          {plan.warnings.length > 0 && (
            <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-600">
                {plan.warnings[0]}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Mode plein écran
  return (
    <div className="space-y-6">
      {/* Header avec résumé */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          Focus Tonight
        </h1>
        <p className="text-muted-foreground">
          Voici ce que tu dois faire ce soir pour rester au top.
        </p>
      </div>

      {/* Résumé du plan */}
      <PlanSummary 
        plan={plan} 
        targetAverage={config.targetAverage}
        currentAverage={currentAverage}
      />

      {/* Warnings et Recommandations */}
      {(plan.warnings.length > 0 || plan.recommendations.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{warning}</p>
            </div>
          ))}
          {plan.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-600">{rec}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liste des tâches par catégorie */}
      <Card>
        <CardHeader>
          <CardTitle>Ton plan de travail</CardTitle>
          <CardDescription>
            {plan.tasks.length} tâche{plan.tasks.length > 1 ? 's' : ''} • 
            Temps estimé: {Math.floor(plan.totalTime / 60)}h{String(plan.totalTime % 60).padStart(2, '0')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plan.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-lg font-medium text-green-600 mb-1">
                Tout est fait !
              </p>
              <p className="text-sm text-muted-foreground">
                Tu n'as aucune tâche prioritaire ce soir. Profite de ton temps libre !
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tâches OBLIGATOIRES */}
              <CategorySection
                category="obligatoire"
                tasks={plan.tasksByCategory.obligatoire}
                onComplete={handleComplete}
              />
              
              {/* Tâches STRATEGIQUES */}
              <CategorySection
                category="strategique"
                tasks={plan.tasksByCategory.strategique}
                onComplete={handleComplete}
              />
              
              {/* Tâches OPTIONNELLES */}
              <CategorySection
                category="optionnel"
                tasks={plan.tasksByCategory.optionnel}
                onComplete={handleComplete}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
