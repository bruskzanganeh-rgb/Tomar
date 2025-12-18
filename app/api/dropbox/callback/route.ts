import { NextRequest, NextResponse } from 'next/server'
import { Dropbox, DropboxAuth } from 'dropbox'
import { storeDropboxTokens } from '@/lib/dropbox/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('🔵 Dropbox callback received:', {
    code: code ? `${code.substring(0, 10)}...` : null,
    error,
    errorDescription
  })

  if (error) {
    console.error('❌ Dropbox OAuth error from provider:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/import?error=${error}`, request.url)
    )
  }

  if (!code) {
    console.error('❌ No authorization code received')
    return NextResponse.redirect(new URL('/import?error=no_code', request.url))
  }

  const appKey = process.env.DROPBOX_APP_KEY
  const appSecret = process.env.DROPBOX_APP_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/dropbox/callback`

  console.log('🔑 Using credentials:', {
    appKey: appKey ? `${appKey.substring(0, 10)}...` : 'MISSING',
    redirectUri
  })

  if (!appKey || !appSecret) {
    console.error('❌ Missing Dropbox credentials')
    return NextResponse.redirect(
      new URL('/import?error=config_missing', request.url)
    )
  }

  try {
    const dbxAuth = new DropboxAuth({
      clientId: appKey,
      clientSecret: appSecret,
      fetch: fetch,
    })

    console.log('🔄 Exchanging code for token...')
    // Exchange code for access token
    const response = await dbxAuth.getAccessTokenFromCode(redirectUri, code) as {
      result: { access_token: string; refresh_token?: string; expires_in?: number }
    }

    const accessToken = response.result.access_token
    const refreshToken = response.result.refresh_token
    const expiresIn = response.result.expires_in || 14400 // 4 hours default

    console.log('✅ Token exchange successful')

    // Get account info
    const dbxAuthed = new Dropbox({
      accessToken,
      fetch: fetch // Provide fetch implementation for Next.js
    })
    const accountInfo = await dbxAuthed.usersGetCurrentAccount()
    const accountId = accountInfo.result.account_id

    console.log('✅ Account info retrieved:', accountId)

    // Store tokens in database
    await storeDropboxTokens(accessToken, refreshToken || '', expiresIn, accountId)

    console.log('✅ Tokens stored in database')

    // Redirect to import page with success
    return NextResponse.redirect(new URL('/import?connected=true', request.url))
  } catch (error: any) {
    console.error('❌ Dropbox OAuth error:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      error: error.error,
    })
    return NextResponse.redirect(
      new URL('/import?error=oauth_failed', request.url)
    )
  }
}
