import { z } from 'zod'

export const completeOnboardingSchema = z.object({
  company_info: z.object({
    company_name: z.string().optional(),
    org_number: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    bank_account: z.string().optional(),
    bankgiro: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    base_currency: z.string().optional(),
    country_code: z.string().optional(),
  }),
  instruments_text: z.string().optional(),
  gig_types: z.array(z.object({
    name: z.string(),
    name_en: z.string().optional(),
    vat_rate: z.number().optional(),
    color: z.string().optional(),
  })).optional(),
  positions: z.array(z.object({
    name: z.string(),
    sort_order: z.number(),
  })).optional(),
})

export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>
