import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { useNeon } from '@/lib/db'
import { logoutPronote } from '@/lib/pronote'

const execAsync = promisify(exec)

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

  if (useNeon()) {
    try {
      const result = await logoutPronote()
      log('Neon: résultat logout', result)
      return NextResponse.json(result)
    } catch (error) {
      logError('Neon exception:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de deconnexion'
      }, { status: 500 })
    }
  }

  try {
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    const command = `python "${pythonScript}" logout`
    log('Exécution:', command)
    const { stdout, stderr } = await execAsync(command, {
      cwd: backendDir,
      timeout: 10000,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    if (stderr) log('STDERR:', stderr)
    const result = JSON.parse(stdout.trim())
    log('Résultat:', result)
    return NextResponse.json(result)
  } catch (error) {
    logError('Exception:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de deconnexion'
    }, { status: 500 })
  }
}
