import type { PronoteData, AuthStatus, ApiResponse } from '@/types/pronote'

const API_BASE = '/api'

// Helper pour les logs client (dev uniquement)
function logClient(context: string, message: string, data?: unknown) {
  if (process.env.NODE_ENV !== 'development') return
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [API Client] [${context}] ${message}`, data !== undefined ? data : '')
}

// === Auth ===

export async function checkAuthStatus(): Promise<AuthStatus> {
  logClient('checkAuthStatus', 'Début appel')
  const response = await fetch(`${API_BASE}/auth/status`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
  const result = await response.json()
  logClient('checkAuthStatus', 'Résultat:', result)
  return result
}

export async function loginWithQRCode(qr_json: string, pin: string): Promise<AuthStatus> {
  logClient('loginWithQRCode', 'Début appel', { qr_json_length: qr_json.length, pin_length: pin.length })
  const response = await fetch(`${API_BASE}/auth/qrcode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr_json, pin })
  })
  const result = await response.json()
  logClient('loginWithQRCode', 'Résultat:', result)
  return result
}

export async function logout(): Promise<{ success: boolean; error?: string }> {
  logClient('logout', 'Début appel')
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST'
  })
  const result = await response.json()
  logClient('logout', 'Résultat:', result)
  return result
}

// === Data ===

/** 1 = Semestre 1, 2 = Semestre 2 */
export type Semestre = 1 | 2

export async function getCachedData(semestre: Semestre = 1): Promise<ApiResponse<PronoteData>> {
  logClient('getCachedData', 'Début appel', { semestre })
  const response = await fetch(`${API_BASE}/pronote/data?semestre=${semestre}`)
  const result = await response.json()
  logClient('getCachedData', 'Résultat:', { success: result.success, cached: result.cached, hasData: !!result.data, error: result.error })
  return result
}

export async function refreshData(semestre: Semestre = 1): Promise<ApiResponse<PronoteData>> {
  logClient('refreshData', 'Début appel', { semestre })
  const response = await fetch(`${API_BASE}/pronote/data?semestre=${semestre}`, {
    method: 'POST'
  })
  const result = await response.json()
  logClient('refreshData', 'Résultat:', { success: result.success, cached: result.cached, hasData: !!result.data, error: result.error, tokenExpired: result.tokenExpired })
  return result
}

// === Helpers ===

export function isConnected(status: AuthStatus): boolean {
  return status.connected === true
}
