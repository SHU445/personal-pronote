"use client"

import { useContext } from "react"
import { DataContext } from "../layout"
import { NotesTable } from "@/components/dashboard/NotesTable"
import { MoyennesTable } from "@/components/dashboard/MoyennesTable"
import { MoyennesChart } from "@/components/dashboard/MoyennesChart"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NotesPage() {
  const { data, loading } = useContext(DataContext)

  if (loading || !data) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notes & Moyennes</h1>
        <p className="text-muted-foreground">
          Consultez vos notes et moyennes par matière
        </p>
      </div>

      <Tabs defaultValue="moyennes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="moyennes">Moyennes</TabsTrigger>
          <TabsTrigger value="notes">Toutes les notes</TabsTrigger>
        </TabsList>

        <TabsContent value="moyennes" className="space-y-6">
          <MoyennesChart moyennes={data.moyennes || []} />
          <MoyennesTable moyennes={data.moyennes || []} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTable notes={data.notes || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
