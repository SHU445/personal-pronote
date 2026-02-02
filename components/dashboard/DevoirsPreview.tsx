"use client"

import { useMemo } from "react"
import { CheckCircle2, Circle, Calendar, ArrowRight, ClipboardList, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Devoir } from "@/types/pronote"
import { formatDate, cn, htmlToPlainText } from "@/lib/utils"

interface DevoirsPreviewProps {
  devoirs: Devoir[]
}

export function DevoirsPreview({ devoirs }: DevoirsPreviewProps) {
  // Fonction helper pour vérifier si une date est passée
  const isDatePast = (dateString: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    return date < today
  }

  // Filtrer et trier les devoirs pertinents (non faits uniquement)
  const prochains = useMemo(() => {
    return devoirs
      .filter((d) => !d.fait) // Seulement les devoirs non faits
      .sort((a, b) => new Date(a.date_rendu).getTime() - new Date(b.date_rendu).getTime())
      .slice(0, 5)
  }, [devoirs])

  const getDaysUntil = (date: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const diff = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return "En retard"
    if (diff === 0) return "Aujourd'hui"
    if (diff === 1) return "Demain"
    return `Dans ${diff} jours`
  }

  if (prochains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle>Prochains devoirs</CardTitle>
              <CardDescription>Aucun devoir à faire</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm font-medium">Tout est à jour !</p>
            <p className="text-xs text-muted-foreground mt-1">Profitez de votre temps libre</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <ClipboardList className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <CardTitle>Prochains devoirs</CardTitle>
            <CardDescription>{prochains.length} devoir(s) à faire</CardDescription>
          </div>
        </div>
        <Link href="/dashboard/devoirs">
          <Button variant="ghost" size="sm" className="group">
            Voir tout
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {prochains.map((devoir, index) => {
            const late = isDatePast(devoir.date_rendu)
            return (
              <div
                key={`devoir-${devoir.date_rendu}-${(devoir.matiere || "").slice(0, 20)}-${index}`}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-xl border transition-all duration-300",
                  "hover:shadow-md hover:-translate-y-0.5",
                  late 
                    ? "bg-destructive/5 border-destructive/20 hover:border-destructive/30" 
                    : "bg-card hover:bg-accent/30 border-border/50"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  late ? "bg-destructive/10" : "bg-muted/50 group-hover:bg-primary/10"
                )}>
                  {late ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {(devoir.matiere || "—").split(" > ")[0]}
                    </span>
                    {late && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        En retard
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {htmlToPlainText(devoir.description)}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(devoir.date_rendu)}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      late 
                        ? "bg-destructive/10 text-destructive" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {getDaysUntil(devoir.date_rendu)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
