'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, FileText, Download, AlertTriangle, Send } from 'lucide-react'

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
  reviewer_name: string | null
  reviewer_email: string | null
  company_name: string | null
  document_hash: string | null
  pdf_url: string | null
  status: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(amount)
}

export function ReviewForm() {
  const { token } = useParams<{ token: string }>()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`/api/contracts/review/${token}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to load contract')
          return
        }
        const data = await res.json()
        setContract(data)
      } catch {
        setError('Failed to load contract')
      } finally {
        setLoading(false)
      }
    }
    fetchContract()
  }, [token])

  async function handleApprove() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/contracts/review/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error || 'Failed to approve')
        return
      }

      setApproved(true)
    } catch {
      setSubmitError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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

  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-lg font-semibold mb-2">Agreement Approved</h2>
            <p className="text-muted-foreground mb-2">
              The agreement has been forwarded to <strong>{contract?.signer_name}</strong> ({contract?.signer_email}) for signing.
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
          <h1 className="text-2xl font-bold text-gray-900">Agreement Review</h1>
          <p className="text-muted-foreground mt-1">{contract.contract_number}</p>
        </div>

        {/* Info banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-blue-800">
              You have been asked to review this agreement. After your approval, it will be sent to <strong>{contract.signer_name}</strong> ({contract.signer_email}) for signing.
            </p>
          </CardContent>
        </Card>

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
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Signer</span>
              <span className="font-medium">{contract.signer_name} ({contract.signer_email})</span>
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
                  <p className="text-xs text-muted-foreground">Review the complete terms before approving</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            </CardContent>
          </Card>
        )}

        {/* Approve Button */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Approve and Forward to Signer
            </Button>
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
