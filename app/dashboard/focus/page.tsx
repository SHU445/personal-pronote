"use client"

import { useContext, useState, useEffect, useMemo } from "react"
import { DataContext } from "../layout"
import { FocusTonight } from "@/components/dashboard/FocusTonight"
import { GradeSimulator } from "@/components/dashboard/GradeSimulator"
import { ControleForm } from "@/components/dashboard/ControleForm"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Calculator, Settings } from "lucide-react"
import { loadControles } from "@/lib/user-config"
import type { Controle } from "@/types/pronote"

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Summary skeleton */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} hover={false}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasks skeleton */}
      <Card hover={false}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function FocusPage() {
  const { data, loading } = useContext(DataContext)
  const [controles, setControles] = useState<Controle[]>([])
  const [planRefreshKey, setPlanRefreshKey] = useState(0)

  useEffect(() => {
    setControles(loadControles())
  }, [])

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  const handleControleAdded = () => {
    setControles(loadControles())
    setPlanRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tonight" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tonight" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ce soir</span>
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Simulateur</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Paramètres</span>
          </TabsTrigger>
        </TabsList>

        {/* Focus Tonight - planRefreshKey force le recalcul du plan avec les derniers contrôles (localStorage) */}
        <TabsContent value="tonight" className="space-y-6 mt-0">
          <FocusTonight
            devoirs={data.devoirs || []}
            notes={data.notes || []}
            moyennes={data.moyennes || []}
            lessons={data.lessons || []}
            controles={controles}
            planRefreshKey={planRefreshKey}
          />
          
          {/* Contrôles à venir */}
          <ControleForm onControleAdded={handleControleAdded} />
        </TabsContent>

        {/* Simulateur de notes */}
        <TabsContent value="simulator" className="mt-0">
          <GradeSimulator
            notes={data.notes || []}
            moyennes={data.moyennes || []}
          />
        </TabsContent>

        {/* Paramètres */}
        <TabsContent value="settings" className="mt-0">
          <FocusSettings
            lessons={data.lessons || []}
            devoirs={data.devoirs || []}
            moyennes={data.moyennes || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Composant de configuration Focus Tonight
 */
function FocusSettings({
  lessons,
  devoirs,
  moyennes,
}: {
  lessons: import('@/types/pronote').Lesson[]
  devoirs: import('@/types/pronote').Devoir[]
  moyennes: import('@/types/pronote').Moyenne[]
}) {
  const [config, setConfig] = useState(() => {
    if (typeof window === 'undefined') {
      const { DEFAULT_CONFIG } = require('@/lib/focus-engine')
      return DEFAULT_CONFIG
    }
    const { loadConfig } = require('@/lib/user-config')
    return loadConfig()
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const { saveConfig } = require('@/lib/user-config')
    saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    const { resetConfig } = require('@/lib/user-config')
    setConfig(resetConfig())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateField = <K extends keyof typeof config>(key: K, value: typeof config[K]) => {
    setConfig({ ...config, [key]: value })
  }

  // Matières : EDT en priorité, puis devoirs/moyennes
  const allSubjects = useMemo(() => {
    const { getSubjectsFromLessons, normalizeSubject } = require('@/lib/focus-engine')
    const set = new Set<string>()
    getSubjectsFromLessons(lessons).forEach((s: string) => set.add(s))
    devoirs.forEach(d => set.add(normalizeSubject(d.matiere)))
    moyennes.forEach(m => set.add(normalizeSubject(m.matiere)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [lessons, devoirs, moyennes])

  const setSubjectPriority = (matiere: string, priority: number) => {
    const next = { ...(config.subjectPriorities ?? {}), [matiere]: priority }
    setConfig({ ...config, subjectPriorities: next })
  }
  const setRevisionDisabled = (matiere: string, disabled: boolean) => {
    const current = config.disabledRevisionSubjects ?? []
    const next = disabled
      ? [...current, matiere]
      : current.filter((m: string) => m !== matiere)
    setConfig({ ...config, disabledRevisionSubjects: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Paramètres Focus Tonight</h1>
        <p className="text-muted-foreground">
          Personnalise le comportement du moteur de décision selon tes contraintes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Temps de travail */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Temps de travail</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Temps maximum par soir (minutes)
              </label>
              <input
                type="range"
                min="30"
                max="180"
                step="15"
                value={config.maxWorkTimePerNight}
                onChange={e => updateField('maxWorkTimePerNight', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>30 min</span>
                <span className="font-medium text-foreground">
                  {Math.floor(config.maxWorkTimePerNight / 60)}h{String(config.maxWorkTimePerNight % 60).padStart(2, '0')}
                </span>
                <span>3h</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre max de matières par soir
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={config.maxSubjectsPerNight}
                onChange={e => updateField('maxSubjectsPerNight', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1</span>
                <span className="font-medium text-foreground">{config.maxSubjectsPerNight} matières</span>
                <span>6</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anticipation */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Anticipation</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Jours d'anticipation (devoirs)
              </label>
              <input
                type="range"
                min="1"
                max="14"
                value={config.anticipationDays}
                onChange={e => updateField('anticipationDays', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1 jour</span>
                <span className="font-medium text-foreground">J-{config.anticipationDays}</span>
                <span>14 jours</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Jours de préparation avant un contrôle
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={config.testPrepDays}
                onChange={e => updateField('testPrepDays', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1 jour</span>
                <span className="font-medium text-foreground">{config.testPrepDays} jours avant</span>
                <span>7 jours</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objectifs */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Objectifs</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Moyenne générale cible
              </label>
              <input
                type="range"
                min="10"
                max="20"
                step="0.5"
                value={config.targetAverage}
                onChange={e => updateField('targetAverage', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>10/20</span>
                <span className="font-medium text-foreground">{config.targetAverage}/20</span>
                <span>20/20</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Options</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.allowWeekendWork}
                onChange={e => updateField('allowWeekendWork', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">Autoriser le travail le weekend</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.allowOverloadNights}
                onChange={e => updateField('allowOverloadNights', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                Autoriser les soirées exceptionnellement chargées
              </span>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Matières : priorité et révisions */}
      {allSubjects.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold">Matières (révisions de cours)</h3>
            <CardDescription>
              Priorité pour les révisions de cours (issues de l&apos;emploi du temps). Les devoirs ne sont jamais ignorés, même si une matière est désactivée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allSubjects.map((matiere) => {
                const priority = config.subjectPriorities?.[matiere] ?? 3
                const revisionDisabled = (config.disabledRevisionSubjects ?? []).includes(matiere)
                return (
                  <div
                    key={matiere}
                    className="flex flex-wrap items-center gap-4 p-3 rounded-xl border bg-card"
                  >
                    <span className="font-medium min-w-[140px]">{matiere}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Priorité révision</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={priority}
                        onChange={e => setSubjectPriority(matiere, parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm font-medium w-6">{priority}/5</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={revisionDisabled}
                        onChange={e => setRevisionDisabled(matiere, e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm text-muted-foreground">
                        Ignorer les révisions (les devoirs restent affichés)
                      </span>
                    </label>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons de sauvegarde */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Réinitialiser
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
