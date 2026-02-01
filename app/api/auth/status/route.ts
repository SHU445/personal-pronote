import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'

const execAsync = promisify(exec)

// Helper pour les logs avec timestamp
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
  
  try {
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    
    // Vérifier d'abord si credentials.json existe
    const credsPath = path.join(backendDir, 'credentials.json')
    try {
      const creds = await fs.readFile(credsPath, 'utf-8')
      const credsData = JSON.parse(creds)
      log('Credentials trouvés:', { 
        url: credsData.url?.substring(0, 50) + '...', 
        username: credsData.username,
        hasPassword: !!credsData.password,
        hasUuid: !!credsData.uuid
      })
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
    const duration = Date.now() - startTime
    
    log(`Commande terminée en ${duration}ms`)
    log('STDOUT:', stdout.trim())
    
    if (stderr) {
      log('STDERR:', stderr)
    }
    
    const result = JSON.parse(stdout.trim())
    log('Résultat:', result)
    log('=== FIN VERIFICATION STATUT ===')
    
    return NextResponse.json(result)
    
  } catch (error) {
    logError('Exception:', error)
    log('=== FIN VERIFICATION STATUT - ERREUR ===')
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
