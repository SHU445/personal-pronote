import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import { useNeon } from '@/lib/db'
import { checkCredentialsExist } from '@/lib/pronote'

const execAsync = promisify(exec)

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Auth Status] ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '')
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [Auth Status] ERROR: ${message}`, error)
}

export async function GET() {
  log('=== VERIFICATION STATUT AUTH ===')

  const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

  if (useNeon()) {
    try {
      const exist = await checkCredentialsExist()
      if (!exist.connected) {
        log('Neon: aucun credentials')
        return NextResponse.json({ connected: false, error: exist.error ?? 'Aucun token sauvegardé' }, { headers: noCacheHeaders })
      }
      // Ne pas appeler connectWithToken() ici : évite double connexion Pronote
      // (dashboard fait ensuite refreshData qui se connecte). Sinon 2 appels
      // simultanés en Strict Mode peuvent faire échouer l'un et déconnecter.
      log('Neon: credentials présents, statut connecté')
      return NextResponse.json({ connected: true }, { headers: noCacheHeaders })
    } catch (error) {
      logError('Neon exception:', error)
      return NextResponse.json({
        connected: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { headers: noCacheHeaders })
    }
  }

  try {
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    const credsPath = path.join(backendDir, 'credentials.json')
    try {
      const creds = await fs.readFile(credsPath, 'utf-8')
      const credsData = JSON.parse(creds)
      log('Credentials trouvés:', { url: credsData.url?.substring(0, 50) + '...', username: credsData.username, hasPassword: !!credsData.password, hasUuid: !!credsData.uuid })
    } catch {
      log('Aucun fichier credentials.json trouvé')
    }
    const command = `python "${pythonScript}" status`
    log('Exécution:', command)
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(command, {
      cwd: backendDir,
      timeout: 30000,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    log(`Commande terminée en ${Date.now() - startTime}ms`)
    if (stderr) log('STDERR:', stderr)
    const result = JSON.parse(stdout.trim())
    log('Résultat:', result)
    return NextResponse.json(result, { headers: noCacheHeaders })
  } catch (error) {
    logError('Exception:', error)
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { headers: noCacheHeaders })
  }
}
