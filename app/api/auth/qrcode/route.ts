import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Helper pour les logs avec timestamp
function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Auth QRCode] ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '')
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [Auth QRCode] ERROR: ${message}`, error)
}

export async function POST(request: NextRequest) {
  log('=== DEBUT CONNEXION QR CODE ===')
  
  try {
    const body = await request.json()
    const { qr_json, pin } = body
    
    log('Données reçues:', { 
      qr_json_length: qr_json?.length || 0, 
      qr_json_preview: qr_json?.substring(0, 100) + '...',
      pin_length: pin?.length || 0 
    })
    
    if (!qr_json || !pin) {
      logError('QR code ou PIN manquant')
      return NextResponse.json({
        connected: false,
        error: 'QR code et PIN requis'
      }, { status: 400 })
    }
    
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    const tempFile = path.join(backendDir, 'temp_qr.json')
    
    log('Chemins:', { backendDir, pythonScript, tempFile })
    
    // Ecrire le QR JSON dans un fichier temporaire pour eviter les problemes d'echappement
    await fs.writeFile(tempFile, JSON.stringify({ qr_json, pin }), 'utf-8')
    log('Fichier temporaire créé')
    
    const command = `python "${pythonScript}" connect_qr_file "${tempFile}"`
    log('Exécution commande:', command)
    
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(command, { 
      cwd: backendDir,
      timeout: 60000,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    const duration = Date.now() - startTime
    
    log(`Commande terminée en ${duration}ms`)
    log('STDOUT:', stdout.trim())
    
    if (stderr) {
      log('STDERR:', stderr)
    }
    
    // Supprimer le fichier temporaire
    try {
      await fs.unlink(tempFile)
      log('Fichier temporaire supprimé')
    } catch {
      // Ignorer l'erreur si le fichier n'existe pas
    }
    
    const result = JSON.parse(stdout.trim())
    log('Résultat parsé:', result)
    
    // Vérifier si credentials.json a été créé
    try {
      const credsPath = path.join(backendDir, 'credentials.json')
      const creds = await fs.readFile(credsPath, 'utf-8')
      log('Credentials sauvegardés:', JSON.parse(creds))
    } catch (e) {
      logError('Credentials non trouvés après connexion', e)
    }
    
    log('=== FIN CONNEXION QR CODE - Succès:', result.connected)
    return NextResponse.json(result)
    
  } catch (error) {
    logError('Exception:', error)
    log('=== FIN CONNEXION QR CODE - ERREUR ===')
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    }, { status: 500 })
  }
}
