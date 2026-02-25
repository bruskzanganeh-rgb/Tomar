import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1),
  client_code: z.string().optional(),
  org_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  reference_person: z.string().optional(),
  notes: z.string().optional(),
  invoice_language: z.string().optional(),
  country_code: z.string().optional(),
  vat_number: z.string().optional(),
})

export type CreateClientFormData = z.infer<typeof createClientSchema>
