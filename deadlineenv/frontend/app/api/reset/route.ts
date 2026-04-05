import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL
  if (!url) {
    throw new Error('BACKEND_URL is required')
  }
  return url
}

function withCors(response: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    response.headers.set(k, v)
  }
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const backendUrl = getBackendUrl()
  const body = await req.text()
  const res = await fetch(`${backendUrl}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const text = await res.text()
  let data: unknown = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }
  return withCors(NextResponse.json(data, { status: res.status }))
}
