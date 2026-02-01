"use client"

import { UserX, Clock, Calendar, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Absence, Retard } from "@/types/pronote"
import { formatDate, formatTime } from "@/lib/utils"

interface AbsencesListProps {
  absences: Absence[]
  retards: Retard[]
}

export function AbsencesList({ absences, retards }: AbsencesListProps) {
  // Trier par date (plus recentes d'abord)
  const sortedAbsences = [...absences].sort(
    (a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime()
  )

  const sortedRetards = [...retards].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const absencesNonJustifiees = absences.filter((a) => !a.justifie).length
  const retardsNonJustifies = retards.filter((r) => !r.justifie).length

  const totalHeures = absences.reduce((acc, a) => acc + (a.heures || 0), 0)
  const totalMinutes = retards.reduce((acc, r) => acc + (r.minutes || 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absences.length}</div>
            <p className="text-xs text-muted-foreground">
              {absencesNonJustifiees > 0
                ? `${absencesNonJustifiees} non justifiee(s)`
                : "Toutes justifiees"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Heures d&apos;absence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHeures.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Total ce trimestre</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Retards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retards.length}</div>
            <p className="text-xs text-muted-foreground">
              {retardsNonJustifies > 0
                ? `${retardsNonJustifies} non justifie(s)`
                : "Tous justifies"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Minutes de retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMinutes} min</div>
            <p className="text-xs text-muted-foreground">Total ce trimestre</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Absences & Retards</CardTitle>
          <CardDescription>Historique de vos absences et retards</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="absences">
            <TabsList>
              <TabsTrigger value="absences">
                Absences ({absences.length})
              </TabsTrigger>
              <TabsTrigger value="retards">
                Retards ({retards.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="absences" className="mt-4">
              {sortedAbsences.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mr-2 text-green-500" />
                  <span>Aucune absence</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAbsences.map((absence, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                    >
                      <UserX
                        className={`h-5 w-5 mt-0.5 shrink-0 ${
                          absence.justifie ? "text-green-500" : "text-red-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">
                            {formatDate(absence.date_debut)}
                            {absence.date_fin !== absence.date_debut &&
                              ` - ${formatDate(absence.date_fin)}`}
                          </span>
                          <Badge
                            variant={absence.justifie ? "success" : "destructive"}
                            className="text-xs"
                          >
                            {absence.justifie ? "Justifiee" : "Non justifiee"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {absence.heures}h
                          </span>
                          {absence.motif && (
                            <span>Motif: {absence.motif}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="retards" className="mt-4">
              {sortedRetards.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mr-2 text-green-500" />
                  <span>Aucun retard</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedRetards.map((retard, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                    >
                      <Clock
                        className={`h-5 w-5 mt-0.5 shrink-0 ${
                          retard.justifie ? "text-green-500" : "text-yellow-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">
                            {formatDate(retard.date)}
                          </span>
                          <Badge
                            variant={retard.justifie ? "success" : "warning"}
                            className="text-xs"
                          >
                            {retard.justifie ? "Justifie" : "Non justifie"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {retard.minutes} minutes
                          </span>
                          {retard.motif && (
                            <span>Motif: {retard.motif}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
