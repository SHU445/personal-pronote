"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  Calendar,
  UtensilsCrossed,
  MessageSquare,
  UserX,
  LogOut,
  Sparkles,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { logout } from "@/lib/api"

const navItems = [
  {
    title: "Vue d'ensemble",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Focus Tonight",
    href: "/dashboard/focus",
    icon: Target,
  },
  {
    title: "Notes & Moyennes",
    href: "/dashboard/notes",
    icon: GraduationCap,
  },
  {
    title: "Devoirs",
    href: "/dashboard/devoirs",
    icon: ClipboardList,
  },
  {
    title: "Emploi du temps",
    href: "/dashboard/edt",
    icon: Calendar,
  },
  {
    title: "Menus",
    href: "/dashboard/menus",
    icon: UtensilsCrossed,
  },
  {
    title: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    title: "Absences",
    href: "/dashboard/absences",
    icon: UserX,
  },
]

interface MobileNavProps {
  onNavigate?: () => void
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <div className="flex flex-col h-full bg-sidebar/95 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <div>
          <span className="font-bold text-lg">Pronote</span>
          <p className="text-[10px] text-muted-foreground -mt-0.5">Dashboard personnel</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-6">
        <nav className="space-y-1.5 px-3">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  "transition-all duration-300 ease-out",
                  isActive
                    ? "text-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20" />
                )}
                
                {/* Hover effect */}
                <div className={cn(
                  "absolute inset-0 rounded-xl bg-sidebar-accent opacity-0 transition-opacity duration-300",
                  !isActive && "group-hover:opacity-100"
                )} />
                
                {/* Icon */}
                <div className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                  isActive 
                    ? "bg-primary/15" 
                    : "bg-sidebar-accent/50 group-hover:bg-sidebar-accent"
                )}>
                  <item.icon className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
                    "group-hover:scale-110"
                  )} />
                </div>
                
                {/* Label */}
                <span className="relative z-10">{item.title}</span>
                
                {/* Active dot */}
                {isActive && (
                  <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 rounded-xl px-3 py-2.5 h-auto",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            "transition-all duration-300"
          )}
          onClick={handleLogout}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Déconnexion</span>
        </Button>
      </div>
    </div>
  )
}
