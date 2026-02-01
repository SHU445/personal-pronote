"use client"

import { useState } from "react"
import { Plus, Calendar, Trash2, BookOpen, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Controle } from "@/types/pronote"
import { addControle, deleteControle, getUpcomingControles } from "@/lib/user-config"
import { getDaysUntil } from "@/lib/focus-engine"

interface ControleFormProps {
  onControleAdded?: () => void
}

/**
 * Formulaire d'ajout de contrôle
 */
function AddControleForm({ onAdd }: { onAdd: (controle: Controle) => void }) {
  const [matiere, setMatiere] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'ds' | 'interro' | 'oral' | 'tp'>('interro')
  const [description, setDescription] = useState('')
  const [dureeRevision, setDureeRevision] = useState('45')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!matiere || !date) return

    const newControle = addControle({
      matiere: matiere.toUpperCase(),
      date,
      type,
      description: description || undefined,
      dureeRevision: parseInt(dureeRevision) || 45,
      prepCompleted: false,
    })

    onAdd(newControle)

    // Reset form
    setMatiere('')
    setDate('')
    setDescription('')
    setDureeRevision('45')
  }

  // Date minimum = aujourd'hui
  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="matiere">Matière *</Label>
          <Input
            id="matiere"
            placeholder="Ex: Mathématiques"
            value={matiere}
            onChange={e => setMatiere(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date du contrôle *</Label>
          <Input
            id="date"
            type="date"
            min={today}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            value={type}
            onChange={e => setType(e.target.value as any)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="interro">Interrogation</option>
            <option value="ds">DS (Devoir Surveillé)</option>
            <option value="oral">Oral</option>
            <option value="tp">TP Noté</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duree">Temps de révision (min)</Label>
          <Input
            id="duree"
            type="number"
            min="15"
            step="15"
            placeholder="45"
            value={dureeRevision}
            onChange={e => setDureeRevision(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea
          id="description"
          placeholder="Chapitres à réviser, notions importantes..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter le contrôle
      </Button>
    </form>
  )
}

/**
 * Carte d'un contrôle
 */
function ControleCard({ 
  controle, 
  onDelete 
}: { 
  controle: Controle
  onDelete: (id: string) => void
}) {
  const daysUntil = getDaysUntil(controle.date)
  
  const typeLabels = {
    ds: 'DS',
    interro: 'Interro',
    oral: 'Oral',
    tp: 'TP',
  }

  const typeColors = {
    ds: 'bg-red-500/10 text-red-500 border-red-500/20',
    interro: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    oral: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    tp: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  }

  const urgencyClass = daysUntil <= 1 
    ? 'border-red-500/30 bg-red-500/5' 
    : daysUntil <= 3 
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-border'

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-xl border-2 transition-all",
      urgencyClass
    )}>
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        typeColors[controle.type]
      )}>
        <BookOpen className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge 
            variant="outline" 
            className={cn("text-xs", typeColors[controle.type])}
          >
            {typeLabels[controle.type]}
          </Badge>
          <span className="font-semibold text-sm">{controle.matiere}</span>
        </div>

        {controle.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {controle.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(controle.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{controle.dureeRevision}min révision</span>
          </div>
          {daysUntil <= 3 && (
            <Badge 
              variant={daysUntil <= 1 ? 'destructive' : 'outline'}
              className="text-[10px]"
            >
              {daysUntil === 0 ? "Aujourd'hui !" : 
               daysUntil === 1 ? "Demain" : 
               `Dans ${daysUntil} jours`}
            </Badge>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(controle.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Composant principal de gestion des contrôles
 */
export function ControleForm({ onControleAdded }: ControleFormProps) {
  const [controles, setControles] = useState<Controle[]>(() => getUpcomingControles())
  const [showForm, setShowForm] = useState(false)

  const handleAdd = (controle: Controle) => {
    setControles(getUpcomingControles())
    setShowForm(false)
    onControleAdded?.()
  }

  const handleDelete = (id: string) => {
    deleteControle(id)
    setControles(getUpcomingControles())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Contrôles à venir
            </CardTitle>
            <CardDescription>
              {controles.length} contrôle{controles.length > 1 ? 's' : ''} programmé{controles.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Annuler' : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulaire d'ajout */}
        {showForm && (
          <div className="p-4 rounded-xl bg-muted/50 border border-dashed">
            <AddControleForm onAdd={handleAdd} />
          </div>
        )}

        {/* Liste des contrôles */}
        {controles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aucun contrôle programmé
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoute tes contrôles pour que Focus Tonight les intègre à ta planification
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {controles.map(controle => (
              <ControleCard 
                key={controle.id} 
                controle={controle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
