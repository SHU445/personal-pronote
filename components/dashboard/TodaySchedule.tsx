"use client"

import { ArrowRight, Calendar, MapPin, User, XCircle, AlertTriangle, Coffee } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Lesson } from "@/types/pronote"
import { formatTime, cn, formatDateLocal, extractDateFromDatetime, getSubjectColor } from "@/lib/utils"

interface TodayScheduleProps {
  lessons: Lesson[]
}

export function TodaySchedule({ lessons }: TodayScheduleProps) {
  // Filtrer les cours d'aujourd'hui
  const todayStr = formatDateLocal(new Date())

  const todayLessons = lessons
    .filter((l) => {
      const lessonDate = extractDateFromDatetime(l.debut)
      return lessonDate === todayStr
    })
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())

  // Vérifier si un cours est en cours
  const now = new Date()
  const isCurrentLesson = (lesson: Lesson) => {
    const start = new Date(lesson.debut)
    const end = new Date(lesson.fin)
    return now >= start && now <= end && !lesson.annule
  }

  if (todayLessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Coffee className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <CardTitle>Emploi du temps aujourd&apos;hui</CardTitle>
              <CardDescription>Pas de cours aujourd&apos;hui</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 mb-4">
              <Coffee className="h-8 w-8 text-violet-500" />
            </div>
            <p className="text-sm font-medium">Jour de repos</p>
            <p className="text-xs text-muted-foreground mt-1">Aucun cours prévu pour aujourd&apos;hui</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Calendar className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <CardTitle>Emploi du temps</CardTitle>
            <CardDescription>{todayLessons.length} cours aujourd&apos;hui</CardDescription>
          </div>
        </div>
        <Link href="/dashboard/edt">
          <Button variant="ghost" size="sm" className="group">
            Voir semaine
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {todayLessons.map((lesson, index) => {
            const isCurrent = isCurrentLesson(lesson)
            const colors = getSubjectColor(lesson.matiere)
            const subjectName = lesson.matiere.split(" > ")[0]
            
            return (
              <div
                key={index}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-xl border-l-4 transition-all duration-300",
                  "hover:shadow-md hover:-translate-y-0.5",
                  lesson.annule 
                    ? "bg-muted/30 border-destructive/50 opacity-60" 
                    : isCurrent
                      ? cn(colors.bg, "ring-2 ring-primary/30", colors.border.replace('border-', 'border-l-'))
                      : cn(colors.bg, colors.border.replace('border-', 'border-l-'), "hover:shadow-lg")
                )}
              >
                {/* Timeline indicator */}
                <div className="relative flex flex-col items-center shrink-0 w-14">
                  <div className={cn(
                    "text-xs font-semibold px-2 py-1 rounded-md",
                    isCurrent ? "bg-primary text-primary-foreground" : "bg-background/80 border"
                  )}>
                    {formatTime(lesson.debut)}
                  </div>
                  <div className={cn(
                    "w-0.5 h-4 my-1",
                    isCurrent ? "bg-primary" : "bg-border"
                  )} />
                  <div className="text-[10px] text-muted-foreground">
                    {formatTime(lesson.fin)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-semibold text-sm",
                      lesson.annule ? "line-through text-muted-foreground" : colors.text
                    )}>
                      {subjectName}
                    </span>
                    {isCurrent && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                        En cours
                      </Badge>
                    )}
                    {lesson.annule && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                        <XCircle className="h-3 w-3" />
                        Annulé
                      </Badge>
                    )}
                    {lesson.modifie && !lesson.annule && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 gap-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        {typeof lesson.modifie === 'string' ? lesson.modifie : 'Modifié'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {lesson.professeur && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {lesson.professeur}
                      </span>
                    )}
                    {lesson.salle && (
                      <span className="flex items-center gap-1 text-xs bg-background/50 px-1.5 py-0.5 rounded border">
                        <MapPin className="h-3 w-3" />
                        {lesson.salle}
                      </span>
                    )}
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
