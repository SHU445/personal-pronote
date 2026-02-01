"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Key, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { loginWithQRCode } from "@/lib/api"

export function QRCodeLogin() {
  const router = useRouter()
  const [qrJson, setQrJson] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await loginWithQRCode(qrJson, pin)
      
      if (result.connected) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      } else {
        setError(result.error || "Connexion echouee")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <QrCode className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Connexion Pronote</CardTitle>
        <CardDescription>
          Connectez-vous avec le QR code de votre application Pronote
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Instructions */}
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Comment obtenir le QR code :</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ouvrez Pronote sur votre telephone</li>
              <li>Allez dans Parametres &gt; Compte</li>
              <li>Selectionnez &quot;Connexion a un autre appareil&quot;</li>
              <li>Scannez le QR code ou copiez son contenu</li>
            </ol>
          </div>

          {/* QR Code JSON */}
          <div className="space-y-2">
            <Label htmlFor="qr-json">Contenu du QR Code (JSON)</Label>
            <Textarea
              id="qr-json"
              placeholder='{"jeton": "...", "login": "...", "url": "..."}'
              value={qrJson}
              onChange={(e) => setQrJson(e.target.value)}
              className="min-h-[100px] font-mono text-xs"
              required
            />
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <Label htmlFor="pin">Code PIN (4 chiffres)</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="0000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="pl-10 text-center text-lg tracking-widest"
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Connexion reussie ! Redirection...</span>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading || success}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion en cours...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Connecte !
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
