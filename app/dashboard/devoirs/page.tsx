"use client"

import { useContext } from "react"
import { DataContext } from "../layout"
import { DevoirsList } from "@/components/dashboard/DevoirsList"
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
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="space-y-3 ml-6">
                {[1, 2].map((j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DevoirsPage() {
  const { data, loading } = useContext(DataContext)

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Devoirs</h1>
        <p className="text-muted-foreground">
          Gerez vos devoirs et travaux a rendre
        </p>
      </div>

      <DevoirsList devoirs={data.devoirs || []} />
    </div>
  )
}
