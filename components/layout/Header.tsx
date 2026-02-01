"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Menu, User, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "./MobileNav"
import type { Eleve } from "@/types/pronote"
import { cn } from "@/lib/utils"

interface HeaderProps {
  eleve?: Eleve
  onRefresh: () => void
  refreshing: boolean
  lastRefresh?: string
}

export function Header({ eleve, onRefresh, refreshing, lastRefresh }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const formatLastRefresh = () => {
    if (!lastRefresh) return null
    const date = new Date(lastRefresh)
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Mobile menu button */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden hover:bg-primary/10 transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <MobileNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* User info */}
        <div className="flex-1">
          {eleve && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{eleve.nom}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {eleve.classe} • {eleve.periode_actuelle}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Last refresh */}
        {lastRefresh && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Clock className="h-3 w-3" />
            <span>{formatLastRefresh()}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              "relative hover:bg-primary/10 transition-all duration-300",
              refreshing && "text-primary"
            )}
            title={refreshing ? "Actualisation..." : "Actualiser les données"}
          >
            <RefreshCw className={cn(
              "h-5 w-5 transition-transform duration-500",
              refreshing && "animate-spin"
            )} />
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Refresh progress indicator */}
      {refreshing && (
        <div className="h-0.5 bg-primary/10 overflow-hidden">
          <div className="h-full w-full progress-indeterminate" />
        </div>
      )}
    </header>
  )
}
