import { z } from 'zod'

export const invoiceLineSchema = z.object({
  description: z.string().min(1, 'Beskrivning krävs'),
  quantity: z.number().min(0.01, 'Antal måste vara större än 0'),
  unit_price: z.number().min(0, 'Pris måste vara 0 eller mer'),
  vat_rate: z.number().min(0).max(100),
})

export const createInvoiceSchema = z.object({
  client_id: z.string().min(1, 'Välj kund'),
  vat_rate: z.number().min(0).max(100),
  payment_terms: z.number().min(1, 'Betalningsvillkor måste vara minst 1 dag'),
  lines: z.array(invoiceLineSchema).min(1, 'Lägg till minst en rad'),
})

export type InvoiceLine = z.infer<typeof invoiceLineSchema>
export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>
