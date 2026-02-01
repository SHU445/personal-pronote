"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, MapPin, User, Clock, AlertTriangle, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Lesson } from "@/types/pronote"
import { 
  formatTime, 
  cn, 
  formatDateLocal, 
  extractDateFromDatetime,
  extractTimeMinutes,
  getSubjectColor,
  calculateLessonPositions,
  type PositionedLesson
} from "@/lib/utils"

interface TimetableProps {
  lessons: Lesson[]
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

// Configuration de la grille horaire
const GRID_START_HOUR = 7  // 7h00
const GRID_END_HOUR = 18   // 18h00

// Générer les heures de la grille
function generateTimeSlots(): string[] {
  const slots = []
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

// Composant carte de cours
function CourseCard({ 
  lesson, 
  position,
  compact = false
}: { 
  lesson: PositionedLesson
  position: 'grid' | 'list'
  compact?: boolean
}) {
  const colors = getSubjectColor(lesson.matiere)
  const subjectName = lesson.matiere.split(" > ")[0]
  
  if (position === 'grid') {
    return (
      <div
        className={cn(
          "absolute rounded-lg border-l-[3px] px-2 py-1.5 overflow-hidden transition-all",
          "hover:shadow-md hover:z-10 cursor-pointer group",
          lesson.annule 
            ? "bg-muted/50 border-destructive/50 opacity-60" 
            : lesson.modifie 
              ? cn(colors.bg, "border-amber-500")
              : cn(colors.bg, colors.border.replace('border-', 'border-l-'))
        )}
        style={{
          top: `${lesson.top}%`,
          height: `${lesson.height}%`,
          left: `calc(${lesson.left}% + 2px)`,
          width: `calc(${lesson.width}% - 4px)`,
          minHeight: '30px',
        }}
      >
        {/* Contenu du cours */}
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-1">
            <span className={cn(
              "font-semibold text-xs leading-tight truncate",
              lesson.annule ? "line-through text-muted-foreground" : colors.text
            )}>
              {subjectName}
            </span>
            {lesson.annule && (
              <XCircle className="h-3 w-3 shrink-0 text-destructive" />
            )}
            {lesson.modifie && !lesson.annule && (
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
            )}
          </div>
          
          {lesson.height > 4 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
              {formatTime(lesson.debut)} - {formatTime(lesson.fin)}
            </div>
          )}
          
          {lesson.height > 6 && lesson.salle && (
            <div className="mt-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{lesson.salle}</span>
            </div>
          )}
          
          {lesson.height > 8 && lesson.professeur && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{lesson.professeur}</span>
            </div>
          )}
        </div>
        
        {/* Tooltip au survol */}
        <div className="absolute left-full top-0 ml-2 z-50 hidden group-hover:block">
          <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[200px] animate-fade-in">
            <p className={cn("font-semibold text-sm", colors.text)}>{subjectName}</p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(lesson.debut)} - {formatTime(lesson.fin)}</span>
              </div>
              {lesson.salle && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{lesson.salle}</span>
                </div>
              )}
              {lesson.professeur && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{lesson.professeur}</span>
                </div>
              )}
              {lesson.modifie && (
                <Badge variant="outline" className="mt-2 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                  {typeof lesson.modifie === 'string' ? lesson.modifie : 'Modifié'}
                </Badge>
              )}
              {lesson.annule && (
                <Badge variant="destructive" className="mt-2 text-[10px]">
                  Annulé
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Vue liste (mobile)
  return (
    <div
      className={cn(
        "rounded-xl border-l-4 p-3 transition-all",
        lesson.annule 
          ? "bg-muted/30 border-destructive/50 opacity-70" 
          : lesson.modifie 
            ? cn(colors.bg, "border-amber-500")
            : cn(colors.bg, colors.border.replace('border-', 'border-l-'))
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-semibold text-sm",
              lesson.annule ? "line-through text-muted-foreground" : colors.text
            )}>
              {subjectName}
            </span>
            {lesson.annule && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Annulé
              </Badge>
            )}
            {lesson.modifie && !lesson.annule && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
                {typeof lesson.modifie === 'string' ? lesson.modifie : 'Modifié'}
              </Badge>
            )}
          </div>
          
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(lesson.debut)} - {formatTime(lesson.fin)}
            </span>
            {lesson.salle && (
              <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                <MapPin className="h-3 w-3" />
                {lesson.salle}
              </span>
            )}
          </div>
          
          {lesson.professeur && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {lesson.professeur}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Ligne d'heure actuelle
function CurrentTimeLine({ startHour, endHour }: { startHour: number; endHour: number }) {
  const [position, setPosition] = useState<number | null>(null)
  
  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const startMinutes = startHour * 60
      const endMinutes = endHour * 60
      
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        const totalMinutes = endMinutes - startMinutes
        const pos = ((currentMinutes - startMinutes) / totalMinutes) * 100
        setPosition(pos)
      } else {
        setPosition(null)
      }
    }
    
    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Mise à jour chaque minute
    
    return () => clearInterval(interval)
  }, [startHour, endHour])
  
  if (position === null) return null
  
  return (
    <div 
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${position}%` }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
      <div className="flex-1 h-0.5 bg-primary shadow-sm shadow-primary/30" />
    </div>
  )
}

export function Timetable({ lessons }: TimetableProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date().getDay()
    // Dimanche = 0, on veut Lundi = 0
    return today === 0 ? 0 : today - 1
  })
  
  const timeSlots = useMemo(() => generateTimeSlots(), [])

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

  // Grouper et positionner les cours par jour
  const lessonsByDay = useMemo(() => {
    const grouped: Record<string, PositionedLesson[]> = {}

    for (const day of currentWeek) {
      const dayStr = formatDateLocal(day)
      const dayLessons = lessons.filter((l) => {
        const lessonDate = extractDateFromDatetime(l.debut)
        return lessonDate === dayStr
      })
      
      grouped[dayStr] = calculateLessonPositions(dayLessons, GRID_START_HOUR, GRID_END_HOUR)
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

  const todayIndex = useMemo(() => {
    return currentWeek.findIndex(day => isToday(day))
  }, [currentWeek])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg">Emploi du temps</CardTitle>
            <CardDescription>{formatWeekRange()}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className="h-8 px-3 text-xs"
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Vue Desktop : Grille hebdomadaire */}
        <div className="hidden lg:block">
          <div className="flex">
            {/* Colonne des heures */}
            <div className="w-14 shrink-0 border-r bg-muted/20">
              <div className="h-12 border-b" /> {/* Header vide */}
              <div className="relative" style={{ height: `${(GRID_END_HOUR - GRID_START_HOUR) * 60}px` }}>
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    className="absolute w-full text-right pr-2 text-xs text-muted-foreground -translate-y-2"
                    style={{ top: `${(index / (timeSlots.length - 1)) * 100}%` }}
                  >
                    {time}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Colonnes des jours */}
            <div className="flex-1 grid grid-cols-6">
              {currentWeek.map((day, dayIndex) => {
                const dayStr = formatDateLocal(day)
                const dayLessons = lessonsByDay[dayStr] || []
                const today = isToday(day)

                return (
                  <div key={dayStr} className="border-r last:border-r-0">
                    {/* En-tête du jour */}
                    <div className={cn(
                      "h-12 border-b flex flex-col items-center justify-center",
                      today ? "bg-primary/10" : "bg-muted/20"
                    )}>
                      <span className={cn(
                        "text-xs font-medium",
                        today ? "text-primary" : "text-muted-foreground"
                      )}>
                        {DAYS_SHORT[dayIndex]}
                      </span>
                      <span className={cn(
                        "text-sm font-semibold",
                        today ? "text-primary" : "text-foreground"
                      )}>
                        {day.getDate()}
                      </span>
                    </div>
                    
                    {/* Grille des cours */}
                    <div 
                      className="relative bg-background"
                      style={{ height: `${(GRID_END_HOUR - GRID_START_HOUR) * 60}px` }}
                    >
                      {/* Lignes de grille */}
                      {timeSlots.map((_, index) => (
                        <div
                          key={index}
                          className="absolute w-full border-t border-dashed border-border/50"
                          style={{ top: `${(index / (timeSlots.length - 1)) * 100}%` }}
                        />
                      ))}
                      
                      {/* Ligne de l'heure actuelle */}
                      {today && (
                        <CurrentTimeLine startHour={GRID_START_HOUR} endHour={GRID_END_HOUR} />
                      )}
                      
                      {/* Cours */}
                      {dayLessons.map((lesson, index) => (
                        <CourseCard
                          key={lesson.id || index}
                          lesson={lesson}
                          position="grid"
                        />
                      ))}
                      
                      {/* Message si pas de cours */}
                      {dayLessons.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground/50">
                            Pas de cours
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Vue Mobile : Navigation par jour */}
        <div className="lg:hidden">
          {/* Sélecteur de jour */}
          <div className="flex border-b overflow-x-auto scrollbar-none">
            {currentWeek.map((day, index) => {
              const today = isToday(day)
              const selected = selectedDayIndex === index
              const dayStr = formatDateLocal(day)
              const hasLessons = (lessonsByDay[dayStr] || []).length > 0
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDayIndex(index)}
                  className={cn(
                    "flex-1 min-w-[60px] py-3 px-2 flex flex-col items-center gap-0.5 transition-colors relative",
                    selected 
                      ? "bg-primary/10" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-medium uppercase",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {DAYS_SHORT[index]}
                  </span>
                  <span className={cn(
                    "text-sm font-semibold w-8 h-8 rounded-full flex items-center justify-center",
                    today && "bg-primary text-primary-foreground",
                    selected && !today && "bg-primary/20"
                  )}>
                    {day.getDate()}
                  </span>
                  {hasLessons && !selected && (
                    <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                  )}
                  {selected && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Liste des cours du jour sélectionné */}
          <div className="p-4 space-y-3">
            {(() => {
              const selectedDay = currentWeek[selectedDayIndex]
              const dayStr = formatDateLocal(selectedDay)
              const dayLessons = lessonsByDay[dayStr] || []
              
              if (dayLessons.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">Pas de cours</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      {DAYS[selectedDayIndex]} {selectedDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                )
              }
              
              // Trier par heure
              const sorted = [...dayLessons].sort((a, b) => 
                extractTimeMinutes(a.debut) - extractTimeMinutes(b.debut)
              )
              
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {sorted.length} cours
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DAYS[selectedDayIndex]} {selectedDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  {sorted.map((lesson, index) => (
                    <CourseCard
                      key={lesson.id || index}
                      lesson={lesson}
                      position="list"
                    />
                  ))}
                </>
              )
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
