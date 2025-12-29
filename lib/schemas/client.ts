import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  client_code: z.string().optional(),
  org_number: z.string().optional(),
  email: z.string().email('Ogiltig e-postadress').optional().or(z.literal('')),
  address: z.string().optional(),
  payment_terms: z.string().min(1, 'Betalningsvillkor krävs'),
  notes: z.string().optional(),
})

export type CreateClientFormData = z.infer<typeof createClientSchema>
