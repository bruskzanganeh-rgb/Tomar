'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { SignatureCanvas } from '@/components/ui/signature-pad'
import { Loader2, CheckCircle2, FileText, Download, AlertTriangle } from 'lucide-react'

type ContractData = {
  contract_number: string
  tier: string
  annual_price: number
  currency: string
  billing_interval: string
  vat_rate_pct: number
  contract_start_date: string
  contract_duration_months: number
  signer_name: string
  signer_email: string
  signer_title: string | null
  company_name: string | null
  document_hash: string | null
  pdf_url: string | null
  status: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(amount)
}

export function SigningForm() {
  const { token } = useParams<{ token: string }>()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)

  // Form state
  const [signerName, setSignerName] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false)
  const [termsConfirmed, setTermsConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`/api/contracts/sign/${token}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to load contract')
          return
        }
        const data = await res.json()
        setContract(data)
        setSignerName(data.signer_name || '')
        setSignerTitle(data.signer_title || '')
      } catch {
        setError('Failed to load contract')
      } finally {
        setLoading(false)
      }
    }
    fetchContract()
  }, [token])

  async function handleSign() {
    if (!signatureData || !authorityConfirmed || !termsConfirmed || !signerName.trim()) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/contracts/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_title: signerTitle.trim() || undefined,
          signature_image: signatureData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error || 'Failed to sign agreement')
        return
      }

      setSigned(true)
    } catch {
      setSubmitError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSign = signatureData && authorityConfirmed && termsConfirmed && signerName.trim()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Agreement</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-lg font-semibold mb-2">Agreement Signed Successfully</h2>
            <p className="text-muted-foreground mb-4">
              Thank you. A confirmation email has been sent to {contract?.signer_email}.
            </p>
            <p className="text-xs text-muted-foreground">
              Contract: {contract?.contract_number}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!contract) return null

  const vatAmount = contract.annual_price * (contract.vat_rate_pct / 100)
  const total = contract.annual_price + vatAmount

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Subscription Agreement</h1>
          <p className="text-muted-foreground mt-1">{contract.contract_number}</p>
        </div>

        {/* Contract Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agreement Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contract.company_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{contract.company_name}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium">{contract.tier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Annual Price (excl. VAT)</span>
              <span className="font-medium">{formatCurrency(contract.annual_price, contract.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT ({contract.vat_rate_pct}%)</span>
              <span className="font-medium">{formatCurrency(vatAmount, contract.currency)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Total (incl. VAT)</span>
              <span className="font-bold">{formatCurrency(total, contract.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start Date</span>
              <span className="font-medium">{contract.contract_start_date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{contract.contract_duration_months} months</span>
            </div>
          </CardContent>
        </Card>

        {/* PDF Download */}
        {contract.pdf_url && (
          <Card>
            <CardContent className="pt-6">
              <a
                href={contract.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-8 w-8 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Full Agreement (PDF)</p>
                  <p className="text-xs text-muted-foreground">Review the complete terms before signing</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            </CardContent>
          </Card>
        )}

        {/* Signing Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="signer-name">Full Name *</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label htmlFor="signer-email">Email</Label>
              <Input
                id="signer-email"
                value={contract.signer_email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="signer-title">Title / Role</Label>
              <Input
                id="signer-title"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g. Managing Director"
              />
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <Label>Signature *</Label>
              <SignatureCanvas
                onSignatureChange={setSignatureData}
                height={150}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="authority"
                  checked={authorityConfirmed}
                  onCheckedChange={(checked) => setAuthorityConfirmed(checked === true)}
                />
                <label htmlFor="authority" className="text-sm leading-tight cursor-pointer">
                  I confirm that I have the authority to sign this agreement on behalf of the organization
                </label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={termsConfirmed}
                  onCheckedChange={(checked) => setTermsConfirmed(checked === true)}
                />
                <label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                  I have read and accept the terms of this agreement
                </label>
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSign}
              disabled={!canSign || submitting}
              className="w-full"
              size="lg"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Agreement
            </Button>

            {/* Hash info */}
            {contract.document_hash && (
              <p className="text-xs text-center text-muted-foreground">
                Document hash: {contract.document_hash.substring(0, 16)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
