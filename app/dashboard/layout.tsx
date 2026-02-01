"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { checkAuthStatus, getCachedData, refreshData, logout } from "@/lib/api"
import type { PronoteData } from "@/types/pronote"
import { Button } from "@/components/ui/button"
import React from "react"

// Context pour partager les donnees
export const DataContext = React.createContext<{
  data: PronoteData | null
  loading: boolean
  refreshing: boolean
  lastRefresh: string | null
  error: string | null
  refresh: () => Promise<void>
}>({
  data: null,
  loading: true,
  refreshing: false,
  lastRefresh: null,
  error: null,
  refresh: async () => {},
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [data, setData] = useState<PronoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Gerer la reconnexion
  const handleReconnect = async () => {
    await logout()
    router.replace("/login?expired=true")
  }

  // Charger les donnees
  const loadData = useCallback(async () => {
    let hasData = false
    
    try {
      // D'abord charger le cache
      const cached = await getCachedData()
      console.log("[Dashboard] Cache response:", cached)
      
      if (cached.data) {
        setData(cached.data)
        setLoading(false)
        setError(null)
        hasData = true
      }

      // Puis actualiser en arriere-plan
      setRefreshing(true)
      const fresh = await refreshData()
      console.log("[Dashboard] Refresh response:", fresh)
      
      // Priorite aux donnees, meme si erreur presente
      if (fresh.data) {
        setData(fresh.data)
        setLastRefresh(fresh.refreshedAt || new Date().toISOString())
        setError(null)
        hasData = true
      }
      
      // Afficher erreur seulement si aucune donnee disponible
      if (!hasData && fresh.error) {
        if (fresh.error.includes("expire") || fresh.error.includes("Non connecte")) {
          setError("Session expirée. Veuillez vous reconnecter.")
        } else {
          setError(fresh.error)
        }
      }
    } catch (err) {
      console.error("Erreur chargement donnees:", err)
      if (!hasData) {
        setError("Erreur de chargement des données")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Rafraichir manuellement
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const fresh = await refreshData()
      console.log("[Dashboard] Manual refresh response:", fresh)
      
      // Priorite aux donnees
      if (fresh.data) {
        setData(fresh.data)
        setLastRefresh(fresh.refreshedAt || new Date().toISOString())
        setError(null)
      } else if (fresh.error && !data) {
        // Erreur seulement si pas de donnees existantes
        if (fresh.error.includes("expire") || fresh.error.includes("Non connecte")) {
          setError("Session expirée. Veuillez vous reconnecter.")
        } else {
          setError(fresh.error)
        }
      }
    } catch (err) {
      console.error("Erreur refresh:", err)
      if (!data) {
        setError("Erreur lors du rafraîchissement")
      }
    } finally {
      setRefreshing(false)
    }
  }, [data])

  // Verifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus()
        if (!status.connected) {
          router.replace("/login")
          return
        }
        setChecking(false)
        loadData()
      } catch {
        router.replace("/login")
      }
    }

    checkAuth()
  }, [router, loadData])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25">
              <RefreshCw className="h-8 w-8 text-primary-foreground animate-spin" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <DataContext.Provider value={{ data, loading, refreshing, lastRefresh, error, refresh: handleRefresh }}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="lg:pl-64">
          <Header
            eleve={data?.eleve}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            lastRefresh={lastRefresh || undefined}
          />
          
          {/* Message d'erreur de session */}
          {error && error.includes("expirée") && (
            <div className="mx-4 mt-4 lg:mx-6 p-4 bg-destructive/10 border-2 border-destructive/20 rounded-xl flex items-center justify-between gap-4 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">Session expirée</p>
                  <p className="text-sm text-muted-foreground">
                    Votre token Pronote a expiré. Veuillez vous reconnecter avec un nouveau QR code.
                  </p>
                </div>
              </div>
              <Button onClick={handleReconnect} variant="destructive" size="sm" className="shrink-0">
                Se reconnecter
              </Button>
            </div>
          )}
          
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </DataContext.Provider>
  )
}
