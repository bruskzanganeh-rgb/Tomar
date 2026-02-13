import { z } from 'zod'

export const createGigSchema = z.object({
  client_id: z.string().optional(),
  gig_type_id: z.string().min(1),
  position_id: z.string().optional(),
  fee: z.number().min(0).optional(),
  travel_expense: z.number().min(0).optional(),
  currency: z.string().min(1),
  venue: z.string().optional(),
  project_name: z.string().optional(),
  notes: z.string().optional(),
  invoice_notes: z.string().optional(),
  status: z.enum(['tentative', 'pending', 'accepted', 'declined', 'completed', 'invoiced', 'paid', 'cancelled']),
  response_deadline: z.string().optional(),
  dates: z.array(z.string()).min(1),
})

export type CreateGigFormData = z.infer<typeof createGigSchema>
