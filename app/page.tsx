"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status")
        const data = await response.json()
        
        if (data.connected) {
          router.replace("/dashboard")
        } else {
          router.replace("/login")
        }
      } catch {
        router.replace("/login")
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification de la connexion...</p>
        </div>
      </div>
    )
  }

  return null
}
