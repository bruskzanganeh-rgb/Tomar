import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer'

// Types
type CompanySettings = {
  company_name: string
  org_number: string
  address: string
  email: string
  phone: string
  bank_account: string
  logo_url: string | null
}

type Client = {
  name: string
  org_number: string | null
  address: string | null
}

type InvoiceData = {
  invoice_number: number
  invoice_date: string
  due_date: string
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
}

type InvoiceLine = {
  description: string
  amount: number
  is_vat_exempt: boolean
}

type GeneratePdfParams = {
  invoice: InvoiceData
  client: Client
  company: CompanySettings
  lines?: InvoiceLine[]
}

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    maxWidth: 150,
    maxHeight: 60,
  },
  companyInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 9,
    color: '#666',
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '1px solid #eee',
  },
  clientSection: {
    flex: 1,
  },
  invoiceSection: {
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 9,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #333',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottom: '1px solid #eee',
  },
  descCol: {
    flex: 3,
  },
  amountCol: {
    flex: 1,
    textAlign: 'right',
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: 200,
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    color: '#666',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '2px solid #333',
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentInfo: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginTop: 20,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
    borderTop: '1px solid #eee',
    paddingTop: 10,
  },
})

// Format currency
function formatCurrency(amount: number): string {
  return amount.toLocaleString('sv-SE') + ' kr'
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE')
}

// PDF Document Component
function InvoicePDF({ invoice, client, company, lines }: GeneratePdfParams) {
  // If no lines provided, create a single line with the invoice subtotal
  const invoiceLines = lines && lines.length > 0
    ? lines
    : [{ description: 'Fakturerat belopp', amount: invoice.subtotal, is_vat_exempt: false }]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company.logo_url ? (
              <Image src={company.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{company.company_name}</Text>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.title}>FAKTURA</Text>
            {company.logo_url && (
              <Text style={styles.companyName}>{company.company_name}</Text>
            )}
            <Text style={styles.smallText}>Org.nr: {company.org_number}</Text>
            <Text style={styles.smallText}>{company.address}</Text>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.invoiceDetails}>
          <View style={styles.clientSection}>
            <Text style={styles.sectionTitle}>Faktureras till</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.org_number && (
              <Text style={styles.smallText}>Org.nr: {client.org_number}</Text>
            )}
            {client.address && (
              <Text>{client.address}</Text>
            )}
          </View>
          <View style={styles.invoiceSection}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Fakturanummer</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{invoice.invoice_number}</Text>
            </View>
            <View style={{ marginBottom: 5 }}>
              <Text style={styles.sectionTitle}>Fakturadatum</Text>
              <Text>{formatDate(invoice.invoice_date)}</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>Förfallodatum</Text>
              <Text>{formatDate(invoice.due_date)}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.descCol]}>Beskrivning</Text>
            <Text style={[styles.headerText, styles.amountCol]}>Belopp</Text>
          </View>
          {invoiceLines.map((line, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.descCol}>
                {line.description}
                {line.is_vat_exempt && ' (momsfri)'}
              </Text>
              <Text style={styles.amountCol}>{formatCurrency(line.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Summa</Text>
            <Text>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Moms ({invoice.vat_rate}%)</Text>
            <Text>{formatCurrency(invoice.vat_amount)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>ATT BETALA</Text>
            <Text style={styles.grandTotalAmount}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Betalningsinformation</Text>
          <Text>Bankgiro: {company.bank_account}</Text>
          <Text style={{ marginTop: 5 }}>
            Vänligen ange fakturanummer {invoice.invoice_number} vid betalning.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {company.email} | {company.phone}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Export function to generate PDF buffer
export async function generateInvoicePdf(params: GeneratePdfParams): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoicePDF {...params} />)
  return Buffer.from(buffer)
}
