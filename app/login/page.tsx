"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sparkles, RefreshCw, AlertCircle, Shield, Zap, Lock } from "lucide-react"
import { QRCodeLogin } from "@/components/auth/QRCodeLogin"
import { ThemeToggle } from "@/components/ThemeToggle"
import { checkAuthStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const isExpired = searchParams.get("expired") === "true"

  useEffect(() => {
    const checkAuth = async () => {
      // Si on vient d'une expiration, ne pas vérifier le status
      if (isExpired) {
        setChecking(false)
        return
      }
      
      try {
        const status = await checkAuthStatus()
        if (status.connected) {
          router.replace("/dashboard")
          return
        }
      } catch {
        // Not connected, show login
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [router, isExpired])

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
          <p className="text-muted-foreground font-medium">Vérification...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">Pronote Dashboard</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Interface personnelle</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {/* Message de session expirée */}
        {isExpired && (
          <div className={cn(
            "w-full max-w-md p-4 rounded-xl flex items-start gap-3 animate-slide-up",
            "bg-destructive/10 border-2 border-destructive/20"
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Session expirée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Votre token Pronote a expiré. Scannez un nouveau QR code depuis votre application Pronote pour vous reconnecter.
              </p>
            </div>
          </div>
        )}
        
        <div className="animate-slide-up" style={{ animationDelay: isExpired ? "0.1s" : "0s" }}>
          <QRCodeLogin />
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-3 gap-4 max-w-md w-full mt-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {[
            { icon: Shield, label: "Sécurisé", desc: "Connexion chiffrée" },
            { icon: Zap, label: "Rapide", desc: "Données en temps réel" },
            { icon: Lock, label: "Privé", desc: "Données locales" },
          ].map((feature, index) => (
            <div 
              key={feature.label}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-card/50 border border-border/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-medium">{feature.label}</p>
              <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Pronote Dashboard • Connexion sécurisée via <span className="font-medium text-foreground">Pawnote</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex flex-col items-center gap-4">
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
