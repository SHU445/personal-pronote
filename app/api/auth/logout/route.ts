import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// Helper pour les logs avec timestamp
function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Auth Logout] ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '')
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [Auth Logout] ERROR: ${message}`, error)
}

export async function POST() {
  log('=== LOGOUT ===')
  
  try {
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    
    const command = `python "${pythonScript}" logout`
    log('Exécution:', command)
    
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(command, { 
      cwd: backendDir,
      timeout: 10000,
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
    log('=== FIN LOGOUT ===')
    
    return NextResponse.json(result)
    
  } catch (error) {
    logError('Exception:', error)
    log('=== FIN LOGOUT - ERREUR ===')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de deconnexion'
    }, { status: 500 })
  }
}
