"use client"

import { useContext } from "react"
import { DataContext } from "../layout"
import { MessagesList } from "@/components/dashboard/MessagesList"
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
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MessagesPage() {
  const { data, loading } = useContext(DataContext)

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Consultez vos discussions et messages
        </p>
      </div>

      <MessagesList discussions={data.discussions || []} />
    </div>
  )
}
