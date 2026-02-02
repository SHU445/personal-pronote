"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { checkAuthStatus, getCachedData, refreshData, logout, type Semestre } from "@/lib/api"
import type { PronoteData } from "@/types/pronote"
import { Button } from "@/components/ui/button"
import React from "react"

// Context pour partager les donnees et le semestre
export const DataContext = React.createContext<{
  data: PronoteData | null
  loading: boolean
  refreshing: boolean
  lastRefresh: string | null
  error: string | null
  semestre: Semestre
  setSemestre: (s: Semestre) => void
  refresh: () => Promise<void>
}>({
  data: null,
  loading: true,
  refreshing: false,
  lastRefresh: null,
  error: null,
  semestre: 1,
  setSemestre: () => {},
  refresh: async () => {},
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const authVerifiedRef = useRef(false)
  const [checking, setChecking] = useState(true)
  const [data, setData] = useState<PronoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [semestre, setSemestre] = useState<Semestre>(1)

  // Gerer la reconnexion
  const handleReconnect = async () => {
    await logout()
    router.replace("/login?expired=true")
  }

  // Charger les donnees pour un semestre donne (initial: 1)
  const loadData = useCallback(async (s: Semestre) => {
    let hasData = false
    
    try {
      // D'abord charger le cache
      const cached = await getCachedData(s)
      if (process.env.NODE_ENV === 'development') console.log("[Dashboard] Cache response:", cached)
      
      if (cached.data) {
        setData(cached.data)
        setLoading(false)
        setError(null)
        hasData = true
      }

      // Puis actualiser en arriere-plan
      setRefreshing(true)
      const fresh = await refreshData(s)
      if (process.env.NODE_ENV === 'development') console.log("[Dashboard] Refresh response:", fresh)
      
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
      if (process.env.NODE_ENV === 'development') console.error("Erreur chargement donnees:", err)
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
      const fresh = await refreshData(semestre)
      if (process.env.NODE_ENV === 'development') console.log("[Dashboard] Manual refresh response:", fresh)
      
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
      if (process.env.NODE_ENV === 'development') console.error("Erreur refresh:", err)
      if (!data) {
        setError("Erreur lors du rafraîchissement")
      }
    } finally {
      setRefreshing(false)
    }
  }, [data, semestre])

  // Changer de semestre et recharger les donnees du cache (hook avant tout return)
  const handleSetSemestre = useCallback((s: Semestre) => {
    if (s === semestre) return
    setSemestre(s)
    setLoading(true)
    getCachedData(s).then((res) => {
      if (res.data) setData(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [semestre])

  // Verifier l'authentification au chargement (une seule redirection, ignorer réponses obsolètes)
  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus()
        if (cancelled || authVerifiedRef.current) return
        if (!status.connected) {
          router.replace("/login")
          return
        }
        authVerifiedRef.current = true
        setChecking(false)
        loadData(1)
      } catch {
        if (!cancelled && !authVerifiedRef.current) {
          router.replace("/login")
        }
      }
    }

    checkAuth()
    return () => { cancelled = true }
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
    <DataContext.Provider value={{ data, loading, refreshing, lastRefresh, error, semestre, setSemestre: handleSetSemestre, refresh: handleRefresh }}>
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
