import { z } from 'zod'

export const invoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
  vat_rate: z.number().min(0).max(100),
})

export const createInvoiceSchema = z.object({
  client_id: z.string().min(1),
  vat_rate: z.number().min(0).max(100),
  payment_terms: z.number().min(1),
  lines: z.array(invoiceLineSchema).min(1),
})

export type InvoiceLine = z.infer<typeof invoiceLineSchema>
export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>
