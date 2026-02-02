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
import type { Note } from "@/types/pronote"
import { formatDate, parseNote, getNoteColor } from "@/lib/utils"

interface NotesTableProps {
  notes: Note[]
}

export function NotesTable({ notes }: NotesTableProps) {
  // Trier par date (plus recentes d'abord)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  if (sortedNotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Toutes les notes</CardTitle>
          <CardDescription>Aucune note disponible</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toutes les notes</CardTitle>
        <CardDescription>{notes.length} note(s) ce trimestre</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Matiere</TableHead>
              <TableHead className="text-center">Note</TableHead>
              <TableHead className="text-center">Coef</TableHead>
              <TableHead className="text-center hidden md:table-cell">Classe</TableHead>
              <TableHead className="hidden lg:table-cell">Commentaire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedNotes.map((note, index) => {
              const noteVal = parseNote(note.note)
              const baremeVal = parseNote(note.bareme) || 20

              return (
                <TableRow key={`note-${note.date}-${(note.matiere || "").slice(0, 20)}-${index}`}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(note.date)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {(note.matiere || "—").split(" > ")[0]}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-bold ${
                        noteVal !== null
                          ? getNoteColor(noteVal, baremeVal)
                          : "text-muted-foreground"
                      }`}
                    >
                      {note.note}
                    </span>
                    <span className="text-muted-foreground">/{note.bareme}</span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {note.coefficient}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                    {note.moyenne_classe}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                    {note.commentaire || "-"}
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
