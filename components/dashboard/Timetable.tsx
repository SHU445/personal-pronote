"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Clock, MapPin, User, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Lesson } from "@/types/pronote"
import { formatTime, cn } from "@/lib/utils"

interface TimetableProps {
  lessons: Lesson[]
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

export function Timetable({ lessons }: TimetableProps) {
  const [weekOffset, setWeekOffset] = useState(0)

  // Calculer la semaine actuelle
  const currentWeek = useMemo(() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)

    const days = []
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push(day)
    }
    return days
  }, [weekOffset])

  // Grouper les cours par jour
  const lessonsByDay = useMemo(() => {
    const grouped: Record<string, Lesson[]> = {}

    for (const day of currentWeek) {
      const dayStr = day.toISOString().split("T")[0]
      grouped[dayStr] = lessons
        .filter((l) => {
          const lessonDate = new Date(l.debut).toISOString().split("T")[0]
          return lessonDate === dayStr
        })
        .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())
    }

    return grouped
  }, [lessons, currentWeek])

  const formatWeekRange = () => {
    const start = currentWeek[0]
    const end = currentWeek[5]
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
    return `${start.toLocaleDateString("fr-FR", options)} - ${end.toLocaleDateString("fr-FR", options)}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Emploi du temps</CardTitle>
            <CardDescription>{formatWeekRange()}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {currentWeek.map((day, dayIndex) => {
            const dayStr = day.toISOString().split("T")[0]
            const dayLessons = lessonsByDay[dayStr] || []
            const today = isToday(day)

            return (
              <div
                key={dayStr}
                className={cn(
                  "rounded-lg border p-3",
                  today ? "border-primary bg-primary/5" : "bg-card"
                )}
              >
                <div className="text-center mb-3">
                  <p
                    className={cn(
                      "font-medium",
                      today ? "text-primary" : "text-foreground"
                    )}
                  >
                    {DAYS[dayIndex]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>

                {dayLessons.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Pas de cours
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayLessons.map((lesson, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-2 rounded-md border text-xs",
                          lesson.annule
                            ? "bg-destructive/10 border-destructive/20"
                            : lesson.modifie
                            ? "bg-yellow-500/10 border-yellow-500/20"
                            : "bg-background"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-muted-foreground">
                            {formatTime(lesson.debut)} - {formatTime(lesson.fin)}
                          </span>
                          {lesson.annule && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              Annule
                            </Badge>
                          )}
                          {lesson.modifie && !lesson.annule && (
                            <Badge variant="warning" className="text-[10px] px-1 py-0">
                              Modifie
                            </Badge>
                          )}
                        </div>
                        <p
                          className={cn(
                            "font-medium truncate",
                            lesson.annule ? "line-through text-muted-foreground" : ""
                          )}
                        >
                          {lesson.matiere.split(" > ")[0]}
                        </p>
                        {lesson.salle && (
                          <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {lesson.salle}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
