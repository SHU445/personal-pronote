import { NextResponse } from 'next/server'

// Redirige vers POST /api/pronote/data en transmettant le paramètre semestre
export async function POST(request: Request) {
  const url = new URL(request.url)
  const semestre = url.searchParams.get('semestre') ?? '1'
  const baseUrl = url.origin
  const target = `${baseUrl}/api/pronote/data?semestre=${semestre}`

  const response = await fetch(target, { method: 'POST' })
  const data = await response.json()
  return NextResponse.json(data)
}
