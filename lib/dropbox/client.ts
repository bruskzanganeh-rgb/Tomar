import { Dropbox } from 'dropbox'
import { createClient } from '@/lib/supabase/server'

export async function getDropboxClient(): Promise<Dropbox | null> {
  const supabase = await createClient()

  // Get access token from database
  const { data: settings } = await supabase
    .from('company_settings')
    .select('dropbox_access_token, dropbox_token_expires_at')
    .single()

  if (!settings?.dropbox_access_token) {
    return null
  }

  // Check if token is expired
  const expiresAt = settings.dropbox_token_expires_at
    ? new Date(settings.dropbox_token_expires_at)
    : null

  if (expiresAt && expiresAt < new Date()) {
    // Token expired, need to refresh
    // TODO: Implement token refresh
    return null
  }

  return new Dropbox({
    accessToken: settings.dropbox_access_token,
    fetch: fetch, // Provide fetch implementation for Next.js
  })
}

export async function storeDropboxTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  accountId: string
) {
  const supabase = await createClient()

  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const { error } = await supabase
    .from('company_settings')
    .update({
      dropbox_access_token: accessToken,
      dropbox_refresh_token: refreshToken,
      dropbox_token_expires_at: expiresAt.toISOString(),
      dropbox_account_id: accountId,
      dropbox_connected_at: new Date().toISOString(),
    })
    .eq('id', (await supabase.from('company_settings').select('id').single()).data?.id)

  if (error) {
    throw new Error(`Failed to store Dropbox tokens: ${error.message}`)
  }
}

export async function clearDropboxTokens() {
  const supabase = await createClient()

  const { error } = await supabase
    .from('company_settings')
    .update({
      dropbox_access_token: null,
      dropbox_refresh_token: null,
      dropbox_token_expires_at: null,
      dropbox_account_id: null,
    })
    .eq('id', (await supabase.from('company_settings').select('id').single()).data?.id)

  if (error) {
    throw new Error(`Failed to clear Dropbox tokens: ${error.message}`)
  }
}
