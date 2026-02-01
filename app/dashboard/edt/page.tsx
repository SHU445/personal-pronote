"use client"

import { useContext } from "react"
import { DataContext } from "../layout"
import { Timetable } from "@/components/dashboard/Timetable"
import { TodaySchedule } from "@/components/dashboard/TodaySchedule"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function EdtPage() {
  const { data, loading } = useContext(DataContext)

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emploi du temps</h1>
        <p className="text-muted-foreground">
          Consultez votre planning de la semaine
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Timetable lessons={data.lessons || []} />
        </div>
        <div>
          <TodaySchedule lessons={data.lessons || []} />
        </div>
      </div>
    </div>
  )
}
