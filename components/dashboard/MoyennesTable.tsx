"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Moyenne } from "@/types/pronote"
import { parseNote, getMoyenneColor } from "@/lib/utils"

interface MoyennesTableProps {
  moyennes: Moyenne[]
}

export function MoyennesTable({ moyennes }: MoyennesTableProps) {
  // Trier par moyenne eleve (decroissant)
  const sortedMoyennes = [...moyennes].sort((a, b) => {
    const aVal = parseNote(a.moyenne_eleve) || 0
    const bVal = parseNote(b.moyenne_eleve) || 0
    return bVal - aVal
  })

  if (sortedMoyennes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moyennes par matiere</CardTitle>
          <CardDescription>Aucune moyenne disponible</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moyennes par matiere</CardTitle>
        <CardDescription>{moyennes.length} matiere(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matiere</TableHead>
              <TableHead className="text-center">Ma moyenne</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Classe</TableHead>
              <TableHead className="text-center hidden md:table-cell">Min</TableHead>
              <TableHead className="text-center hidden md:table-cell">Max</TableHead>
              <TableHead className="hidden lg:table-cell w-32">Progression</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMoyennes.map((moyenne, index) => {
              const moyVal = parseNote(moyenne.moyenne_eleve)
              const progress = moyVal ? (moyVal / 20) * 100 : 0

              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {moyenne.matiere.split(" > ")[0]}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-bold ${
                        moyVal !== null ? getMoyenneColor(moyVal) : "text-muted-foreground"
                      }`}
                    >
                      {moyenne.moyenne_eleve || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground hidden sm:table-cell">
                    {moyenne.moyenne_classe || "-"}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                    {moyenne.moyenne_min || "-"}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                    {moyenne.moyenne_max || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Progress
                      value={progress}
                      className="h-2"
                      indicatorClassName={
                        moyVal && moyVal >= 14
                          ? "bg-green-500"
                          : moyVal && moyVal >= 10
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
