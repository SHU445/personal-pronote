"use client"

import { useState, useMemo } from "react"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Info,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Note, Moyenne, GradeSimulation, SubjectAnalysis } from "@/types/pronote"
import { simulateNewGrade, calculateRequiredGrade, analyzeAllSubjects, calculateGeneralAverage } from "@/lib/grade-analysis"
import { loadConfig } from "@/lib/user-config"

interface GradeSimulatorProps {
  notes: Note[]
  moyennes: Moyenne[]
}

/**
 * Carte d'analyse d'une matière
 */
function SubjectCard({ analysis }: { analysis: SubjectAnalysis }) {
  const TrendIcon = analysis.trend === 'up' 
    ? TrendingUp 
    : analysis.trend === 'down' 
      ? TrendingDown 
      : Minus

  const trendColor = analysis.trend === 'up'
    ? 'text-green-500'
    : analysis.trend === 'down'
      ? 'text-red-500'
      : 'text-muted-foreground'

  const priorityColors = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-border bg-card',
  }

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all",
      priorityColors[analysis.priority]
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-sm">{analysis.matiere}</h4>
          {analysis.needsAttention && (
            <Badge variant="outline" className="text-[10px] mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              Attention requise
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={cn("h-4 w-4", trendColor)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Ma moyenne</p>
          <p className={cn(
            "font-bold",
            analysis.moyenneEleve !== null
              ? analysis.moyenneEleve >= 14 
                ? 'text-green-500' 
                : analysis.moyenneEleve >= 10 
                  ? 'text-amber-500' 
                  : 'text-red-500'
              : 'text-muted-foreground'
          )}>
            {analysis.moyenneEleve?.toFixed(2) || '-'}/20
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Classe</p>
          <p className="font-medium">
            {analysis.moyenneClasse?.toFixed(2) || '-'}/20
          </p>
        </div>
      </div>

      {analysis.ecartCible !== null && (
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">Écart à l'objectif</p>
          <p className={cn(
            "font-semibold",
            analysis.ecartCible >= 0 ? 'text-green-500' : 'text-red-500'
          )}>
            {analysis.ecartCible >= 0 ? '+' : ''}{analysis.ecartCible.toFixed(2)} pts
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Formulaire de simulation
 */
function SimulationForm({ 
  moyennes, 
  notes,
  onSimulate 
}: { 
  moyennes: Moyenne[]
  notes: Note[]
  onSimulate: (simulation: GradeSimulation | null) => void 
}) {
  const [selectedSubject, setSelectedSubject] = useState('')
  const [noteValue, setNoteValue] = useState('')
  const [bareme, setBareme] = useState('20')
  const [coefficient, setCoefficient] = useState('1')

  const config = loadConfig()

  // Liste des matières disponibles
  const subjects = useMemo(() => {
    const set = new Set<string>()
    moyennes.forEach(m => {
      const name = (m.matiere || "").split(" > ")[0].trim()
      if (name) set.add(name)
    })
    return Array.from(set).sort()
  }, [moyennes])

  const handleSimulate = () => {
    if (!selectedSubject || !noteValue) return

    const simulation = simulateNewGrade(
      selectedSubject,
      parseFloat(noteValue),
      parseFloat(bareme) || 20,
      parseFloat(coefficient) || 1,
      notes,
      moyennes,
      config.targetAverage
    )

    onSimulate(simulation)
  }

  const handleCalculateRequired = () => {
    if (!selectedSubject) return

    const required = calculateRequiredGrade(
      selectedSubject,
      config.targetAverage,
      parseFloat(coefficient) || 1,
      parseFloat(bareme) || 20,
      notes,
      moyennes
    )

    if (required !== null) {
      setNoteValue(required.toString())
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Matière</Label>
        <select
          id="subject"
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Sélectionner une matière</option>
          {subjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <Input
            id="note"
            type="number"
            min="0"
            max={bareme}
            step="0.5"
            placeholder="12"
            value={noteValue}
            onChange={e => setNoteValue(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bareme">Barème</Label>
          <Input
            id="bareme"
            type="number"
            min="1"
            placeholder="20"
            value={bareme}
            onChange={e => setBareme(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coef">Coef</Label>
          <Input
            id="coef"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="1"
            value={coefficient}
            onChange={e => setCoefficient(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleSimulate}
          disabled={!selectedSubject || !noteValue}
          className="flex-1"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Simuler
        </Button>
        <Button 
          variant="outline"
          onClick={handleCalculateRequired}
          disabled={!selectedSubject}
        >
          <Target className="h-4 w-4 mr-2" />
          Note requise
        </Button>
      </div>
    </div>
  )
}

/**
 * Affichage du résultat de simulation
 */
function SimulationResult({ simulation }: { simulation: GradeSimulation }) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border-2 border-primary/20">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        Résultat de la simulation
      </h4>

      <div className="grid gap-3">
        {/* Note simulée */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
          <span className="text-sm text-muted-foreground">Note simulée</span>
          <span className="font-bold">
            {simulation.simulatedNote}/{simulation.bareme} (coef {simulation.coefficient})
          </span>
        </div>

        {/* Impact matière */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
          <span className="text-sm text-muted-foreground">Nouvelle moyenne {simulation.matiere}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold">{simulation.newAverage.toFixed(2)}/20</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                simulation.impact >= 0 
                  ? "bg-green-500/10 text-green-600 border-green-500/20" 
                  : "bg-red-500/10 text-red-600 border-red-500/20"
              )}
            >
              {simulation.impact >= 0 ? '+' : ''}{simulation.impact.toFixed(2)}
            </Badge>
          </div>
        </div>

        {/* Impact général */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
          <span className="text-sm text-muted-foreground">Nouvelle moyenne générale</span>
          <div className="flex items-center gap-2">
            <span className="font-bold">{simulation.newGeneralAverage.toFixed(2)}/20</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                simulation.generalImpact >= 0 
                  ? "bg-green-500/10 text-green-600 border-green-500/20" 
                  : "bg-red-500/10 text-red-600 border-red-500/20"
              )}
            >
              {simulation.generalImpact >= 0 ? '+' : ''}{simulation.generalImpact.toFixed(2)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Composant principal du simulateur de notes
 */
export function GradeSimulator({ notes, moyennes }: GradeSimulatorProps) {
  const [simulation, setSimulation] = useState<GradeSimulation | null>(null)
  const config = loadConfig()

  // Analyser toutes les matières
  const analyses = useMemo(() => {
    return analyzeAllSubjects(notes, moyennes, config.targetAverage)
  }, [notes, moyennes, config.targetAverage])

  // Moyenne générale actuelle
  const currentAverage = useMemo(() => {
    return calculateGeneralAverage(moyennes)
  }, [moyennes])

  // Matières prioritaires (qui nécessitent attention)
  const prioritySubjects = useMemo(() => {
    return Array.from(analyses.values())
      .filter(a => a.needsAttention)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
  }, [analyses])

  return (
    <div className="space-y-6">
      {/* En-tête avec moyenne générale */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Moyenne générale actuelle</p>
              <p className={cn(
                "text-4xl font-bold",
                currentAverage !== null
                  ? currentAverage >= config.targetAverage
                    ? 'text-green-500'
                    : currentAverage >= 12
                      ? 'text-amber-500'
                      : 'text-red-500'
                  : 'text-muted-foreground'
              )}>
                {currentAverage?.toFixed(2) || '-'}/20
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Objectif</p>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                <p className="text-2xl font-bold">{config.targetAverage}/20</p>
              </div>
              {currentAverage !== null && (
                <p className={cn(
                  "text-sm mt-1",
                  currentAverage >= config.targetAverage ? 'text-green-500' : 'text-amber-500'
                )}>
                  {currentAverage >= config.targetAverage 
                    ? `+${(currentAverage - config.targetAverage).toFixed(2)} au-dessus`
                    : `${(config.targetAverage - currentAverage).toFixed(2)} à rattraper`
                  }
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Simulateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Simuler une note
            </CardTitle>
            <CardDescription>
              Visualise l'impact d'une future note sur tes moyennes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SimulationForm 
              moyennes={moyennes}
              notes={notes}
              onSimulate={setSimulation}
            />
            {simulation && <SimulationResult simulation={simulation} />}
          </CardContent>
        </Card>

        {/* Matières prioritaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Matières à surveiller
            </CardTitle>
            <CardDescription>
              {prioritySubjects.length} matière{prioritySubjects.length > 1 ? 's' : ''} nécessite{prioritySubjects.length > 1 ? 'nt' : ''} ton attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prioritySubjects.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <Info className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-600">
                  Toutes tes matières sont au-dessus de l'objectif. Continue comme ça !
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {prioritySubjects.slice(0, 4).map((analysis, idx) => (
                  <SubjectCard key={`priority-${idx}-${analysis.matiere}`} analysis={analysis} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vue de toutes les matières */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse par matière</CardTitle>
          <CardDescription>
            Vue d'ensemble de tes performances dans chaque matière
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(analyses.values())
              .sort((a, b) => (b.moyenneEleve || 0) - (a.moyenneEleve || 0))
              .map((analysis, idx) => (
                <SubjectCard key={`subject-${idx}-${analysis.matiere}`} analysis={analysis} />
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
