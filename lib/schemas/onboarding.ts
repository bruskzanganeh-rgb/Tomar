import { z } from 'zod'

export const completeOnboardingSchema = z.object({
  company_info: z.object({
    company_name: z.string().optional(),
    org_number: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    bank_account: z.string().optional(),
    base_currency: z.string().optional(),
  }),
  instruments: z.array(z.string()).optional(),
})

export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>
