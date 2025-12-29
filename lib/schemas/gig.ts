import { z } from 'zod'

export const createGigSchema = z.object({
  client_id: z.string().optional(),
  gig_type_id: z.string().min(1, 'Välj typ av uppdrag'),
  position_id: z.string().optional(),
  time: z.string(),
  venue: z.string().optional(),
  fee: z.string().optional(),
  travel_expense: z.string().optional(),
  project_name: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['tentative', 'pending', 'accepted', 'declined']),
  response_deadline: z.string().optional(),
}).refine(
  (data) => {
    // Om status inte är tentative, kräv uppdragsgivare
    if (data.status !== 'tentative') {
      return data.client_id && data.client_id !== 'none' && data.client_id.length > 0
    }
    return true
  },
  {
    message: 'Välj en uppdragsgivare (krävs för alla statusar utom "Ej bekräftat")',
    path: ['client_id'],
  }
)

export type CreateGigFormData = z.infer<typeof createGigSchema>
