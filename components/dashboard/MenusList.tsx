"use client"

import { UtensilsCrossed, Calendar, Salad, Beef, Cookie, LeafyGreen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Menu } from "@/types/pronote"
import { formatDate } from "@/lib/utils"

interface MenusListProps {
  menus: Menu[]
}

export function MenusList({ menus }: MenusListProps) {
  // Trier par date
  const sortedMenus = [...menus].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Filtrer les menus futurs uniquement
  const upcomingMenus = sortedMenus.filter(
    (m) => new Date(m.date) >= new Date(new Date().setHours(0, 0, 0, 0))
  )

  if (upcomingMenus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menus de la cantine</CardTitle>
          <CardDescription>Aucun menu disponible</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 mr-2" />
            <span>Les menus ne sont pas disponibles</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isToday = (date: string) => {
    return new Date(date).toDateString() === new Date().toDateString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menus de la cantine</CardTitle>
        <CardDescription>{upcomingMenus.length} menu(s) a venir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingMenus.map((menu, index) => (
            <Card
              key={`menu-${menu.date}-${menu.repas}-${index}`}
              className={isToday(menu.date) ? "border-primary" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(menu.date)}</span>
                  </div>
                  {isToday(menu.date) && (
                    <Badge variant="default">Aujourd&apos;hui</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{menu.repas}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {menu.entrees && menu.entrees.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Salad className="h-4 w-4 text-green-500" />
                      Entrees
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-0.5 ml-6">
                      {menu.entrees.map((e, i) => (
                        <li key={`entree-${i}-${e}`}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {menu.plats && menu.plats.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Beef className="h-4 w-4 text-orange-500" />
                      Plats
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-0.5 ml-6">
                      {menu.plats.map((p, i) => (
                        <li key={`plat-${i}-${p}`}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {menu.accompagnements && menu.accompagnements.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <LeafyGreen className="h-4 w-4 text-emerald-500" />
                      Accompagnements
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-0.5 ml-6">
                      {menu.accompagnements.map((a, i) => (
                        <li key={`accomp-${i}-${a}`}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {menu.desserts && menu.desserts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Cookie className="h-4 w-4 text-amber-500" />
                      Desserts
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-0.5 ml-6">
                      {menu.desserts.map((d, i) => (
                        <li key={`dessert-${i}-${d}`}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
