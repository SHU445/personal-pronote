import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import { useNeon } from '@/lib/db'
import { checkCredentialsExist, connectWithToken } from '@/lib/pronote'

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

  if (useNeon()) {
    try {
      const exist = await checkCredentialsExist()
      if (!exist.connected) {
        log('Neon: aucun credentials')
        return NextResponse.json({ connected: false, error: exist.error ?? 'Aucun token sauvegardé' })
      }
      const result = await connectWithToken()
      log('Neon: résultat connectWithToken', { connected: result.connected })
      return NextResponse.json(result)
    } catch (error) {
      logError('Neon exception:', error)
      return NextResponse.json({
        connected: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
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
    return NextResponse.json(result)
  } catch (error) {
    logError('Exception:', error)
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
