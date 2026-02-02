"use client"

import { ArrowRight, GraduationCap, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Note } from "@/types/pronote"
import { formatDate, parseNote, getNoteColor, cn } from "@/lib/utils"

interface RecentNotesProps {
  notes: Note[]
}

export function RecentNotes({ notes }: RecentNotesProps) {
  // Trier par date et prendre les 5 dernieres
  const recentes = [...notes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const getNoteIcon = (note: number, bareme: number) => {
    const ratio = note / bareme
    if (ratio >= 0.7) return TrendingUp
    if (ratio >= 0.5) return Minus
    return TrendingDown
  }

  const getNoteBackground = (note: number, bareme: number) => {
    const ratio = note / bareme
    if (ratio >= 0.7) return "bg-green-500/10 border-green-500/20"
    if (ratio >= 0.5) return "bg-amber-500/10 border-amber-500/20"
    return "bg-red-500/10 border-red-500/20"
  }

  if (recentes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Dernières notes</CardTitle>
              <CardDescription>Aucune note disponible</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <GraduationCap className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle>Dernières notes</CardTitle>
            <CardDescription>{notes.length} note(s) ce trimestre</CardDescription>
          </div>
        </div>
        <Link href="/dashboard/notes">
          <Button variant="ghost" size="sm" className="group">
            Voir tout
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentes.map((note, index) => {
            const noteVal = parseNote(note.note)
            const baremeVal = parseNote(note.bareme) || 20
            const Icon = noteVal !== null ? getNoteIcon(noteVal, baremeVal) : Minus
            
            return (
              <div
                key={`note-${note.date}-${(note.matiere || "").slice(0, 30)}-${index}`}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                  "hover:shadow-md hover:-translate-y-0.5",
                  noteVal !== null 
                    ? getNoteBackground(noteVal, baremeVal)
                    : "bg-muted/30 border-border/50"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    noteVal !== null && noteVal / baremeVal >= 0.7 
                      ? "bg-green-500/20" 
                      : noteVal !== null && noteVal / baremeVal >= 0.5
                        ? "bg-amber-500/20"
                        : "bg-red-500/20"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      noteVal !== null ? getNoteColor(noteVal, baremeVal) : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {(note.matiere || "—").split(" > ")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(note.date)}
                      {note.commentaire && ` • ${note.commentaire}`}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-baseline gap-0.5 ml-4 px-3 py-1.5 rounded-lg",
                  noteVal !== null 
                    ? getNoteBackground(noteVal, baremeVal).split(" ")[0]
                    : "bg-muted/50"
                )}>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      noteVal !== null ? getNoteColor(noteVal, baremeVal) : "text-muted-foreground"
                    )}
                  >
                    {note.note}
                  </span>
                  <span className="text-xs text-muted-foreground">/{note.bareme}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
