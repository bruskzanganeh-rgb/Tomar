import { NextResponse } from 'next/server'

export async function GET() {
  const appKey = process.env.DROPBOX_APP_KEY
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/dropbox/callback`

  if (!appKey) {
    return NextResponse.json(
      { error: 'Dropbox app key not configured' },
      { status: 500 }
    )
  }

  // Build OAuth URL manually (more reliable than SDK's getAuthenticationUrl)
  const authUrl = new URL('https://www.dropbox.com/oauth2/authorize')
  authUrl.searchParams.set('client_id', appKey)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('token_access_type', 'offline') // Get refresh token

  return NextResponse.json({ authUrl: authUrl.toString() })
}
