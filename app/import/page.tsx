'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, FileText, Upload, Search, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type Step = 'connect' | 'select' | 'process' | 'complete'

type ScannedInvoice = {
  path: string
  name: string
  size: number
  modified: string
  invoiceNumber: number
  existsInDb: boolean
  status: 'exists' | 'missing'
}

type ScanSummary = {
  total: number
  existing: number
  missing: number
  firstInvoice: number
  lastInvoice: number
}

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<Step>('connect')
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<ScannedInvoice[]>([])
  const [summary, setSummary] = useState<ScanSummary | null>(null)
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    checkDropboxConnection()

    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setSuccess('Dropbox ansluten!')
      setIsConnected(true)
      setCurrentStep('select')
      // Clean URL
      window.history.replaceState({}, '', '/import')
    }
    if (params.get('error')) {
      setError(`Dropbox-anslutning misslyckades: ${params.get('error')}`)
    }
  }, [])

  async function checkDropboxConnection() {
    const { data } = await supabase
      .from('company_settings')
      .select('dropbox_access_token')
      .single()

    if (data?.dropbox_access_token) {
      setIsConnected(true)
      setCurrentStep('select')
    }
  }

  async function handleConnectDropbox() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dropbox/auth')
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setError('Kunde inte starta Dropbox-anslutning')
        setLoading(false)
      }
    } catch (err) {
      setError('Ett fel uppstod vid anslutning till Dropbox')
      setLoading(false)
    }
  }

  async function handleScanInvoices() {
    setScanning(true)
    setError(null)

    try {
      const response = await fetch('/api/dropbox/scan-all')
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setInvoices(data.invoices)
        setSummary(data.summary)
        setSuccess(`Hittade ${data.summary.total} fakturor! (${data.summary.missing} saknas i databasen)`)
      }
    } catch (err) {
      setError('Kunde inte scanna fakturor från Dropbox')
    }

    setScanning(false)
  }

  async function handleStartImport() {
    setImporting(true)
    setError(null)
    setImportResults([])

    // Get only missing invoices
    const missingInvoices = invoices.filter(inv => inv.status === 'missing')
    setImportProgress({ current: 0, total: missingInvoices.length })

    try {
      const response = await fetch('/api/import/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: missingInvoices }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setImportResults(data.results)
        setSuccess(`Import klar! ${data.summary.succeeded} fakturor importerade, ${data.summary.failed} misslyckades`)
        setCurrentStep('complete')

        // Refresh invoice list
        await handleScanInvoices()
      }
    } catch (err) {
      setError('Import misslyckades')
    }

    setImporting(false)
  }

  const displayedInvoices = showOnlyMissing
    ? invoices.filter((inv) => inv.status === 'missing')
    : invoices

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importera fakturor från Dropbox</h1>
        <p className="text-muted-foreground mt-2">
          Scanna och importera dina PDF-fakturor automatiskt med AI
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        <StepIndicator number={1} label="Anslut Dropbox" active={currentStep === 'connect'} completed={isConnected} />
        <div className="flex-1 h-0.5 bg-gray-200" />
        <StepIndicator number={2} label="Scanna fakturor" active={currentStep === 'select'} completed={invoices.length > 0} />
        <div className="flex-1 h-0.5 bg-gray-200" />
        <StepIndicator number={3} label="Importera" active={currentStep === 'process'} completed={currentStep === 'complete'} />
      </div>

      {/* Step 1: Connect Dropbox */}
      {currentStep === 'connect' && (
        <Card>
          <CardHeader>
            <CardTitle>Steg 1: Anslut till Dropbox</CardTitle>
            <CardDescription>
              Anslut ditt Dropbox-konto för att komma åt dina PDF-fakturor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="font-semibold mb-2">Anslut ditt Dropbox-konto</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Dina fakturor finns i <code className="bg-gray-100 px-2 py-1 rounded">/Delade mappar/Babalisk AB/</code>
              </p>
              <Button onClick={handleConnectDropbox} disabled={loading} size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Anslut Dropbox
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scan and select invoices */}
      {currentStep === 'select' && isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Steg 2: Scanna fakturor</CardTitle>
            <CardDescription>
              Dropbox ansluten! Scanna alla dina fakturor från 2021-2025.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-muted-foreground mb-4">
                  Klicka nedan för att scanna alla fakturor från Dropbox
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Skannar: /Delade mappar/Babalisk AB/2021-2025/*/Kundfakturor/
                </p>
                <Button onClick={handleScanInvoices} disabled={scanning} size="lg">
                  {scanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Scanna fakturor
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                {summary && (
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Totalt hittade
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{summary.total}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Finns i databas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{summary.existing}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Saknas i databas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{summary.missing}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Fakturanummer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          #{summary.firstInvoice} - #{summary.lastInvoice}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Filter */}
                <div className="flex items-center gap-4">
                  <Button
                    variant={showOnlyMissing ? 'default' : 'outline'}
                    onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                  >
                    {showOnlyMissing ? 'Visa alla' : 'Visa bara saknade'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Visar {displayedInvoices.length} fakturor
                  </span>
                </div>

                {/* Invoice List */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Nr</TableHead>
                        <TableHead>Filnamn</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Storlek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedInvoices.map((invoice) => (
                        <TableRow key={invoice.path}>
                          <TableCell className="font-mono">#{invoice.invoiceNumber}</TableCell>
                          <TableCell className="font-medium">{invoice.name}</TableCell>
                          <TableCell>
                            {invoice.status === 'exists' ? (
                              <Badge variant="secondary">Finns i DB</Badge>
                            ) : (
                              <Badge variant="destructive">Saknas</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {(invoice.size / 1024).toFixed(1)} KB
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleScanInvoices} variant="outline" disabled={scanning}>
                    {scanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Scanna om
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('process')}
                    disabled={summary?.missing === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Importera saknade fakturor ({summary?.missing || 0})
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import missing invoices */}
      {currentStep === 'process' && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Steg 3: Importera fakturor</CardTitle>
            <CardDescription>
              Importera {summary?.missing || 0} saknade fakturor automatiskt med AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!importing && importResults.length === 0 && (
              <div className="text-center py-12">
                <Download className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Redo att importera</h3>
                <p className="text-muted-foreground mb-6">
                  {summary?.missing || 0} fakturor kommer att:
                </p>
                <ul className="text-left max-w-md mx-auto mb-6 space-y-2 text-sm text-muted-foreground">
                  <li>✓ Laddas ner från Dropbox</li>
                  <li>✓ Parsas med Claude AI för att extrahera data</li>
                  <li>✓ Matchas mot befintliga uppdragsgivare</li>
                  <li>✓ Sparas i databasen</li>
                </ul>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setCurrentStep('select')}>
                    Tillbaka
                  </Button>
                  <Button size="lg" onClick={handleStartImport}>
                    <Download className="mr-2 h-4 w-4" />
                    Starta import ({summary?.missing || 0} fakturor)
                  </Button>
                </div>
              </div>
            )}

            {importing && (
              <div className="text-center py-12">
                <Loader2 className="h-16 w-16 mx-auto text-blue-500 mb-4 animate-spin" />
                <h3 className="text-xl font-semibold mb-2">Importerar fakturor...</h3>
                <p className="text-muted-foreground mb-6">
                  Detta kan ta en stund. Claude AI läser och tolkar varje faktura.
                </p>
                <p className="text-sm text-muted-foreground">
                  Vänligen stäng inte fönstret.
                </p>
              </div>
            )}

            {!importing && importResults.length > 0 && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Import klar!</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Lyckades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {importResults.filter(r => r.success).length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Misslyckades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {importResults.filter(r => !r.success).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-3 justify-center pt-4">
                  <Button onClick={() => setCurrentStep('select')}>
                    Tillbaka till översikt
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StepIndicator({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {completed ? <CheckCircle2 className="h-5 w-5" /> : number}
      </div>
      <span className={`text-xs ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}
