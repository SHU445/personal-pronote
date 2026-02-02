"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Key, Loader2, AlertCircle, CheckCircle, Upload, ImageIcon } from "lucide-react"
import jsQR from "jsqr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { loginWithQRCode } from "@/lib/api"

const MAX_IMAGE_DIM = 1200

function decodeQRFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  })
  return code?.data ?? null
}

export function QRCodeLogin() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [qrJson, setQrJson] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [decodeLoading, setDecodeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleImageUpload = (file: File) => {
    setUploadError(null)
    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez sélectionner une image (PNG, JPG, etc.).")
      return
    }
    setDecodeLoading(true)
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        let { width, height } = img
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const ratio = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          setUploadError("Impossible de lire l'image.")
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const decoded = decodeQRFromImageData(imageData)
        URL.revokeObjectURL(url)
        if (decoded) {
          setQrJson(decoded.trim())
          setError(null)
        } else {
          setUploadError("Aucun QR code reconnu dans cette image.")
        }
      } catch {
        setUploadError("Erreur lors du décodage de l'image.")
      } finally {
        setDecodeLoading(false)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setUploadError("Impossible de charger l'image.")
      setDecodeLoading(false)
    }
    img.src = url
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

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
              <li>Scannez le QR code, copiez son contenu ou uploadez une capture d&apos;écran</li>
            </ol>
          </div>

          {/* Téléverser une image du QR code */}
          <div className="space-y-2">
            <Label>Ou téléversez une image du QR code</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
              aria-label="Choisir une image du QR code"
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 transition-colors hover:border-primary/50 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {decodeLoading ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Décodage en cours...</span>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Glissez une capture d&apos;écran ou une image ici</span>
                  <span className="text-xs text-muted-foreground">ou cliquez pour parcourir</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> PNG, JPG, WebP…
                  </span>
                </>
              )}
            </div>
            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
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
