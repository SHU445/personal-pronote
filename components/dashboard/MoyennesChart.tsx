"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp } from "lucide-react"
import type { Moyenne } from "@/types/pronote"
import { parseNote, cn } from "@/lib/utils"

interface MoyennesChartProps {
  moyennes: Moyenne[]
}

export function MoyennesChart({ moyennes }: MoyennesChartProps) {
  // Preparer les donnees pour le graphique
  const data = moyennes
    .map((m) => ({
      name: (m.matiere || "—").split(" > ")[0].slice(0, 15),
      fullName: m.matiere || "—",
      eleve: parseNote(m.moyenne_eleve) || 0,
      classe: parseNote(m.moyenne_classe) || 0,
    }))
    .filter((d) => d.eleve > 0)
    .sort((a, b) => b.eleve - a.eleve)
    .slice(0, 10)

  const getColor = (value: number) => {
    if (value >= 14) return "#22c55e"
    if (value >= 10) return "#eab308"
    return "#ef4444"
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Moyennes par matière</CardTitle>
              <CardDescription>Aucune moyenne disponible</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Moyennes par matière</CardTitle>
              <CardDescription>Comparaison avec la classe</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            <TrendingUp className="h-3 w-3" />
            <span>{data.length} matières</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" horizontal={true} vertical={false} />
            <XAxis type="number" domain={[0, 20]} className="text-xs" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === "eleve" ? "Ma moyenne" : "Classe",
              ]}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: 16 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="eleve" name="Ma moyenne" radius={[0, 6, 6, 0]} barSize={16}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.eleve)} />
              ))}
            </Bar>
            <Bar dataKey="classe" name="Classe" fill="#94a3b8" radius={[0, 6, 6, 0]} barSize={16} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
