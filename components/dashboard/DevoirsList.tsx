"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, Circle, Calendar, FileText, Filter } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Devoir } from "@/types/pronote"
import { formatDate } from "@/lib/utils"

interface DevoirsListProps {
  devoirs: Devoir[]
}

type FilterType = "upcoming" | "todo" | "done" | "late"

/**
 * Vérifie si une date est passée (avant aujourd'hui à minuit)
 */
function isDatePast(dateString: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Vérifie si une date est aujourd'hui ou dans le futur
 */
function isDateTodayOrFuture(dateString: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0)
  return date >= today
}

export function DevoirsList({ devoirs }: DevoirsListProps) {
  const [filter, setFilter] = useState<FilterType>("upcoming")

  // Pré-filtrer pour n'avoir que les devoirs pertinents (aujourd'hui et futur + en retard non faits)
  const relevantDevoirs = useMemo(() => {
    return devoirs.filter(d => {
      // Toujours inclure les devoirs à partir d'aujourd'hui
      if (isDateTodayOrFuture(d.date_rendu)) return true
      // Inclure les devoirs en retard non faits
      if (!d.fait && isDatePast(d.date_rendu)) return true
      // Exclure les devoirs passés qui sont faits
      return false
    })
  }, [devoirs])

  // Filtrer selon le filtre sélectionné
  const filteredDevoirs = relevantDevoirs.filter((d) => {
    switch (filter) {
      case "upcoming":
        // Devoirs à venir (aujourd'hui et futur) non faits
        return !d.fait && isDateTodayOrFuture(d.date_rendu)
      case "todo":
        return !d.fait
      case "done":
        return d.fait
      case "late":
        return !d.fait && isDatePast(d.date_rendu)
      default:
        return true
    }
  })

  // Trier par date
  const sortedDevoirs = [...filteredDevoirs].sort(
    (a, b) => new Date(a.date_rendu).getTime() - new Date(b.date_rendu).getTime()
  )

  // Grouper par date
  const groupedByDate = sortedDevoirs.reduce((acc, devoir) => {
    const date = devoir.date_rendu
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(devoir)
    return acc
  }, {} as Record<string, Devoir[]>)

  // Compter seulement les devoirs pertinents
  const counts = {
    upcoming: relevantDevoirs.filter((d) => !d.fait && isDateTodayOrFuture(d.date_rendu)).length,
    todo: relevantDevoirs.filter((d) => !d.fait).length,
    done: relevantDevoirs.filter((d) => d.fait).length,
    late: relevantDevoirs.filter((d) => !d.fait && isDatePast(d.date_rendu)).length,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Devoirs</CardTitle>
            <CardDescription>
              {counts.upcoming} à venir, {counts.done} terminé(s)
              {counts.late > 0 && `, ${counts.late} en retard`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("upcoming")}
            >
              À venir ({counts.upcoming})
            </Button>
            <Button
              variant={filter === "todo" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("todo")}
            >
              Tous à faire ({counts.todo})
            </Button>
            <Button
              variant={filter === "done" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("done")}
            >
              Terminés ({counts.done})
            </Button>
            {counts.late > 0 && (
              <Button
                variant={filter === "late" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setFilter("late")}
              >
                En retard ({counts.late})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mr-2 text-green-500" />
            <span>Aucun devoir a afficher</span>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, devoirsForDate]) => {
              const late = isDatePast(date)
              
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className={`font-medium ${late ? "text-red-500" : ""}`}>
                      {formatDate(date)}
                    </h3>
                    {late && (
                      <Badge variant="destructive" className="text-xs">
                        Passé
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-3 ml-6">
                    {devoirsForDate.map((devoir, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                          devoir.fait ? "opacity-60" : ""
                        }`}
                      >
                        {devoir.fait ? (
                          <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium">
                              {devoir.matiere.split(" > ")[0]}
                            </span>
                            {devoir.fait && (
                              <Badge variant="success" className="text-xs">
                                Fait
                              </Badge>
                            )}
                            {!devoir.fait && late && (
                              <Badge variant="destructive" className="text-xs">
                                En retard
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {devoir.description}
                          </p>
                          {devoir.fichiers && devoir.fichiers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {devoir.fichiers.map((fichier, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {fichier}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
