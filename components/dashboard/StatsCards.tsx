"use client"

import { BookOpen, GraduationCap, ClipboardList, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Note, Moyenne, Devoir } from "@/types/pronote"
import { parseNote, getMoyenneColor } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface StatsCardsProps {
  notes: Note[]
  moyennes: Moyenne[]
  devoirs: Devoir[]
}

export function StatsCards({ notes, moyennes, devoirs }: StatsCardsProps) {
  // Calculer la moyenne generale
  const moyenneGenerale = (() => {
    const validMoyennes = moyennes
      .map((m) => parseNote(m.moyenne_eleve))
      .filter((n): n is number => n !== null)
    
    if (validMoyennes.length === 0) return null
    return validMoyennes.reduce((a, b) => a + b, 0) / validMoyennes.length
  })()

  // Compter les devoirs a faire
  const devoirsAFaire = devoirs.filter((d) => !d.fait).length

  // Trouver la meilleure moyenne
  const meilleureMoyenne = (() => {
    let best: { matiere: string; moyenne: number } | null = null
    for (const m of moyennes) {
      const val = parseNote(m.moyenne_eleve)
      if (val !== null && (!best || val > best.moyenne)) {
        best = { matiere: m.matiere.split(" > ")[0], moyenne: val }
      }
    }
    return best
  })()

  const stats = [
    {
      title: "Notes",
      value: notes.length.toString(),
      description: "notes ce trimestre",
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Moyenne générale",
      value: moyenneGenerale ? moyenneGenerale.toFixed(2) : "-",
      description: moyenneGenerale 
        ? (moyenneGenerale >= 14 ? "Excellent" : moyenneGenerale >= 10 ? "Correct" : "À améliorer")
        : "",
      icon: GraduationCap,
      color: moyenneGenerale ? getMoyenneColor(moyenneGenerale) : "text-muted-foreground",
      bgColor: moyenneGenerale 
        ? (moyenneGenerale >= 14 ? "bg-green-500/10" : moyenneGenerale >= 10 ? "bg-yellow-500/10" : "bg-red-500/10")
        : "bg-muted/50",
      borderColor: moyenneGenerale
        ? (moyenneGenerale >= 14 ? "border-green-500/20" : moyenneGenerale >= 10 ? "border-yellow-500/20" : "border-red-500/20")
        : "border-border",
    },
    {
      title: "Devoirs à faire",
      value: devoirsAFaire.toString(),
      description: devoirsAFaire > 0 ? "à rendre" : "tout est fait !",
      icon: ClipboardList,
      color: devoirsAFaire > 3 ? "text-red-500" : devoirsAFaire > 0 ? "text-amber-500" : "text-green-500",
      bgColor: devoirsAFaire > 3 ? "bg-red-500/10" : devoirsAFaire > 0 ? "bg-amber-500/10" : "bg-green-500/10",
      borderColor: devoirsAFaire > 3 ? "border-red-500/20" : devoirsAFaire > 0 ? "border-amber-500/20" : "border-green-500/20",
    },
    {
      title: "Meilleure moyenne",
      value: meilleureMoyenne ? meilleureMoyenne.moyenne.toFixed(2) : "-",
      description: meilleureMoyenne ? meilleureMoyenne.matiere : "",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
      {stats.map((stat, index) => (
        <Card 
          key={stat.title} 
          className={cn(
            "relative overflow-hidden border-2",
            stat.borderColor
          )}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {/* Gradient background subtil */}
          <div className={cn(
            "absolute inset-0 opacity-50",
            stat.bgColor
          )} />
          
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <div className={cn("text-3xl font-bold tracking-tight", stat.color)}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {stat.description}
                </p>
              </div>
              
              <div className={cn(
                "rounded-xl p-3 transition-transform duration-300 hover:scale-110",
                stat.bgColor
              )}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
