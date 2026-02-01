"use client"

import { useContext } from "react"
import { DataContext } from "../layout"
import { Timetable } from "@/components/dashboard/Timetable"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60 mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop skeleton */}
        <div className="hidden lg:flex">
          <div className="w-14 shrink-0 border-r bg-muted/20">
            <div className="h-12 border-b" />
            <div className="h-[660px]" />
          </div>
          <div className="flex-1 grid grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border-r last:border-r-0">
                <div className="h-12 border-b bg-muted/20 flex flex-col items-center justify-center gap-1">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-6" />
                </div>
                <div className="h-[660px] p-2 space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="lg:hidden">
          <div className="flex border-b">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-1 py-3 px-2 flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
          <div className="p-4 space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EdtPage() {
  const { data, loading } = useContext(DataContext)

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Emploi du temps</h1>
          <p className="text-muted-foreground">
            Consultez votre planning de la semaine
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emploi du temps</h1>
        <p className="text-muted-foreground">
          Consultez votre planning de la semaine
        </p>
      </div>

      <Timetable lessons={data.lessons || []} />
    </div>
  )
}
