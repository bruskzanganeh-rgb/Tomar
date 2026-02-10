'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Music, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function SignupPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate invitation code
    if (!invitationCode.trim()) {
      setError(t('invitationCodeRequired'))
      setLoading(false)
      return
    }

    const codeRes = await fetch('/api/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: invitationCode }),
    })
    const codeData = await codeRes.json()

    if (!codeData.valid) {
      setError(codeData.reason === 'expired' ? t('codeExpired') : t('invalidCode'))
      setLoading(false)
      return
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Set up user via server-side API (uses service_role key to bypass RLS,
    // since there's no session yet before email confirmation)
    if (data.user) {
      await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, company_name: companyName, invitation_code: invitationCode }),
      })
    }

    // If email confirmation is required
    if (data.user && !data.session) {
      setSuccess(true)
    } else {
      router.push('/')
      router.refresh()
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Music className="h-7 w-7 text-green-600" />
            </div>
            <CardTitle>{t('checkEmail')}</CardTitle>
            <CardDescription>
              {t.rich('confirmationSent', { email, strong: (chunks) => <strong>{chunks}</strong> })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                {t('backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('signup')}</CardTitle>
          <CardDescription>{t('signupSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invitationCode">{t('invitationCode')}</Label>
              <Input
                id="invitationCode"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                required
                className="uppercase tracking-widest font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">{t('companyName')}</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ditt företag AB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('minChars')}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('signup')}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
