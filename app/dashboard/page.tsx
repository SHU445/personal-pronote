"use client"

import { useContext } from "react"
import { DataContext } from "./layout"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { MoyennesChart } from "@/components/dashboard/MoyennesChart"
import { DevoirsPreview } from "@/components/dashboard/DevoirsPreview"
import { RecentNotes } from "@/components/dashboard/RecentNotes"
import { TodaySchedule } from "@/components/dashboard/TodaySchedule"
import { FocusTonight } from "@/components/dashboard/FocusTonight"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} hover={false} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card hover={false}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card hover={false}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, loading } = useContext(DataContext)

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Focus Tonight - Widget principal */}
      <section className="animate-fade-in">
        <FocusTonight
          devoirs={data.devoirs || []}
          notes={data.notes || []}
          moyennes={data.moyennes || []}
          compact={true}
        />
      </section>

      {/* Stats Cards */}
      <section 
        className="animate-fade-in"
        style={{ animationDelay: "0.05s" }}
      >
        <StatsCards
          notes={data.notes || []}
          moyennes={data.moyennes || []}
          devoirs={data.devoirs || []}
        />
      </section>

      {/* Row 1: Chart + Schedule */}
      <section 
        className={cn(
          "grid gap-6 lg:grid-cols-2",
          "animate-fade-in"
        )}
        style={{ animationDelay: "0.1s" }}
      >
        <MoyennesChart moyennes={data.moyennes || []} />
        <TodaySchedule lessons={data.lessons || []} />
      </section>

      {/* Row 2: Notes + Devoirs */}
      <section 
        className={cn(
          "grid gap-6 lg:grid-cols-2",
          "animate-fade-in"
        )}
        style={{ animationDelay: "0.15s" }}
      >
        <RecentNotes notes={data.notes || []} />
        <DevoirsPreview devoirs={data.devoirs || []} />
      </section>
    </div>
  )
}
