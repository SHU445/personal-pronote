/**
 * Accès Neon pour le cache Pronote (lecture côté Next.js).
 * Les credentials et l'écriture du cache sont gérés par le backend Python.
 */

import { neon } from '@neondatabase/serverless'

export type PronoteCacheRow = {
  data: unknown
  export_date: string | null
}

/**
 * Récupère le cache Pronote depuis Neon (une seule ligne id=1).
 * Retourne null si DATABASE_URL absent ou aucun cache.
 */
export async function getPronoteCache(): Promise<PronoteCacheRow | null> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return null
  }
  try {
    const sql = neon(connectionString)
    const rows = await sql`SELECT data, export_date FROM pronote_cache WHERE id = 1 LIMIT 1`
    if (!rows.length || !rows[0]) return null
    const row = rows[0] as { data: unknown; export_date: string | null }
    if (!row.data || (typeof row.data === 'object' && Object.keys(row.data as object).length === 0)) {
      return null
    }
    return {
      data: row.data,
      export_date: row.export_date ?? null
    }
  } catch {
    return null
  }
}

/**
 * True si Neon est configuré (DATABASE_URL défini).
 */
export function useNeon(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
