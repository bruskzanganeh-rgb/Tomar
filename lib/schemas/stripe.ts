import { z } from 'zod'

export const createCheckoutSchema = z.object({
  priceId: z.string().min(1),
})

export type CreateCheckoutData = z.infer<typeof createCheckoutSchema>
