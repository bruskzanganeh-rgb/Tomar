import { z } from 'zod'

export const createContractSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  tier: z.string().min(1),
  annual_price: z.number().positive(),
  currency: z.string().default('SEK'),
  billing_interval: z.enum(['monthly', 'quarterly', 'annual']).default('annual'),
  vat_rate_pct: z.number().min(0).max(100).default(25),
  contract_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contract_duration_months: z.number().int().positive().default(12),
  custom_terms: z.record(z.string(), z.unknown()).optional().default({}),
  signer_name: z.string().min(1),
  signer_email: z.string().email(),
  signer_title: z.string().optional().nullable(),
})

export const updateContractSchema = createContractSchema.partial()

export const signContractSchema = z.object({
  signer_name: z.string().min(1),
  signer_title: z.string().optional(),
  signature_image: z.string().min(100), // base64 PNG, must have some content
})

export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
export type SignContractInput = z.infer<typeof signContractSchema>
