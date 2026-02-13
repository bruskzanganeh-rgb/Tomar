import { z } from 'zod'

export const incrementUsageSchema = z.object({
  type: z.enum(['invoice', 'receipt_scan']),
})

export type IncrementUsageData = z.infer<typeof incrementUsageSchema>
