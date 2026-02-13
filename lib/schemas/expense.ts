import { z } from 'zod'

export const updateExpenseSchema = z.object({
  date: z.string().optional(),
  supplier: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  amount_base: z.number().optional(),
  category: z.string().optional(),
  notes: z.string().nullable().optional(),
  gig_id: z.string().nullable().optional(),
})

export const checkDuplicateSchema = z.object({
  date: z.string().min(1),
  supplier: z.string().min(1),
  amount: z.number(),
})

export const batchCheckDuplicateSchema = z.object({
  expenses: z.array(z.object({
    date: z.string().min(1),
    supplier: z.string().min(1),
    amount: z.number(),
  })).min(1),
})

export type UpdateExpenseData = z.infer<typeof updateExpenseSchema>
export type CheckDuplicateData = z.infer<typeof checkDuplicateSchema>
