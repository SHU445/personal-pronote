import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import { useNeon } from '@/lib/db'
import { connectWithQRCode } from '@/lib/pronote'

const execAsync = promisify(exec)

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

  let body: { qr_json?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ connected: false, error: 'Body JSON invalide' }, { status: 400 })
  }
  const { qr_json, pin } = body
  log('Données reçues:', { qr_json_length: qr_json?.length ?? 0, pin_length: pin?.length ?? 0 })

  if (!qr_json || !pin) {
    return NextResponse.json({ connected: false, error: 'QR code et PIN requis' }, { status: 400 })
  }

  if (useNeon()) {
    try {
      const result = await connectWithQRCode(qr_json, pin)
      log('Neon: résultat connectWithQRCode', { connected: result.connected })
      return NextResponse.json(result)
    } catch (error) {
      logError('Neon exception:', error)
      return NextResponse.json({
        connected: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion'
      }, { status: 500 })
    }
  }

  try {
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    const tempFile = path.join(backendDir, 'temp_qr.json')
    await fs.writeFile(tempFile, JSON.stringify({ qr_json, pin }), 'utf-8')
    const command = `python "${pythonScript}" connect_qr_file "${tempFile}"`
    log('Exécution:', command)
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(command, {
      cwd: backendDir,
      timeout: 60000,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    log(`Commande terminée en ${Date.now() - startTime}ms`)
    if (stderr) log('STDERR:', stderr)
    try { await fs.unlink(tempFile) } catch { /* ignore */ }
    const result = JSON.parse(stdout.trim())
    log('Résultat:', result)
    return NextResponse.json(result)
  } catch (error) {
    logError('Exception:', error)
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    }, { status: 500 })
  }
}
