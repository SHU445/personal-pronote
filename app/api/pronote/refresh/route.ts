import { NextResponse } from 'next/server'

// Redirect to POST /api/pronote/data
export async function POST(request: Request) {
  const baseUrl = new URL(request.url).origin
  
  const response = await fetch(`${baseUrl}/api/pronote/data`, {
    method: 'POST',
  })
  
  const data = await response.json()
  return NextResponse.json(data)
}
