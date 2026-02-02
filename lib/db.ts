/**
 * Accès Neon pour credentials et cache Pronote (Solution 1 : tout en Node avec Pawnote).
 */

import { neon } from '@neondatabase/serverless'

export type PronoteCacheRow = {
  data: unknown
  export_date: string | null
}

export type PronoteCredentialsRow = {
  url: string
  username: string
  password: string
  uuid: string
}

/**
 * Récupère le cache Pronote depuis Neon (une seule ligne id=1).
 */
export async function getPronoteCache(): Promise<PronoteCacheRow | null> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return null
  try {
    const sql = neon(connectionString)
    const rows = await sql`SELECT data, export_date FROM pronote_cache WHERE id = 1 LIMIT 1`
    if (!rows.length || !rows[0]) return null
    const row = rows[0] as { data: unknown; export_date: string | null }
    if (!row.data || (typeof row.data === 'object' && Object.keys(row.data as object).length === 0)) return null
    return { data: row.data, export_date: row.export_date ?? null }
  } catch {
    return null
  }
}

/**
 * Enregistre le cache Pronote dans Neon (upsert).
 */
export async function setPronoteCache(data: Record<string, unknown>): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL non défini')
  const sql = neon(connectionString)
  const exportDate = (data.export_date as string) || new Date().toISOString()
  await sql`
    INSERT INTO pronote_cache (id, data, export_date, updated_at)
    VALUES (1, ${JSON.stringify(data)}::jsonb, ${exportDate}::timestamptz, NOW())
    ON CONFLICT (id) DO UPDATE SET
      data = EXCLUDED.data,
      export_date = EXCLUDED.export_date,
      updated_at = NOW()
  `
}

/**
 * Récupère les credentials Pronote depuis Neon (une seule ligne id=1).
 */
export async function getPronoteCredentials(): Promise<PronoteCredentialsRow | null> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return null
  try {
    const sql = neon(connectionString)
    const rows = await sql`SELECT url, username, password, uuid FROM pronote_credentials WHERE id = 1 LIMIT 1`
    if (!rows.length || !rows[0]) return null
    const row = rows[0] as PronoteCredentialsRow
    if (!row.url || !row.username || !row.password || !row.uuid) return null
    return row
  } catch {
    return null
  }
}

/**
 * Enregistre les credentials Pronote dans Neon (upsert).
 */
export async function setPronoteCredentials(
  url: string,
  username: string,
  password: string,
  uuid: string
): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL non défini')
  const sql = neon(connectionString)
  await sql`
    INSERT INTO pronote_credentials (id, url, username, password, uuid, updated_at)
    VALUES (1, ${url}, ${username}, ${password}, ${uuid}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      url = EXCLUDED.url,
      username = EXCLUDED.username,
      password = EXCLUDED.password,
      uuid = EXCLUDED.uuid,
      updated_at = NOW()
  `
}

/**
 * Supprime les credentials Pronote (déconnexion).
 */
export async function deletePronoteCredentials(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return
  const sql = neon(connectionString)
  await sql`DELETE FROM pronote_credentials WHERE id = 1`
}

/**
 * True si Neon est configuré (DATABASE_URL défini).
 */
export function useNeon(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
