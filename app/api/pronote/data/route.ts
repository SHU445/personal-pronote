import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import { getPronoteCache, useNeon } from '@/lib/db'

const execAsync = promisify(exec)

// Helper pour les logs avec timestamp
function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Pronote Data] ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '')
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [Pronote Data] ERROR: ${message}`, error)
}

// GET: Lire les donnees en cache (Neon ou fichier)
export async function GET() {
  log('=== GET CACHE DATA ===')

  try {
    if (useNeon()) {
      const row = await getPronoteCache()
      if (row?.data) {
        const data = row.data as Record<string, unknown>
        log('Cache trouvé (Neon):', {
          export_date: data.export_date,
          eleve: (data.eleve as { nom?: string })?.nom,
          notes_count: Array.isArray(data.notes) ? data.notes.length : 0,
          devoirs_count: Array.isArray(data.devoirs) ? data.devoirs.length : 0
        })
        log('=== FIN GET CACHE - Succès ===')
        return NextResponse.json({
          success: true,
          data,
          cached: true
        })
      }
      log('Pas de cache Neon')
      log('=== FIN GET CACHE - Pas de cache ===')
      return NextResponse.json({
        success: false,
        error: 'Aucune donnee en cache',
        cached: false
      })
    }

    const dataFile = path.join(process.cwd(), 'backend', 'data.json')
    log('Lecture fichier:', dataFile)

    try {
      const content = await fs.readFile(dataFile, 'utf-8')
      const data = JSON.parse(content)
      log('Cache trouvé:', {
        export_date: data.export_date,
        eleve: data.eleve?.nom,
        notes_count: data.notes?.length || 0,
        devoirs_count: data.devoirs?.length || 0
      })
      log('=== FIN GET CACHE - Succès ===')
      return NextResponse.json({
        success: true,
        data,
        cached: true
      })
    } catch (readError) {
      log('Pas de cache disponible:', readError)
      log('=== FIN GET CACHE - Pas de cache ===')
      return NextResponse.json({
        success: false,
        error: 'Aucune donnee en cache',
        cached: false
      })
    }
  } catch (error) {
    logError('Exception:', error)
    log('=== FIN GET CACHE - ERREUR ===')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur'
    }, { status: 500 })
  }
}

// POST: Actualiser les donnees depuis Pronote
export async function POST() {
  log('=== POST REFRESH DATA ===')
  
  try {
    const backendDir = path.join(process.cwd(), 'backend')
    const pythonScript = path.join(backendDir, 'pronote_client.py')
    
    // Vérifier credentials avant d'appeler (fichier uniquement ; si Neon, Python vérifiera)
    if (!useNeon()) {
      const credsPath = path.join(backendDir, 'credentials.json')
      try {
        const creds = await fs.readFile(credsPath, 'utf-8')
        const credsData = JSON.parse(creds)
        log('Credentials disponibles:', {
          url: credsData.url?.substring(0, 50) + '...',
          username: credsData.username,
          hasPassword: !!credsData.password,
          passwordLength: credsData.password?.length || 0,
          hasUuid: !!credsData.uuid
        })
      } catch {
        logError('Aucun credentials.json - connexion impossible')
        return NextResponse.json({
          success: false,
          error: 'Non connecté - aucun token sauvegardé',
          tokenExpired: true
        })
      }
    } else {
      log('Neon actif - vérification credentials côté Python')
    }

    const command = `python "${pythonScript}" data`
    log('Exécution:', command)
    
    let stdout = ''
    let stderr = ''
    
    const startTime = Date.now()
    
    try {
      const result = await execAsync(command, { 
        cwd: backendDir,
        timeout: 120000, // 2 minutes max
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      })
      stdout = result.stdout
      stderr = result.stderr
    } catch (execError) {
      const err = execError as { stdout?: string; stderr?: string; message?: string }
      logError('Erreur exec:', err.message)
      if (err.stdout) {
        stdout = err.stdout
        log('STDOUT récupéré de l\'erreur:', stdout.substring(0, 500))
      }
      if (err.stderr) {
        stderr = err.stderr
        log('STDERR récupéré de l\'erreur:', stderr)
      }
    }
    
    const duration = Date.now() - startTime
    log(`Commande terminée en ${duration}ms`)
    
    if (stderr) {
      log('STDERR complet:', stderr)
    }
    
    if (!stdout.trim()) {
      logError('Aucune sortie du script Python')
      log('=== FIN REFRESH - Pas de réponse ===')
      return NextResponse.json({
        success: false,
        error: 'Aucune reponse du serveur Pronote'
      })
    }
    
    log('STDOUT brut (500 premiers chars):', stdout.trim().substring(0, 500))
    
    let data
    try {
      data = JSON.parse(stdout.trim())
    } catch (parseError) {
      logError('Erreur parsing JSON:', parseError)
      logError('Contenu à parser:', stdout.trim().substring(0, 200))
      throw parseError
    }
    
    log('Données parsées:', {
      hasError: !!data.error,
      error: data.error,
      hasEleve: !!data.eleve,
      notes_count: data.notes?.length,
      details: data.details
    })
    
    // Gerer les erreurs de connexion (token expire, etc.)
    if (data.error) {
      log('Erreur détectée dans la réponse:', data.error)

      // Essayer de retourner le cache avec l'erreur (Neon ou fichier)
      try {
        let cachedData: Record<string, unknown>
        if (useNeon()) {
          const row = await getPronoteCache()
          cachedData = (row?.data as Record<string, unknown>) ?? {}
        } else {
          const dataFile = path.join(process.cwd(), 'backend', 'data.json')
          const content = await fs.readFile(dataFile, 'utf-8')
          cachedData = JSON.parse(content)
        }
        if (Object.keys(cachedData).length > 0) {
          log('Retour du cache avec erreur')
          log('=== FIN REFRESH - Cache + Erreur ===')
          return NextResponse.json({
            success: true,
            data: cachedData,
            cached: true,
            error: data.error,
            tokenExpired: data.details?.token_expired || data.error.includes('expire')
          })
        }
        throw new Error('Cache vide')
      } catch {
        log('Pas de cache, retour erreur seule')
        log('=== FIN REFRESH - Erreur sans cache ===')
        return NextResponse.json({
          success: false,
          error: data.error,
          tokenExpired: data.details?.token_expired || data.error.includes('expire')
        })
      }
    }
    
    log('Refresh réussi!', {
      export_date: data.export_date,
      eleve: data.eleve?.nom
    })
    log('=== FIN REFRESH - Succès ===')
    
    return NextResponse.json({
      success: true,
      data,
      cached: false,
      refreshedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logError('Exception globale:', error)

    // En cas d'erreur, essayer de retourner le cache (Neon ou fichier)
    try {
      let data: Record<string, unknown>
      if (useNeon()) {
        const row = await getPronoteCache()
        data = (row?.data as Record<string, unknown>) ?? {}
      } else {
        const dataFile = path.join(process.cwd(), 'backend', 'data.json')
        const content = await fs.readFile(dataFile, 'utf-8')
        data = JSON.parse(content)
      }
      if (Object.keys(data).length > 0) {
        log('Retour cache après exception')
        log('=== FIN REFRESH - Cache après exception ===')
        return NextResponse.json({
          success: true,
          data,
          cached: true,
          refreshError: error instanceof Error ? error.message : 'Erreur'
        })
      }
      throw new Error('Cache vide')
    } catch {
      log('=== FIN REFRESH - ERREUR TOTALE ===')
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur'
      })
    }
  }
}
